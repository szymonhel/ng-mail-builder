import { Router, Request, Response } from 'express';
import { getSettingsTable } from '../lib/azureTables';
import { chunkJson, unchunkJson } from '../lib/tableJson';

const router = Router();

const ROW_KEY = 'settings';

// One settings entity per user: PartitionKey is the Auth0 user id, RowKey is
// fixed. The settings object itself is opaque JSON owned by the frontend
// (saved colors, global data, OpenAI key, ...).
function partitionKey(req: Request): string {
  const sub = req.auth?.payload.sub;
  if (!sub) throw new Error('Token has no sub claim.');
  return sub;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const table = await getSettingsTable();
    const entity = await table.getEntity(partitionKey(req), ROW_KEY);
    res.json({ settings: unchunkJson(entity as Record<string, unknown>) });
  } catch (err: any) {
    if (err?.statusCode === 404) {
      res.json({ settings: null });
      return;
    }
    console.error('Settings get error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to load settings.' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  const { settings } = req.body ?? {};
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ error: '"settings" object is required.' });
    return;
  }
  try {
    const table = await getSettingsTable();
    const entity = {
      partitionKey: partitionKey(req),
      rowKey: ROW_KEY,
      updatedAt: new Date().toISOString(),
      ...chunkJson(settings),
    };
    // Replace (not merge) so stale chunks from a previously larger payload are dropped.
    await table.upsertEntity(entity as any, 'Replace');
    res.json({ success: true });
  } catch (err: any) {
    if (err?.status === 413) {
      res.status(413).json({ error: err.message });
      return;
    }
    console.error('Settings save error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to save settings.' });
  }
});

export default router;
