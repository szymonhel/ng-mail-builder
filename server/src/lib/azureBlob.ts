import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

let containerClient: ContainerClient | null = null;
let ensured: Promise<ContainerClient> | null = null;

// Lazily connects so the server can boot without Azure configured; requests to
// /assets fail with a clear error instead. The container is created with public
// blob read access because email clients must be able to fetch the images.
export function getAssetsContainer(): Promise<ContainerClient> {
  if (ensured) return ensured;

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    return Promise.reject(new Error('AZURE_STORAGE_CONNECTION_STRING is not set.'));
  }

  const containerName = process.env.AZURE_BLOB_CONTAINER ?? 'assets';
  const service = BlobServiceClient.fromConnectionString(connectionString);
  containerClient = service.getContainerClient(containerName);

  ensured = containerClient
    .createIfNotExists({ access: 'blob' })
    .then(() => containerClient!)
    .catch(err => {
      ensured = null;
      throw err;
    });
  return ensured;
}
