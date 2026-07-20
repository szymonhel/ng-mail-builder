import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getBlockPresetsTable } from '../lib/azureTables';
import { chunkJson, unchunkJson } from '../lib/tableJson';

const router = Router();

// The Auth0 user id partitions the table, same as templates/categories.
function partitionKey(req: Request): string {
  const sub = req.auth?.payload.sub;
  if (!sub) throw new Error('Token has no sub claim.');
  return sub;
}

function toEntity(pk: string, id: string, name: string, kind: string, payload: unknown, createdAt: string, categoryId: string | null) {
  return {
    partitionKey: pk,
    rowKey: id,
    name,
    kind,
    // Azure Tables can't store null — empty string means "personal / all emails".
    categoryId: categoryId ?? '',
    createdAt,
    updatedAt: new Date().toISOString(),
    ...chunkJson(payload),
  } as Record<string, unknown>;
}

// Presets are small (a single row or block), so the list response carries the full
// payload — unlike templates (whole email docs), there's no need for a separate fetch.
function fromEntity(entity: Record<string, unknown>) {
  return {
    id: entity.rowKey as string,
    name: (entity.name as string) ?? 'Untitled',
    kind: (entity.kind as string) === 'block' ? 'block' : 'row',
    categoryId: (entity.categoryId as string) || null,
    payload: unchunkJson(entity),
    createdAt: entity.createdAt as string | undefined,
    updatedAt: entity.updatedAt as string | undefined,
  };
}

function parseCategoryId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// ?categoryId=<id> returns personal presets plus that category's; omitted returns
// personal presets only (e.g. an uncategorized email shouldn't see other categories').
router.get('/', async (req: Request, res: Response) => {
  try {
    const table = await getBlockPresetsTable();
    const pk = partitionKey(req);
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : null;
    const escapedPk = pk.replace(/'/g, "''");
    let filter = `PartitionKey eq '${escapedPk}' and categoryId eq ''`;
    if (categoryId) {
      const escapedCat = categoryId.replace(/'/g, "''");
      filter = `PartitionKey eq '${escapedPk}' and (categoryId eq '' or categoryId eq '${escapedCat}')`;
    }
    const presets = [];
    const iter = table.listEntities({ queryOptions: { filter } });
    for await (const entity of iter) presets.push(fromEntity(entity as Record<string, unknown>));
    presets.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    res.json({ presets });
  } catch (err: any) {
    console.error('Block preset list error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to list presets.' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { name, kind, payload } = req.body ?? {};
  if (!name || typeof name !== 'string' || (kind !== 'row' && kind !== 'block') || !payload) {
    res.status(400).json({ error: '"name" (string), "kind" ("row" or "block") and "payload" are required.' });
    return;
  }
  try {
    const table = await getBlockPresetsTable();
    const id = randomUUID();
    const entity = toEntity(partitionKey(req), id, name.trim(), kind, payload, new Date().toISOString(), parseCategoryId(req.body?.categoryId));
    await table.createEntity(entity as any);
    res.status(201).json(fromEntity(entity));
  } catch (err: any) {
    if (err?.status === 413) {
      res.status(413).json({ error: err.message });
      return;
    }
    console.error('Block preset create error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to save preset.' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { name, payload } = req.body ?? {};
  if (!name || typeof name !== 'string' || !payload) {
    res.status(400).json({ error: 'Both "name" and "payload" are required.' });
    return;
  }
  try {
    const table = await getBlockPresetsTable();
    const pk = partitionKey(req);
    const id = req.params.id as string;

    let createdAt = new Date().toISOString();
    let kind = 'row';
    let categoryId = 'categoryId' in (req.body ?? {}) ? parseCategoryId(req.body.categoryId) : null;
    try {
      const existing = await table.getEntity(pk, id);
      createdAt = (existing.createdAt as string) ?? createdAt;
      kind = (existing.kind as string) === 'block' ? 'block' : 'row';
      if (!('categoryId' in (req.body ?? {}))) categoryId = (existing.categoryId as string) || null;
    } catch (err: any) {
      if (err?.statusCode !== 404) throw err;
    }

    const entity = toEntity(pk, id, name.trim(), kind, payload, createdAt, categoryId);
    await table.upsertEntity(entity as any, 'Replace');
    res.json(fromEntity(entity));
  } catch (err: any) {
    if (err?.status === 413) {
      res.status(413).json({ error: err.message });
      return;
    }
    console.error('Block preset update error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to save preset.' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const table = await getBlockPresetsTable();
    await table.deleteEntity(partitionKey(req), req.params.id as string);
    res.json({ success: true });
  } catch (err: any) {
    if (err?.statusCode === 404) {
      res.json({ success: true });
      return;
    }
    console.error('Block preset delete error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to delete preset.' });
  }
});

export default router;
