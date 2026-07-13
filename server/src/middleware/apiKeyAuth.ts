import { Request, Response, NextFunction } from 'express';
import { checkJwt } from './auth';
import { resolveApiKey } from '../lib/apiKeys';

// Marks requests authenticated via API key so routes can scope what keys may do
// (send templates / read contracts — never template CRUD, assets, or settings).
declare global {
  namespace Express {
    interface Request {
      apiKeyAuth?: boolean;
      // The key's category container; the key may only touch emails belonging to it.
      apiKeyCategoryId?: string;
    }
  }
}

export function isApiKeyAuth(req: Request): boolean {
  return req.apiKeyAuth === true;
}

// True when the API key's category scope covers the given email's category.
// '' scope (a key created before scoping existed) is treated as account-wide.
export function apiKeyAllowsCategory(req: Request, emailCategoryId: string | null): boolean {
  if (!isApiKeyAuth(req)) return true;
  const scope = req.apiKeyCategoryId ?? '';
  return scope === '' || scope === (emailCategoryId ?? '');
}

// Accepts either an `X-Api-Key` header (external services) or the usual Auth0
// bearer token (the app). A valid key resolves to its owner's sub and is exposed
// through the same `req.auth.payload.sub` shape checkJwt provides, so downstream
// handlers don't care which credential arrived.
export async function apiKeyOrJwt(req: Request, res: Response, next: NextFunction): Promise<void> {
  const key = req.header('x-api-key');
  if (!key) {
    checkJwt(req, res, next);
    return;
  }
  try {
    const resolved = await resolveApiKey(key);
    if (!resolved) {
      res.status(401).json({ error: 'Invalid API key.' });
      return;
    }
    req.apiKeyAuth = true;
    req.apiKeyCategoryId = resolved.categoryId;
    (req as any).auth = { payload: { sub: resolved.ownerSub } };
    next();
  } catch (err: any) {
    console.error('API key lookup error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to verify API key.' });
  }
}
