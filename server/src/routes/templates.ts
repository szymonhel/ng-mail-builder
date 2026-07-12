import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getTemplatesTable } from '../lib/azureTables';
import { chunkJson, unchunkJson } from '../lib/tableJson';

const router = Router();

// The Auth0 user id partitions the table, so users only ever touch their own rows.
function partitionKey(req: Request): string {
  const sub = req.auth?.payload.sub;
  if (!sub) throw new Error('Token has no sub claim.');
  return sub;
}

function toEntity(pk: string, id: string, name: string, doc: unknown, createdAt: string, categoryId: string | null) {
  return {
    partitionKey: pk,
    rowKey: id,
    name,
    // Azure Tables can't store null — empty string means "no category".
    categoryId: categoryId ?? '',
    createdAt,
    updatedAt: new Date().toISOString(),
    ...chunkJson(doc),
  } as Record<string, unknown>;
}

function docFromEntity(entity: Record<string, unknown>): unknown {
  return unchunkJson(entity);
}

function metaFromEntity(entity: Record<string, unknown>) {
  return {
    id: entity.rowKey as string,
    name: (entity.name as string) ?? 'Untitled',
    categoryId: (entity.categoryId as string) || null,
    createdAt: entity.createdAt as string | undefined,
    updatedAt: entity.updatedAt as string | undefined,
  };
}

// Category assignments arrive as string | null; anything else means "no category".
function parseCategoryId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
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
        select: ['RowKey', 'name', 'categoryId', 'createdAt', 'updatedAt'],
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

// The email's data contract, for API consumers preparing a send request: which
// variables it accepts, which collections (and item fields) it iterates over, and
// which languages it supports. Deliberately excludes the doc itself — use GET /:id
// for the full document.
router.get('/:id/contract', async (req: Request, res: Response) => {
  try {
    const table = await getTemplatesTable();
    const entity = await table.getEntity(partitionKey(req), req.params.id as string);
    const doc = docFromEntity(entity as Record<string, unknown>) as any;
    res.json({
      ...metaFromEntity(entity as Record<string, unknown>),
      variables: Array.isArray(doc?.variables)
        ? doc.variables.map((v: any) => ({ name: v?.name ?? '', defaultValue: v?.defaultValue ?? '' }))
        : [],
      collections: Array.isArray(doc?.collections)
        ? doc.collections.map((c: any) => ({
            name: c?.name ?? '',
            fields: Array.isArray(c?.fields) ? c.fields.filter((f: any) => typeof f === 'string') : [],
          }))
        : [],
      // `code` is what a send request should use to pick a language; the default
      // (untranslated) language is always available and signalled by omitting it.
      languages: Array.isArray(doc?.locales)
        ? doc.locales.map((l: any) => ({ code: l?.code ?? '', label: l?.label ?? '' }))
        : [],
    });
  } catch (err: any) {
    if (err?.statusCode === 404) {
      res.status(404).json({ error: 'Saved email not found.' });
      return;
    }
    console.error('Template contract error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to load saved email contract.' });
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
    const entity = toEntity(partitionKey(req), id, name.trim(), doc, new Date().toISOString(), parseCategoryId(req.body?.categoryId));
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
    // Absent categoryId in the body keeps the stored assignment (the editor's save
    // doesn't have to know about it); explicit null/'' clears it.
    let categoryId = 'categoryId' in (req.body ?? {}) ? parseCategoryId(req.body.categoryId) : null;
    try {
      const existing = await table.getEntity(pk, id);
      createdAt = (existing.createdAt as string) ?? createdAt;
      if (!('categoryId' in (req.body ?? {}))) categoryId = (existing.categoryId as string) || null;
    } catch (err: any) {
      if (err?.statusCode !== 404) throw err;
    }

    const entity = toEntity(pk, id, name.trim(), doc, createdAt, categoryId);
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

// Moves an email between categories without re-uploading the whole doc: a merge
// upsert touches only the categoryId column, leaving the chunked doc intact.
router.put('/:id/category', async (req: Request, res: Response) => {
  try {
    const table = await getTemplatesTable();
    const pk = partitionKey(req);
    const id = req.params.id as string;
    // getEntity first so a bad id 404s instead of merge-creating a doc-less row.
    await table.getEntity(pk, id, { queryOptions: { select: ['RowKey'] } });
    await table.upsertEntity({
      partitionKey: pk,
      rowKey: id,
      categoryId: parseCategoryId(req.body?.categoryId) ?? '',
      updatedAt: new Date().toISOString(),
    } as any, 'Merge');
    res.json({ success: true });
  } catch (err: any) {
    if (err?.statusCode === 404) {
      res.status(404).json({ error: 'Saved email not found.' });
      return;
    }
    console.error('Template move error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to move saved email.' });
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
