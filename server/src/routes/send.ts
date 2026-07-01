import { Router, Request, Response } from 'express';
import Mailjet from 'node-mailjet';
import mjml2html from 'mjml';

const router = Router();

interface SendBody {
  to: string;
  toName?: string;
  subject: string;
  mjml: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/', async (req: Request, res: Response) => {
  const { to, toName, subject, mjml } = req.body as SendBody;

  if (!to || !subject || !mjml) {
    res.status(400).json({ error: 'Missing required fields: to, subject, mjml' });
    return;
  }

  if (!isValidEmail(to)) {
    res.status(400).json({ error: 'Invalid recipient email address' });
    return;
  }

  const { html, errors } = await mjml2html(mjml, { validationLevel: 'soft' });

  if (errors.length) {
    const messages = errors.map((e: any) => e.formattedMessage).join('; ');
    res.status(400).json({ error: `MJML compilation failed: ${messages}` });
    return;
  }

  const client = new Mailjet({
    apiKey: process.env.MAILJET_API_KEY!,
    apiSecret: process.env.MAILJET_API_SECRET!,
  });

  try {
    await client.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: process.env.FROM_EMAIL!,
            Name: process.env.FROM_NAME ?? 'Mail Builder',
          },
          To: [{ Email: to, Name: toName ?? to }],
          Subject: subject,
          HTMLPart: html,
        },
      ],
    });

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    console.error('Mailjet error:', err);
    res.status(502).json({ error: message });
  }
});

export default router;
