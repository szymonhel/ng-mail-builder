import { Router, Request, Response } from 'express';
import { getMailjetClient } from '../lib/mailjet';
import mjml2html from 'mjml';
import { getTemplatesTable, getCategoriesTable, getSettingsTable } from '../lib/azureTables';
import { unchunkJson } from '../lib/tableJson';
import { applyVariables, defaultVariableValues, docToMjml, resolveDocForLocale, CollectionItems, EmailDoc } from '../lib/emailRender';
import { isApiKeyAuth, apiKeyAllowsCategory } from '../middleware/apiKeyAuth';
import { recordSend, RecordSendInput } from '../lib/sendHistory';

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

// name -> value map from a globalData list ({ id, name, value }[]), skipping blank names.
function globalDataValues(items: unknown): Record<string, string> {
  if (!Array.isArray(items)) return {};
  const out: Record<string, string> = {};
  for (const item of items as any[]) {
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    if (name) out[name] = typeof item?.value === 'string' ? item.value : '';
  }
  return out;
}

// Account-level global data (companyName, supportEmail, ...) participates in template
// sends the same way it does in the in-app preview/send. Missing settings just mean
// no globals — never a failed send.
async function loadAccountGlobalValues(sub: string): Promise<Record<string, string>> {
  try {
    const table = await getSettingsTable();
    const entity = await table.getEntity(sub, 'settings');
    const settings = unchunkJson(entity as Record<string, unknown>) as { globalData?: unknown } | null;
    return globalDataValues(settings?.globalData);
  } catch (err: any) {
    if (err?.statusCode !== 404) console.error('Account settings load error:', err?.message ?? err);
    return {};
  }
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

// Everything recordSend needs beyond the outcome itself; assembled by each route.
type SendContext = { ownerSub: string } & Omit<RecordSendInput, 'status' | 'error'>;

async function compileAndSend(res: Response, mjml: string, history: SendContext): Promise<void> {
  const { ownerSub, ...context } = history;
  const { to, toName, subject } = context;
  const { html, errors } = await mjml2html(mjml, { validationLevel: 'soft' });

  if (errors.length) {
    const messages = errors.map((e: any) => e.formattedMessage).join('; ');
    recordSend(ownerSub, { ...context, status: 'failed', error: `MJML compilation failed: ${messages}` });
    res.status(400).json({ error: `MJML compilation failed: ${messages}` });
    return;
  }

  const client = getMailjetClient();

  try {
    const result = await client.post('send', { version: 'v3.1' }).request({
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

    // Message ids from the send response enable delivery-status lookups later
    // (GET /history/:id/status).
    const recipient = (result.body as any)?.Messages?.[0]?.To?.[0];
    recordSend(ownerSub, {
      ...context,
      status: 'sent',
      mailjetMessageId: recipient?.MessageID != null ? String(recipient.MessageID) : undefined,
      mailjetMessageUuid: recipient?.MessageUUID || undefined,
    });
    res.json({ success: true });
  } catch (err: unknown) {
    const mjErr = err as any;
    const statusCode = mjErr?.statusCode ?? 502;
    const detail = mjErr?.response?.body ?? mjErr?.message ?? 'Failed to send email';
    console.error('Mailjet error:', JSON.stringify(detail, null, 2));
    recordSend(ownerSub, { ...context, status: 'failed', error: `Mailjet ${statusCode}: ${JSON.stringify(detail)}` });
    res.status(502).json({ error: `Mailjet ${statusCode}: ${JSON.stringify(detail)}` });
  }
}

router.post('/', async (req: Request, res: Response) => {
  // Raw-MJML sends stay app-only: an API key is scoped to sending saved templates,
  // not arbitrary content through the account's Mailjet.
  if (isApiKeyAuth(req)) {
    res.status(403).json({ error: 'API keys may only use POST /send/template.' });
    return;
  }

  const { to, toName, subject, mjml } = req.body as SendBody;

  if (!to || !subject || !mjml) {
    res.status(400).json({ error: 'Missing required fields: to, subject, mjml' });
    return;
  }

  if (!isValidEmail(to)) {
    res.status(400).json({ error: 'Invalid recipient email address' });
    return;
  }

  await compileAndSend(res, mjml, {
    ownerSub: req.auth!.payload.sub!,
    to, toName, subject,
    source: 'app',
  });
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
  let templateName = '';
  try {
    const table = await getTemplatesTable();
    const sub = req.auth?.payload.sub;
    if (!sub) throw new Error('Token has no sub claim.');
    const entity = await table.getEntity(sub, templateId);
    doc = unchunkJson(entity as Record<string, unknown>) as EmailDoc;
    categoryId = (entity.categoryId as string) || null;
    templateName = (entity.name as string) ?? '';
  } catch (err: any) {
    if (err?.statusCode === 404) {
      res.status(404).json({ error: 'Saved email not found.' });
      return;
    }
    console.error('Template load error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to load saved email.' });
    return;
  }

  // API keys are scoped to one category container — they can't send emails that
  // live outside it.
  if (!apiKeyAllowsCategory(req, categoryId)) {
    res.status(403).json({ error: 'This API key is scoped to a different category.' });
    return;
  }

  // The email's category contributes at render time: its default settings when the
  // doc inherits them, and its global data always. A missing/deleted category falls
  // back to the doc's own last-saved settings rather than failing the send.
  let categoryGlobalValues: Record<string, string> = {};
  if (categoryId) {
    try {
      const categories = await getCategoriesTable();
      const catEntity = await categories.getEntity(req.auth!.payload.sub!, categoryId);
      const payload = unchunkJson(catEntity as Record<string, unknown>) as { settings?: EmailDoc['settings'] | null; globalData?: unknown } | null;
      if (doc.inheritSettings && payload?.settings) doc = { ...doc, settings: payload.settings };
      categoryGlobalValues = globalDataValues(payload?.globalData);
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

  // Precedence (lowest to highest): account global data < category global data <
  // email variable defaults < values provided in this request — matching the
  // in-app preview/send layering.
  const accountGlobalValues = await loadAccountGlobalValues(req.auth!.payload.sub!);
  const values = { ...accountGlobalValues, ...categoryGlobalValues, ...defaultVariableValues(doc.variables), ...variables };
  const localizedDoc = resolveDocForLocale(doc, localeId);
  const mjml = applyVariables(docToMjml(localizedDoc, values, collections), values);

  await compileAndSend(res, mjml, {
    ownerSub: req.auth!.payload.sub!,
    to, toName,
    subject: applyVariables(subject, values),
    source: isApiKeyAuth(req) ? 'api' : 'app',
    apiKeyName: req.apiKeyName || undefined,
    templateId,
    templateName,
    categoryId: categoryId ?? undefined,
    language: language || undefined,
    // The caller-provided values only (not the layered defaults) — that's what's
    // useful when debugging what an integration actually sent.
    variables,
    collections,
  });
});

export default router;
