import { createHash, randomBytes, randomUUID } from 'crypto';
import { getApiKeysTable } from './azureTables';

// API keys authenticate external services on the send path. The plaintext key is
// shown to the user exactly once at creation; only its SHA-256 lands in storage.
//
// Table layout: one entity per key with partitionKey 'key' and rowKey = sha256(key),
// so the hot path (every external send) is a single point read. Management queries
// (list/delete for one user) filter on ownerSub instead — they're rare and the
// table stays tiny.

export const API_KEY_PARTITION = 'key';

export interface ApiKeyMeta {
  id: string;
  name: string;
  // First characters of the key, kept so the list can hint which key is which.
  prefix: string;
  // Keys are scoped to one category container: they may only send emails that
  // belong to it. '' would mean an unscoped legacy key; creation requires one.
  categoryId: string;
  createdAt?: string;
  lastUsedAt?: string;
}

export interface ResolvedApiKey {
  ownerSub: string;
  categoryId: string;
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `mbk_${randomBytes(32).toString('hex')}`;
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 12) };
}

export function metaFromEntity(entity: Record<string, unknown>): ApiKeyMeta {
  return {
    id: entity.keyId as string,
    name: (entity.name as string) ?? 'Unnamed key',
    prefix: (entity.prefix as string) ?? '',
    categoryId: (entity.categoryId as string) ?? '',
    createdAt: entity.createdAt as string | undefined,
    lastUsedAt: (entity.lastUsedAt as string) || undefined,
  };
}

export async function createApiKey(ownerSub: string, name: string, categoryId: string): Promise<{ key: string; meta: ApiKeyMeta }> {
  const table = await getApiKeysTable();
  const { key, hash, prefix } = generateApiKey();
  const entity = {
    partitionKey: API_KEY_PARTITION,
    rowKey: hash,
    keyId: randomUUID(),
    ownerSub,
    categoryId,
    name,
    prefix,
    createdAt: new Date().toISOString(),
    lastUsedAt: '',
  };
  await table.createEntity(entity as any);
  return { key, meta: metaFromEntity(entity) };
}

export async function listApiKeys(ownerSub: string, categoryId?: string): Promise<ApiKeyMeta[]> {
  const table = await getApiKeysTable();
  const keys: ApiKeyMeta[] = [];
  const categoryFilter = categoryId ? ` and categoryId eq '${categoryId.replace(/'/g, "''")}'` : '';
  const iter = table.listEntities({
    queryOptions: { filter: `PartitionKey eq '${API_KEY_PARTITION}' and ownerSub eq '${ownerSub.replace(/'/g, "''")}'${categoryFilter}` },
  });
  for await (const entity of iter) keys.push(metaFromEntity(entity as Record<string, unknown>));
  keys.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return keys;
}

// Deletes by the public key id, verifying ownership so one user can never revoke
// another user's key even with a guessed id.
export async function deleteApiKey(ownerSub: string, keyId: string): Promise<boolean> {
  const table = await getApiKeysTable();
  const iter = table.listEntities({
    queryOptions: { filter: `PartitionKey eq '${API_KEY_PARTITION}' and keyId eq '${keyId.replace(/'/g, "''")}'` },
  });
  for await (const entity of iter) {
    if ((entity as Record<string, unknown>).ownerSub !== ownerSub) continue;
    await table.deleteEntity(API_KEY_PARTITION, (entity as Record<string, unknown>).rowKey as string);
    return true;
  }
  return false;
}

// Point read by hash; returns the owning user + category scope, or null for unknown keys.
export async function resolveApiKey(key: string): Promise<ResolvedApiKey | null> {
  if (!key.startsWith('mbk_')) return null;
  try {
    const table = await getApiKeysTable();
    const hash = hashApiKey(key);
    const entity = await table.getEntity(API_KEY_PARTITION, hash);
    const ownerSub = entity.ownerSub as string | undefined;
    if (!ownerSub) return null;
    // Fire-and-forget usage timestamp; a failed merge must never fail the send.
    table.updateEntity({ partitionKey: API_KEY_PARTITION, rowKey: hash, lastUsedAt: new Date().toISOString() } as any, 'Merge').catch(() => {});
    return { ownerSub, categoryId: (entity.categoryId as string) ?? '' };
  } catch (err: any) {
    if (err?.statusCode === 404) return null;
    throw err;
  }
}
