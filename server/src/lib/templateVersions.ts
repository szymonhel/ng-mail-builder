import { randomUUID } from 'crypto';
import { getTemplateVersionsTable } from './azureTables';
import { chunkJson, unchunkJson } from './tableJson';

// One row per template save, partitioned by owner. The rowKey is an inverted
// timestamp so Azure's ascending rowKey order returns newest first without any
// client-side sorting — same scheme as lib/sendHistory.ts.

export interface TemplateVersionMeta {
  id: string;
  templateId: string;
  templateName: string;
  comment: string;
  savedAt: string;
}

export interface TemplateVersionEntry extends TemplateVersionMeta {
  doc: unknown;
}

const MAX_COMMENT_LENGTH = 500;
const MAX_VERSIONS_PER_TEMPLATE = Number(process.env.AZURE_TEMPLATEVERSIONS_MAX_PER_TEMPLATE ?? 50);

function metaFromEntity(entity: Record<string, unknown>): TemplateVersionMeta {
  return {
    id: entity.rowKey as string,
    templateId: (entity.templateId as string) ?? '',
    templateName: (entity.templateName as string) ?? '',
    comment: (entity.comment as string) ?? '',
    savedAt: (entity.savedAt as string) ?? '',
  };
}

export async function recordVersion(
  ownerSub: string,
  templateId: string,
  templateName: string,
  doc: unknown,
  comment: string,
): Promise<void> {
  const table = await getTemplateVersionsTable();
  const now = Date.now();
  const entity = {
    partitionKey: ownerSub,
    rowKey: `${(9999999999999 - now).toString().padStart(13, '0')}-${randomUUID()}`,
    templateId,
    templateName,
    comment: (comment ?? '').slice(0, MAX_COMMENT_LENGTH),
    savedAt: new Date(now).toISOString(),
    ...chunkJson(doc),
  };
  await table.createEntity(entity as any);
  // Best-effort cleanup — a failed prune just means a few extra rows linger
  // until the next save, never data loss.
  pruneOldVersions(ownerSub, templateId).catch(err => console.error('Version prune error:', err?.message ?? err));
}

export async function listVersions(ownerSub: string, templateId: string, limit = 50): Promise<TemplateVersionMeta[]> {
  const table = await getTemplateVersionsTable();
  const cappedLimit = Math.min(Math.max(limit, 1), 200);
  const filter = `PartitionKey eq '${ownerSub.replace(/'/g, "''")}' and templateId eq '${templateId.replace(/'/g, "''")}'`;

  const entries: TemplateVersionMeta[] = [];
  // select excludes doc0..N/docChunks — the list view must stay light even for large docs.
  for await (const page of table
    .listEntities({ queryOptions: { filter, select: ['RowKey', 'templateId', 'templateName', 'comment', 'savedAt'] } })
    .byPage({ maxPageSize: cappedLimit })) {
    for (const entity of page) {
      entries.push(metaFromEntity(entity as Record<string, unknown>));
      if (entries.length >= cappedLimit) return entries;
    }
  }
  return entries;
}

export async function getVersion(ownerSub: string, versionId: string): Promise<TemplateVersionEntry | null> {
  try {
    const table = await getTemplateVersionsTable();
    const entity = await table.getEntity(ownerSub, versionId);
    return { ...metaFromEntity(entity as Record<string, unknown>), doc: unchunkJson(entity as Record<string, unknown>) };
  } catch (err: any) {
    if (err?.statusCode === 404) return null;
    throw err;
  }
}

async function pruneOldVersions(ownerSub: string, templateId: string): Promise<void> {
  const table = await getTemplateVersionsTable();
  const filter = `PartitionKey eq '${ownerSub.replace(/'/g, "''")}' and templateId eq '${templateId.replace(/'/g, "''")}'`;
  const rowKeys: string[] = [];
  for await (const entity of table.listEntities({ queryOptions: { filter, select: ['RowKey'] } })) {
    rowKeys.push(entity.rowKey as string);
  }
  // rowKeys arrive newest-first (inverted-timestamp ascending order); drop everything past the cap.
  for (const rowKey of rowKeys.slice(MAX_VERSIONS_PER_TEMPLATE)) {
    await table.deleteEntity(ownerSub, rowKey).catch(() => {});
  }
}
