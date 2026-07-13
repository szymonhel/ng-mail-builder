import { Router, Request, Response } from 'express';
import { listSendHistory } from '../lib/sendHistory';

const router = Router();

// Newest-first send history for the signed-in user (app-only — API keys can't read it).
// ?template=<id> narrows to one saved email; ?limit=<n> caps the page (default 50, max 200).
router.get('/', async (req: Request, res: Response) => {
  try {
    const sub = req.auth?.payload.sub;
    if (!sub) throw new Error('Token has no sub claim.');
    const templateId = typeof req.query.template === 'string' && req.query.template ? req.query.template : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) || undefined : undefined;
    res.json({ entries: await listSendHistory(sub, { templateId, limit }) });
  } catch (err: any) {
    console.error('Send history list error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to load send history.' });
  }
});

export default router;
