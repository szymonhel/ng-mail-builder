import { Router, Request, Response } from 'express';
import multer from 'multer';
import { EMAIL_DOC_MOCKUP_SYSTEM_PROMPT, EMAIL_DOC_BRIEF_SYSTEM_PROMPT } from '../lib/emailDocSchema';
import { generateEmailDoc } from '../lib/openaiEmailDoc';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are supported.'));
      return;
    }
    cb(null, true);
  },
});

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  const openaiKey = req.headers['x-openai-key'];
  if (!openaiKey || typeof openaiKey !== 'string') {
    res.status(400).json({ error: 'Missing x-openai-key header.' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'Missing "file" PDF upload.' });
    return;
  }

  // "mockup" = the PDF is a visual design to reconstruct as closely as possible;
  // "brief" = the PDF is written instructions/content to design an email from.
  const mode = req.body?.mode === 'brief' ? 'brief' : 'mockup';
  const systemPrompt = mode === 'brief' ? EMAIL_DOC_BRIEF_SYSTEM_PROMPT : EMAIL_DOC_MOCKUP_SYSTEM_PROMPT;
  const instruction = mode === 'brief'
    ? 'Design an email template based on the attached brief.'
    : 'Reconstruct this email template from the attached design document.';
  const fileDataUrl = `data:application/pdf;base64,${req.file.buffer.toString('base64')}`;

  try {
    const doc = await generateEmailDoc(openaiKey, [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'file', file: { filename: req.file.originalname || 'document.pdf', file_data: fileDataUrl } },
          { type: 'text', text: instruction },
        ],
      },
    ]);
    res.json({ doc });
  } catch (err: any) {
    const status = typeof err?.status === 'number' ? err.status : 502;
    const detail = err?.error?.message ?? err?.message ?? 'Failed to generate template from PDF.';
    console.error('OpenAI PDF import error:', detail);
    res.status(status).json({ error: detail });
  }
});

// Multer errors (bad mimetype, file too large) land here rather than the route handler above.
router.use((err: any, _req: Request, res: Response, next: (err?: any) => void) => {
  if (err instanceof multer.MulterError || err?.message?.includes('Only PDF files')) {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
});

export default router;
