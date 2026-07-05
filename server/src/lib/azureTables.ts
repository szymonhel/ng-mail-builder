import { TableClient } from '@azure/data-tables';

let ensured: Promise<TableClient> | null = null;

// Lazily connects so the server can boot without Azure configured; requests to
// /templates fail with a clear error instead. Reuses the blob storage account.
export function getTemplatesTable(): Promise<TableClient> {
  if (ensured) return ensured;

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    return Promise.reject(new Error('AZURE_STORAGE_CONNECTION_STRING is not set.'));
  }

  const tableName = process.env.AZURE_TABLE_NAME ?? 'emails';
  const client = TableClient.fromConnectionString(connectionString, tableName);

  ensured = client
    .createTable()
    .catch(err => {
      // 409 TableAlreadyExists is the normal case after first boot.
      if (err?.statusCode !== 409) {
        ensured = null;
        throw err;
      }
    })
    .then(() => client);
  return ensured;
}
