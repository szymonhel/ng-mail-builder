import { Router, Request, Response } from 'express';
import { listSendHistory, getSendHistoryEntry, updateDeliveryStatus } from '../lib/sendHistory';
import { getMailjetClient } from '../lib/mailjet';

const router = Router();

function ownerSub(req: Request): string {
  const sub = req.auth?.payload.sub;
  if (!sub) throw new Error('Token has no sub claim.');
  return sub;
}

// Newest-first send history for the signed-in user (app-only — API keys can't read it).
// ?template=<id> narrows to one saved email; ?limit=<n> caps the page (default 50, max 200).
router.get('/', async (req: Request, res: Response) => {
  try {
    const templateId = typeof req.query.template === 'string' && req.query.template ? req.query.template : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) || undefined : undefined;
    res.json({ entries: await listSendHistory(ownerSub(req), { templateId, limit }) });
  } catch (err: any) {
    console.error('Send history list error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to load send history.' });
  }
});

// On-demand delivery lookup against Mailjet's Message API: current status
// (sent/opened/clicked/bounced/blocked/spam/...) plus the event timeline. The
// status is cached on the history row so the list shows it without re-querying.
router.get('/:id/status', async (req: Request, res: Response) => {
  const sub = ownerSub(req);
  let entry;
  try {
    entry = await getSendHistoryEntry(sub, req.params.id as string);
  } catch (err: any) {
    console.error('Send history read error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to load send history entry.' });
    return;
  }
  if (!entry) {
    res.status(404).json({ error: 'History entry not found.' });
    return;
  }
  if (!entry.mailjetMessageId) {
    res.status(400).json({ error: 'No Mailjet message id recorded for this entry (failed send, or sent before delivery tracking existed).' });
    return;
  }

  try {
    const client = getMailjetClient();
    const [messageResult, historyResult] = await Promise.all([
      client.get('message', { version: 'v3' }).id(entry.mailjetMessageId).request(),
      // The event timeline is best-effort; some accounts/plans return nothing here.
      client.get('messagehistory', { version: 'v3' }).id(entry.mailjetMessageId).request().catch(() => null),
    ]);

    const message = (messageResult.body as any)?.Data?.[0] ?? {};
    const status: string = message.Status ?? 'unknown';
    const events = (((historyResult?.body as any)?.Data ?? []) as any[]).map(e => ({
      // EventAt is a unix timestamp (seconds).
      at: e.EventAt ? new Date(e.EventAt * 1000).toISOString() : null,
      type: e.EventType ?? '',
      state: e.State || undefined,
      userAgent: e.Useragent || undefined,
    }));

    const checkedAt = new Date().toISOString();
    // Cache best-effort — the lookup result matters more than the cache write.
    updateDeliveryStatus(sub, entry.id, status).catch(err => console.error('Delivery status cache error:', err?.message ?? err));

    res.json({
      status,
      arrivedAt: message.ArrivedAt || undefined,
      checkedAt,
      events,
    });
  } catch (err: any) {
    const statusCode = err?.statusCode ?? 502;
    if (statusCode === 404) {
      res.status(404).json({ error: 'Mailjet no longer has this message (their message index is retained for a limited time).' });
      return;
    }
    console.error('Mailjet message lookup error:', err?.message ?? err);
    res.status(502).json({ error: 'Failed to fetch delivery status from Mailjet.' });
  }
});

export default router;
