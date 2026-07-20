import { Router, Request, Response } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { EMAIL_DOC_CHAT_SYSTEM_PROMPT, EMAIL_DOC_CHAT_JSON_SCHEMA } from '../lib/emailDocSchema';
import { generateEmailDoc } from '../lib/openaiEmailDoc';

const router = Router();

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!SUPPORTED_IMAGE_TYPES.has(file.mimetype) && file.mimetype !== 'application/pdf') {
      cb(new Error('Unsupported file type. Use JPEG, PNG, GIF, WEBP, or PDF.'));
      return;
    }
    cb(null, true);
  },
});

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

function isValidTurn(t: any): t is ChatTurn {
  return t && typeof t === 'object' && (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string';
}

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  const openaiKey = req.headers['x-openai-key'];
  if (!openaiKey || typeof openaiKey !== 'string') {
    res.status(400).json({ error: 'Missing x-openai-key header.' });
    return;
  }

  let turns: unknown;
  try {
    turns = JSON.parse(req.body?.messages ?? '');
  } catch {
    res.status(400).json({ error: 'Missing or invalid "messages" (expected a JSON array).' });
    return;
  }
  if (!Array.isArray(turns) || turns.length === 0 || !turns.every(isValidTurn)) {
    res.status(400).json({ error: 'Missing or invalid "messages" (expected a non-empty array of { role, text }).' });
    return;
  }

  let currentDoc: unknown = undefined;
  if (typeof req.body?.currentDoc === 'string' && req.body.currentDoc.trim()) {
    try {
      currentDoc = JSON.parse(req.body.currentDoc);
    } catch {
      res.status(400).json({ error: 'Invalid "currentDoc" (expected JSON).' });
      return;
    }
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: EMAIL_DOC_CHAT_SYSTEM_PROMPT },
  ];
  if (currentDoc !== undefined) {
    messages.push({ role: 'user', content: `Current template JSON:\n${JSON.stringify(currentDoc)}` });
  }

  const lastUserIndex = turns.map(t => t.role).lastIndexOf('user');
  turns.forEach((turn: ChatTurn, i: number) => {
    if (turn.role === 'assistant') {
      messages.push({ role: 'assistant', content: turn.text });
      return;
    }
    if (i === lastUserIndex && req.file) {
      const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: 'text', text: turn.text }];
      if (SUPPORTED_IMAGE_TYPES.has(req.file.mimetype)) {
        const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        content.push({ type: 'image_url', image_url: { url: dataUrl } });
      } else {
        const dataUrl = `data:application/pdf;base64,${req.file.buffer.toString('base64')}`;
        content.push({ type: 'file', file: { filename: req.file.originalname || 'document.pdf', file_data: dataUrl } });
      }
      messages.push({ role: 'user', content });
      return;
    }
    messages.push({ role: 'user', content: turn.text });
  });

  try {
    const result = await generateEmailDoc(openaiKey, messages, EMAIL_DOC_CHAT_JSON_SCHEMA, 'emit_chat_response') as {
      reply?: unknown;
      doc?: unknown;
    };
    if (typeof result?.reply !== 'string' || !result.doc) {
      throw new Error('OpenAI did not return a structured chat response.');
    }
    res.json({ reply: result.reply, doc: result.doc });
  } catch (err: any) {
    const status = typeof err?.status === 'number' ? err.status : 502;
    const detail = err?.error?.message ?? err?.message ?? 'Failed to generate template.';
    console.error('OpenAI chat import error:', detail);
    res.status(status).json({ error: detail });
  }
});

// Multer errors (bad mimetype, file too large) land here rather than the route handler above.
router.use((err: any, _req: Request, res: Response, next: (err?: any) => void) => {
  if (err instanceof multer.MulterError || err?.message?.includes('Unsupported file type')) {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
});

export default router;
