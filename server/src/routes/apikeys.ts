import { Router, Request, Response } from 'express';
import { createApiKey, deleteApiKey, listApiKeys } from '../lib/apiKeys';

const router = Router();

function ownerSub(req: Request): string {
  const sub = req.auth?.payload.sub;
  if (!sub) throw new Error('Token has no sub claim.');
  return sub;
}

// Optionally filtered to one category (?category=<id>) for the category settings page.
router.get('/', async (req: Request, res: Response) => {
  try {
    const category = typeof req.query.category === 'string' && req.query.category ? req.query.category : undefined;
    res.json({ keys: await listApiKeys(ownerSub(req), category) });
  } catch (err: any) {
    console.error('API key list error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to list API keys.' });
  }
});

// The response is the only time the plaintext key ever leaves the server —
// afterwards only its hash exists. Keys are always scoped to a category container.
router.post('/', async (req: Request, res: Response) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const categoryId = typeof req.body?.categoryId === 'string' ? req.body.categoryId.trim() : '';
  if (!name) {
    res.status(400).json({ error: '"name" is required (e.g. the service that will use this key).' });
    return;
  }
  if (!categoryId) {
    res.status(400).json({ error: '"categoryId" is required — API keys are scoped to a category container.' });
    return;
  }
  try {
    const { key, meta } = await createApiKey(ownerSub(req), name, categoryId);
    res.status(201).json({ key, ...meta });
  } catch (err: any) {
    console.error('API key create error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to create API key.' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteApiKey(ownerSub(req), req.params.id as string);
    if (!deleted) {
      res.status(404).json({ error: 'API key not found.' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('API key delete error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to revoke API key.' });
  }
});

export default router;
