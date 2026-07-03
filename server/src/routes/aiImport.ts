import { Router, Request, Response } from 'express';
import multer from 'multer';
import { EMAIL_DOC_MOCKUP_SYSTEM_PROMPT } from '../lib/emailDocSchema';
import { generateEmailDoc } from '../lib/openaiEmailDoc';

const router = Router();

const SUPPORTED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!SUPPORTED_MEDIA_TYPES.has(file.mimetype)) {
      cb(new Error('Unsupported image type. Use JPEG, PNG, GIF, or WEBP.'));
      return;
    }
    cb(null, true);
  },
});

router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  const openaiKey = req.headers['x-openai-key'];
  if (!openaiKey || typeof openaiKey !== 'string') {
    res.status(400).json({ error: 'Missing x-openai-key header.' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'Missing "image" file upload.' });
    return;
  }

  const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  try {
    const doc = await generateEmailDoc(openaiKey, EMAIL_DOC_MOCKUP_SYSTEM_PROMPT, [
      { type: 'text', text: 'Reconstruct this email template from the photo.' },
      { type: 'image_url', image_url: { url: dataUrl } },
    ]);
    res.json({ doc });
  } catch (err: any) {
    const status = typeof err?.status === 'number' ? err.status : 502;
    const detail = err?.error?.message ?? err?.message ?? 'Failed to generate template from image.';
    console.error('OpenAI import error:', detail);
    res.status(status).json({ error: detail });
  }
});

// Multer errors (bad mimetype, file too large) land here rather than the route handler above.
router.use((err: any, _req: Request, res: Response, next: (err?: any) => void) => {
  if (err instanceof multer.MulterError || err?.message?.includes('Unsupported image type')) {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
});

export default router;
