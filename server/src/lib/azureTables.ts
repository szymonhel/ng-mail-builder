import { TableClient } from '@azure/data-tables';

const clients = new Map<string, Promise<TableClient>>();

// Lazily connects so the server can boot without Azure configured; requests to
// table-backed routes fail with a clear error instead. Reuses the blob storage account.
function getTable(tableName: string): Promise<TableClient> {
  const existing = clients.get(tableName);
  if (existing) return existing;

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    return Promise.reject(new Error('AZURE_STORAGE_CONNECTION_STRING is not set.'));
  }

  const client = TableClient.fromConnectionString(connectionString, tableName);
  const ensured = client
    .createTable()
    .catch(err => {
      // 409 TableAlreadyExists is the normal case after first boot.
      if (err?.statusCode !== 409) {
        clients.delete(tableName);
        throw err;
      }
    })
    .then(() => client);
  clients.set(tableName, ensured);
  return ensured;
}

export function getTemplatesTable(): Promise<TableClient> {
  return getTable(process.env.AZURE_TABLE_NAME ?? 'emails');
}

export function getSettingsTable(): Promise<TableClient> {
  return getTable(process.env.AZURE_SETTINGS_TABLE ?? 'usersettings');
}

export function getCategoriesTable(): Promise<TableClient> {
  return getTable(process.env.AZURE_CATEGORIES_TABLE ?? 'categories');
}

export function getApiKeysTable(): Promise<TableClient> {
  return getTable(process.env.AZURE_APIKEYS_TABLE ?? 'apikeys');
}

export function getSendHistoryTable(): Promise<TableClient> {
  return getTable(process.env.AZURE_SENDHISTORY_TABLE ?? 'sendhistory');
}

export function getBlockPresetsTable(): Promise<TableClient> {
  return getTable(process.env.AZURE_BLOCKPRESETS_TABLE ?? 'blockpresets');
}
