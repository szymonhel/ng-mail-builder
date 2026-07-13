import { randomUUID } from 'crypto';
import { getSendHistoryTable } from './azureTables';

// One row per send attempt (successful or failed), partitioned by user. The rowKey
// is an inverted timestamp so Azure's ascending rowKey order returns newest first
// without any client-side sorting.

export interface SendHistoryEntry {
  id: string;
  sentAt: string;
  status: 'sent' | 'failed';
  error?: string;
  to: string;
  toName?: string;
  // Rendered subject (after {{token}} substitution).
  subject: string;
  // 'app' = interactive send from the editor; 'api' = external service via API key.
  source: 'app' | 'api';
  apiKeyName?: string;
  templateId?: string;
  templateName?: string;
  categoryId?: string;
  language?: string;
  // JSON of the variables used (values truncated) and collection item counts,
  // kept for debugging what an external caller actually sent.
  variablesJson?: string;
  collectionsJson?: string;
  // Mailjet identifiers from the send response, enabling later delivery lookups.
  mailjetMessageId?: string;
  mailjetMessageUuid?: string;
  // Last delivery status fetched from Mailjet (sent/opened/clicked/bounced/...),
  // cached here with its fetch time so the list can show it without re-querying.
  deliveryStatus?: string;
  deliveryCheckedAt?: string;
}

export interface RecordSendInput extends Omit<SendHistoryEntry, 'id' | 'sentAt' | 'variablesJson' | 'collectionsJson'> {
  variables?: Record<string, string>;
  collections?: Record<string, unknown[]>;
}

const MAX_VALUE_LENGTH = 200;
const MAX_ERROR_LENGTH = 1000;

function truncatedVariablesJson(variables?: Record<string, string>): string {
  if (!variables || Object.keys(variables).length === 0) return '';
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(variables)) {
    out[name] = value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}…` : value;
  }
  return JSON.stringify(out);
}

function collectionCountsJson(collections?: Record<string, unknown[]>): string {
  if (!collections || Object.keys(collections).length === 0) return '';
  return JSON.stringify(Object.fromEntries(Object.entries(collections).map(([name, items]) => [name, items.length])));
}

// Fire-and-forget: history must never fail or slow down a send, so callers don't
// await this and all errors end at a console line.
export function recordSend(ownerSub: string, input: RecordSendInput): void {
  void (async () => {
    try {
      const table = await getSendHistoryTable();
      const now = Date.now();
      const entity = {
        partitionKey: ownerSub,
        // 13 digits covers timestamps until the year 2286.
        rowKey: `${(9999999999999 - now).toString().padStart(13, '0')}-${randomUUID()}`,
        sentAt: new Date(now).toISOString(),
        status: input.status,
        error: (input.error ?? '').slice(0, MAX_ERROR_LENGTH),
        to: input.to,
        toName: input.toName ?? '',
        subject: input.subject,
        source: input.source,
        apiKeyName: input.apiKeyName ?? '',
        templateId: input.templateId ?? '',
        templateName: input.templateName ?? '',
        categoryId: input.categoryId ?? '',
        language: input.language ?? '',
        variablesJson: truncatedVariablesJson(input.variables),
        collectionsJson: collectionCountsJson(input.collections),
        mailjetMessageId: input.mailjetMessageId ?? '',
        mailjetMessageUuid: input.mailjetMessageUuid ?? '',
        deliveryStatus: '',
        deliveryCheckedAt: '',
      };
      await table.createEntity(entity as any);
    } catch (err: any) {
      console.error('Send history write error:', err?.message ?? err);
    }
  })();
}

function entryFromEntity(entity: Record<string, unknown>): SendHistoryEntry {
  return {
    id: entity.rowKey as string,
    sentAt: (entity.sentAt as string) ?? '',
    status: (entity.status as SendHistoryEntry['status']) ?? 'sent',
    error: (entity.error as string) || undefined,
    to: (entity.to as string) ?? '',
    toName: (entity.toName as string) || undefined,
    subject: (entity.subject as string) ?? '',
    source: (entity.source as SendHistoryEntry['source']) ?? 'app',
    apiKeyName: (entity.apiKeyName as string) || undefined,
    templateId: (entity.templateId as string) || undefined,
    templateName: (entity.templateName as string) || undefined,
    categoryId: (entity.categoryId as string) || undefined,
    language: (entity.language as string) || undefined,
    variablesJson: (entity.variablesJson as string) || undefined,
    collectionsJson: (entity.collectionsJson as string) || undefined,
    mailjetMessageId: (entity.mailjetMessageId as string) || undefined,
    mailjetMessageUuid: (entity.mailjetMessageUuid as string) || undefined,
    deliveryStatus: (entity.deliveryStatus as string) || undefined,
    deliveryCheckedAt: (entity.deliveryCheckedAt as string) || undefined,
  };
}

export async function getSendHistoryEntry(ownerSub: string, id: string): Promise<SendHistoryEntry | null> {
  try {
    const table = await getSendHistoryTable();
    const entity = await table.getEntity(ownerSub, id);
    return entryFromEntity(entity as Record<string, unknown>);
  } catch (err: any) {
    if (err?.statusCode === 404) return null;
    throw err;
  }
}

// Caches the latest Mailjet delivery status on the history row.
export async function updateDeliveryStatus(ownerSub: string, id: string, status: string): Promise<void> {
  const table = await getSendHistoryTable();
  await table.updateEntity({
    partitionKey: ownerSub,
    rowKey: id,
    deliveryStatus: status,
    deliveryCheckedAt: new Date().toISOString(),
  } as any, 'Merge');
}

export async function listSendHistory(ownerSub: string, options: { templateId?: string; limit?: number } = {}): Promise<SendHistoryEntry[]> {
  const table = await getSendHistoryTable();
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  let filter = `PartitionKey eq '${ownerSub.replace(/'/g, "''")}'`;
  if (options.templateId) filter += ` and templateId eq '${options.templateId.replace(/'/g, "''")}'`;

  const entries: SendHistoryEntry[] = [];
  // Rows come back newest-first thanks to the inverted-timestamp rowKey.
  for await (const page of table.listEntities({ queryOptions: { filter } }).byPage({ maxPageSize: limit })) {
    for (const entity of page) {
      entries.push(entryFromEntity(entity as Record<string, unknown>));
      if (entries.length >= limit) return entries;
    }
  }
  return entries;
}
