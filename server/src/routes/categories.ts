import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getCategoriesTable } from '../lib/azureTables';
import { chunkJson, unchunkJson } from '../lib/tableJson';

const router = Router();

// The Auth0 user id partitions the table, same as templates.
function partitionKey(req: Request): string {
  const sub = req.auth?.payload.sub;
  if (!sub) throw new Error('Token has no sub claim.');
  return sub;
}

// The category's shared defaults (settings + savedColors) travel as one chunked
// JSON payload; name/dates are plain columns so listing doesn't need the payload.
function toEntity(pk: string, id: string, name: string, payload: unknown, createdAt: string) {
  return {
    partitionKey: pk,
    rowKey: id,
    name,
    createdAt,
    updatedAt: new Date().toISOString(),
    ...chunkJson(payload),
  } as Record<string, unknown>;
}

function fromEntity(entity: Record<string, unknown>) {
  const payload = (unchunkJson(entity) ?? {}) as Record<string, unknown>;
  return {
    id: entity.rowKey as string,
    name: (entity.name as string) ?? 'Untitled',
    createdAt: entity.createdAt as string | undefined,
    updatedAt: entity.updatedAt as string | undefined,
    settings: payload.settings ?? null,
    savedColors: Array.isArray(payload.savedColors) ? payload.savedColors : [],
    // null = the category defers to the account-level button defaults.
    buttonDefaults: payload.buttonDefaults ?? null,
    globalData: Array.isArray(payload.globalData) ? payload.globalData : [],
    // null/empty = fall back to the account's base sender configuration.
    fromName: (payload.fromName as string) || null,
    fromEmail: (payload.fromEmail as string) || null,
  };
}

function payloadFromBody(body: any) {
  return {
    settings: body?.settings ?? null,
    savedColors: body?.savedColors ?? [],
    buttonDefaults: body?.buttonDefaults ?? null,
    globalData: Array.isArray(body?.globalData) ? body.globalData : [],
    fromName: typeof body?.fromName === 'string' ? body.fromName.trim() || null : null,
    fromEmail: typeof body?.fromEmail === 'string' ? body.fromEmail.trim() || null : null,
  };
}

// Categories are few and small, so the list returns them in full (settings included) —
// the dashboard and editor both need the defaults, not just names.
router.get('/', async (req: Request, res: Response) => {
  try {
    const table = await getCategoriesTable();
    const pk = partitionKey(req);
    const categories = [];
    const iter = table.listEntities({
      queryOptions: { filter: `PartitionKey eq '${pk.replace(/'/g, "''")}'` },
    });
    for await (const entity of iter) categories.push(fromEntity(entity as Record<string, unknown>));
    categories.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    res.json({ categories });
  } catch (err: any) {
    console.error('Category list error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to list categories.' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const table = await getCategoriesTable();
    const entity = await table.getEntity(partitionKey(req), req.params.id as string);
    res.json(fromEntity(entity as Record<string, unknown>));
  } catch (err: any) {
    if (err?.statusCode === 404) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    console.error('Category get error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to load category.' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body ?? {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: '"name" is required.' });
    return;
  }
  try {
    const table = await getCategoriesTable();
    const id = randomUUID();
    const entity = toEntity(partitionKey(req), id, name.trim(), payloadFromBody(req.body), new Date().toISOString());
    await table.createEntity(entity as any);
    res.status(201).json(fromEntity(entity));
  } catch (err: any) {
    console.error('Category create error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to create category.' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { name } = req.body ?? {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: '"name" is required.' });
    return;
  }
  try {
    const table = await getCategoriesTable();
    const pk = partitionKey(req);
    const id = req.params.id as string;

    let createdAt = new Date().toISOString();
    try {
      const existing = await table.getEntity(pk, id);
      createdAt = (existing.createdAt as string) ?? createdAt;
    } catch (err: any) {
      if (err?.statusCode !== 404) throw err;
    }

    const entity = toEntity(pk, id, name.trim(), payloadFromBody(req.body), createdAt);
    // Replace (not merge) so stale payload chunks from a previously larger payload are dropped.
    await table.upsertEntity(entity as any, 'Replace');
    res.json(fromEntity(entity));
  } catch (err: any) {
    console.error('Category update error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to save category.' });
  }
});

// Deleting a category leaves its emails in place — they show up as uncategorized on
// the dashboard (their stored categoryId simply no longer resolves) and, since the
// category defaults are gone, render with their own last-saved settings.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const table = await getCategoriesTable();
    await table.deleteEntity(partitionKey(req), req.params.id as string);
    res.json({ success: true });
  } catch (err: any) {
    if (err?.statusCode === 404) {
      res.json({ success: true });
      return;
    }
    console.error('Category delete error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to delete category.' });
  }
});

export default router;
