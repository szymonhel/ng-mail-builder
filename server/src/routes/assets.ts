import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { imageSize } from 'image-size';
import { getAssetsContainer } from '../lib/azureBlob';

const router = Router();

const SUPPORTED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!SUPPORTED_MEDIA_TYPES.has(file.mimetype)) {
      cb(new Error('Unsupported image type. Use JPEG, PNG, GIF, WEBP, or SVG.'));
      return;
    }
    cb(null, true);
  },
});

// Blob names embed a UUID so uploads never collide; the sanitized original
// filename is kept for readability in the storage explorer and asset list.
function blobNameFor(originalName: string): string {
  const safe = originalName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-80);
  return `${randomUUID()}-${safe || 'asset'}`;
}

// Blobs are grouped into a virtual directory per user (the Auth0 user id from
// the validated token), so users only see and manage their own assets.
function userPrefix(req: Request): string {
  const sub = req.auth?.payload.sub;
  if (!sub) throw new Error('Token has no sub claim.');
  return `${sub}/`;
}

function blobUrl(containerUrl: string, name: string): string {
  return `${containerUrl}/${name.split('/').map(encodeURIComponent).join('/')}`;
}

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Missing "file" upload.' });
    return;
  }

  // Pixel dimensions are stored as blob metadata so listings can show them
  // without re-downloading the image. SVGs without absolute sizes stay undimensioned.
  let width: number | undefined;
  let height: number | undefined;
  try {
    ({ width, height } = imageSize(req.file.buffer));
  } catch {
    // Not fatal — the asset just won't have dimensions.
  }

  try {
    const container = await getAssetsContainer();
    const name = `${userPrefix(req)}${blobNameFor(req.file.originalname)}`;
    const blob = container.getBlockBlobClient(name);
    await blob.uploadData(req.file.buffer, {
      blobHTTPHeaders: {
        blobContentType: req.file.mimetype,
        blobCacheControl: 'public, max-age=31536000, immutable',
      },
      metadata: width && height ? { width: String(width), height: String(height) } : undefined,
    });
    res.status(201).json({ name, url: blobUrl(container.url, name), size: req.file.size, contentType: req.file.mimetype, width, height });
  } catch (err: any) {
    console.error('Asset upload error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to upload asset to storage.' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const container = await getAssetsContainer();
    const assets: { name: string; url: string; size?: number; contentType?: string; lastModified?: string; width?: number; height?: number }[] = [];
    for await (const blob of container.listBlobsFlat({ prefix: userPrefix(req), includeMetadata: true })) {
      const width = blob.metadata?.width ? Number(blob.metadata.width) : undefined;
      const height = blob.metadata?.height ? Number(blob.metadata.height) : undefined;
      assets.push({
        name: blob.name,
        url: blobUrl(container.url, blob.name),
        size: blob.properties.contentLength,
        contentType: blob.properties.contentType,
        lastModified: blob.properties.lastModified?.toISOString(),
        width,
        height,
      });
    }
    assets.sort((a, b) => (b.lastModified ?? '').localeCompare(a.lastModified ?? ''));
    res.json({ assets });
  } catch (err: any) {
    console.error('Asset list error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to list assets.' });
  }
});

router.delete('/:name', async (req: Request, res: Response) => {
  const name = req.params.name;
  if (typeof name !== 'string' || !name) {
    res.status(400).json({ error: 'Missing asset name.' });
    return;
  }
  if (!name.startsWith(userPrefix(req))) {
    res.status(403).json({ error: 'You can only delete your own assets.' });
    return;
  }
  try {
    const container = await getAssetsContainer();
    await container.getBlockBlobClient(name).deleteIfExists();
    res.json({ success: true });
  } catch (err: any) {
    console.error('Asset delete error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to delete asset.' });
  }
});

// Multer errors (bad mimetype, file too large) land here rather than the route handler above.
router.use((err: any, _req: Request, res: Response, next: (err?: any) => void) => {
  if (err instanceof multer.MulterError || err?.message?.includes('Unsupported image type')) {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
});

export default router;
