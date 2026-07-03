import { Router, Request, Response } from 'express';
import { translateFields, TranslateField } from '../lib/openaiTranslate';

const router = Router();

const MAX_FIELDS = 300;

function isValidField(f: any): f is TranslateField {
  return f && typeof f === 'object' && typeof f.key === 'string' && typeof f.text === 'string';
}

router.post('/', async (req: Request, res: Response) => {
  const openaiKey = req.headers['x-openai-key'];
  if (!openaiKey || typeof openaiKey !== 'string') {
    res.status(400).json({ error: 'Missing x-openai-key header.' });
    return;
  }

  const locale = req.body?.locale;
  if (!locale || typeof locale.label !== 'string' || !locale.label.trim() || typeof locale.code !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "locale" (expected { code, label }).' });
    return;
  }

  const fields = req.body?.fields;
  if (!Array.isArray(fields) || fields.length === 0 || !fields.every(isValidField)) {
    res.status(400).json({ error: 'Missing or invalid "fields" (expected a non-empty array of { key, text }).' });
    return;
  }
  if (fields.length > MAX_FIELDS) {
    res.status(400).json({ error: `Too many fields to translate at once (max ${MAX_FIELDS}).` });
    return;
  }

  try {
    const translations = await translateFields(openaiKey, locale, fields);
    // Defensive: only hand back translations for keys we actually asked about, as strings.
    const requestedKeys = new Set(fields.map(f => f.key));
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(translations)) {
      if (requestedKeys.has(key) && typeof value === 'string') filtered[key] = value;
    }
    res.json({ translations: filtered });
  } catch (err: any) {
    const status = typeof err?.status === 'number' ? err.status : 502;
    const detail = err?.error?.message ?? err?.message ?? 'Failed to auto-translate.';
    console.error('OpenAI translate error:', detail);
    res.status(status).json({ error: detail });
  }
});

export default router;
