import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getTemplatesTable } from '../lib/azureTables';

const router = Router();

// Table storage caps string properties at 64 KB (32 K UTF-16 chars), so the
// doc JSON is split across doc0..docN properties and reassembled on read.
const CHUNK_CHARS = 30000;
// Whole-entity limit is 1 MB; reject docs that would blow past it.
const MAX_DOC_CHARS = 800000;

// The Auth0 user id partitions the table, so users only ever touch their own rows.
function partitionKey(req: Request): string {
  const sub = req.auth?.payload.sub;
  if (!sub) throw new Error('Token has no sub claim.');
  return sub;
}

function toEntity(pk: string, id: string, name: string, doc: unknown, createdAt: string) {
  const json = JSON.stringify(doc);
  if (json.length > MAX_DOC_CHARS) {
    throw Object.assign(new Error('Email is too large to save.'), { status: 413 });
  }
  const entity: Record<string, unknown> = {
    partitionKey: pk,
    rowKey: id,
    name,
    createdAt,
    updatedAt: new Date().toISOString(),
    docChunks: Math.ceil(json.length / CHUNK_CHARS) || 1,
  };
  for (let i = 0; i * CHUNK_CHARS < json.length || i === 0; i++) {
    entity[`doc${i}`] = json.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS);
  }
  return entity;
}

function docFromEntity(entity: Record<string, unknown>): unknown {
  const chunks = Number(entity.docChunks ?? 1);
  let json = '';
  for (let i = 0; i < chunks; i++) json += (entity[`doc${i}`] as string) ?? '';
  return JSON.parse(json);
}

function metaFromEntity(entity: Record<string, unknown>) {
  return {
    id: entity.rowKey as string,
    name: (entity.name as string) ?? 'Untitled',
    createdAt: entity.createdAt as string | undefined,
    updatedAt: entity.updatedAt as string | undefined,
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const table = await getTemplatesTable();
    const pk = partitionKey(req);
    const templates = [];
    const iter = table.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${pk.replace(/'/g, "''")}'`,
        // System properties are only returned when explicitly selected.
        select: ['RowKey', 'name', 'createdAt', 'updatedAt'],
      },
    });
    for await (const entity of iter) templates.push(metaFromEntity(entity as Record<string, unknown>));
    templates.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    res.json({ templates });
  } catch (err: any) {
    console.error('Template list error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to list saved emails.' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const table = await getTemplatesTable();
    const entity = await table.getEntity(partitionKey(req), req.params.id as string);
    res.json({ ...metaFromEntity(entity as Record<string, unknown>), doc: docFromEntity(entity as Record<string, unknown>) });
  } catch (err: any) {
    if (err?.statusCode === 404) {
      res.status(404).json({ error: 'Saved email not found.' });
      return;
    }
    console.error('Template get error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to load saved email.' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { name, doc } = req.body ?? {};
  if (!name || typeof name !== 'string' || !doc) {
    res.status(400).json({ error: 'Both "name" and "doc" are required.' });
    return;
  }
  try {
    const table = await getTemplatesTable();
    const id = randomUUID();
    const entity = toEntity(partitionKey(req), id, name.trim(), doc, new Date().toISOString());
    await table.createEntity(entity as any);
    res.status(201).json(metaFromEntity(entity));
  } catch (err: any) {
    if (err?.status === 413) {
      res.status(413).json({ error: err.message });
      return;
    }
    console.error('Template create error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to save email.' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { name, doc } = req.body ?? {};
  if (!name || typeof name !== 'string' || !doc) {
    res.status(400).json({ error: 'Both "name" and "doc" are required.' });
    return;
  }
  try {
    const table = await getTemplatesTable();
    const pk = partitionKey(req);
    const id = req.params.id as string;

    let createdAt = new Date().toISOString();
    try {
      const existing = await table.getEntity(pk, id);
      createdAt = (existing.createdAt as string) ?? createdAt;
    } catch (err: any) {
      if (err?.statusCode !== 404) throw err;
    }

    const entity = toEntity(pk, id, name.trim(), doc, createdAt);
    // Replace (not merge) so stale doc chunks from a previously larger doc are dropped.
    await table.upsertEntity(entity as any, 'Replace');
    res.json(metaFromEntity(entity));
  } catch (err: any) {
    if (err?.status === 413) {
      res.status(413).json({ error: err.message });
      return;
    }
    console.error('Template update error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to save email.' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const table = await getTemplatesTable();
    await table.deleteEntity(partitionKey(req), req.params.id as string);
    res.json({ success: true });
  } catch (err: any) {
    if (err?.statusCode === 404) {
      res.json({ success: true });
      return;
    }
    console.error('Template delete error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to delete saved email.' });
  }
});

export default router;
