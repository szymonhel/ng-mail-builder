import { Router, Request, Response } from 'express';
import Mailjet from 'node-mailjet';
import mjml2html from 'mjml';
import { getTemplatesTable, getCategoriesTable } from '../lib/azureTables';
import { unchunkJson } from '../lib/tableJson';
import { applyVariables, defaultVariableValues, docToMjml, resolveDocForLocale, CollectionItems, EmailDoc } from '../lib/emailRender';

const router = Router();

interface SendBody {
  to: string;
  toName?: string;
  subject: string;
  mjml: string;
}

// Template-based send for external consumers: renders a saved email server-side
// from its stored JSON doc. GET /templates/:id/contract describes what a given
// template accepts for language/variables/collections.
interface SendTemplateBody {
  templateId: string;
  to: string;
  toName?: string;
  subject: string;
  // Locale code as listed in the contract's `languages` (e.g. "es"); omit for the default language.
  language?: string;
  variables?: Record<string, string>;
  // collectionName -> items, e.g. { items: [{ name: "Suite", price: "$450" }] }
  collections?: Record<string, Record<string, string>[]>;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Returns null when the payload isn't a map of primitive values.
function sanitizeStringMap(input: unknown): Record<string, string> | null {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object' || Array.isArray(input)) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (value === null || value === undefined) { out[key] = ''; continue; }
    if (typeof value === 'object') return null;
    out[key] = String(value);
  }
  return out;
}

function sanitizeCollections(input: unknown): CollectionItems | null {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object' || Array.isArray(input)) return null;
  const out: CollectionItems = {};
  for (const [name, items] of Object.entries(input as Record<string, unknown>)) {
    if (!Array.isArray(items)) return null;
    const sanitized: Record<string, string>[] = [];
    for (const item of items) {
      const map = sanitizeStringMap(item);
      if (map === null || item === null || typeof item !== 'object') return null;
      sanitized.push(map);
    }
    out[name] = sanitized;
  }
  return out;
}

async function compileAndSend(res: Response, mjml: string, to: string, toName: string | undefined, subject: string): Promise<void> {
  const { html, errors } = await mjml2html(mjml, { validationLevel: 'soft' });

  if (errors.length) {
    const messages = errors.map((e: any) => e.formattedMessage).join('; ');
    res.status(400).json({ error: `MJML compilation failed: ${messages}` });
    return;
  }

  const client = new Mailjet({
    apiKey: process.env.MAILJET_API_KEY!,
    apiSecret: process.env.MAILJET_API_SECRET!,
  });

  try {
    await client.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: process.env.FROM_EMAIL!,
            Name: process.env.FROM_NAME ?? 'Mail Builder',
          },
          To: [{ Email: to, Name: toName ?? to }],
          Subject: subject,
          HTMLPart: html,
        },
      ],
    });

    res.json({ success: true });
  } catch (err: unknown) {
    const mjErr = err as any;
    const statusCode = mjErr?.statusCode ?? 502;
    const detail = mjErr?.response?.body ?? mjErr?.message ?? 'Failed to send email';
    console.error('Mailjet error:', JSON.stringify(detail, null, 2));
    res.status(502).json({ error: `Mailjet ${statusCode}: ${JSON.stringify(detail)}` });
  }
}

router.post('/', async (req: Request, res: Response) => {
  const { to, toName, subject, mjml } = req.body as SendBody;

  if (!to || !subject || !mjml) {
    res.status(400).json({ error: 'Missing required fields: to, subject, mjml' });
    return;
  }

  if (!isValidEmail(to)) {
    res.status(400).json({ error: 'Invalid recipient email address' });
    return;
  }

  await compileAndSend(res, mjml, to, toName, subject);
});

router.post('/template', async (req: Request, res: Response) => {
  const { templateId, to, toName, subject, language } = (req.body ?? {}) as SendTemplateBody;

  if (!templateId || typeof templateId !== 'string' || !to || !subject) {
    res.status(400).json({ error: 'Missing required fields: templateId, to, subject' });
    return;
  }
  if (!isValidEmail(to)) {
    res.status(400).json({ error: 'Invalid recipient email address' });
    return;
  }

  const variables = sanitizeStringMap(req.body?.variables);
  if (variables === null) {
    res.status(400).json({ error: '"variables" must be an object mapping variable names to string values.' });
    return;
  }
  const collections = sanitizeCollections(req.body?.collections);
  if (collections === null) {
    res.status(400).json({ error: '"collections" must map collection names to arrays of { field: value } items.' });
    return;
  }

  let doc: EmailDoc;
  let categoryId: string | null = null;
  try {
    const table = await getTemplatesTable();
    const sub = req.auth?.payload.sub;
    if (!sub) throw new Error('Token has no sub claim.');
    const entity = await table.getEntity(sub, templateId);
    doc = unchunkJson(entity as Record<string, unknown>) as EmailDoc;
    categoryId = (entity.categoryId as string) || null;
  } catch (err: any) {
    if (err?.statusCode === 404) {
      res.status(404).json({ error: 'Saved email not found.' });
      return;
    }
    console.error('Template load error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to load saved email.' });
    return;
  }

  // Emails that inherit their global settings render with the category's current
  // defaults, matching what the editor's preview shows. A missing/deleted category
  // falls back to the doc's own last-saved settings rather than failing the send.
  if (doc.inheritSettings && categoryId) {
    try {
      const categories = await getCategoriesTable();
      const catEntity = await categories.getEntity(req.auth!.payload.sub!, categoryId);
      const payload = unchunkJson(catEntity as Record<string, unknown>) as { settings?: EmailDoc['settings'] | null } | null;
      if (payload?.settings) doc = { ...doc, settings: payload.settings };
    } catch (err: any) {
      if (err?.statusCode !== 404) console.error('Category settings load error:', err?.message ?? err);
    }
  }

  let localeId: string | null = null;
  if (language) {
    const locale = (doc.locales ?? []).find(l => l.code.toLowerCase() === language.toLowerCase());
    if (!locale) {
      const available = (doc.locales ?? []).map(l => l.code).join(', ') || '(none)';
      res.status(400).json({ error: `Unknown language "${language}". Available: ${available}. Omit "language" for the default.` });
      return;
    }
    localeId = locale.id;
  }

  // Provided variables override the doc's defaults; unprovided ones fall back to
  // their defaultValue (same behavior as the in-app Send dialog's pre-filled form).
  const values = { ...defaultVariableValues(doc.variables), ...variables };
  const localizedDoc = resolveDocForLocale(doc, localeId);
  const mjml = applyVariables(docToMjml(localizedDoc, values, collections), values);

  await compileAndSend(res, mjml, to, toName, applyVariables(subject, values));
});

export default router;
