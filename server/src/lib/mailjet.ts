import Mailjet from 'node-mailjet';

// Shared Mailjet client factory (send route + delivery-status lookups).
export function getMailjetClient(): Mailjet {
  return new Mailjet({
    apiKey: process.env.MAILJET_API_KEY!,
    apiSecret: process.env.MAILJET_API_SECRET!,
  });
}
