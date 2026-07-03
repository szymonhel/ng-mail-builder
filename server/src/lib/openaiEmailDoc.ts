import OpenAI from 'openai';
import { EMAIL_DOC_JSON_SCHEMA } from './emailDocSchema';

// Shared by the image and PDF import routes: both just supply a system prompt and a
// user content array (image_url / file / text parts) and get back a parsed EmailDoc-shaped
// object, forced to match EMAIL_DOC_JSON_SCHEMA via strict Structured Outputs.
export async function generateEmailDoc(
  openaiKey: string,
  systemPrompt: string,
  content: OpenAI.Chat.Completions.ChatCompletionContentPart[]
): Promise<unknown> {
  const client = new OpenAI({ apiKey: openaiKey });

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 8192,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'emit_email_doc',
        strict: true,
        schema: EMAIL_DOC_JSON_SCHEMA,
      },
    },
  });

  if (completion.usage) {
    const { prompt_tokens, completion_tokens, total_tokens } = completion.usage;
    console.log(`OpenAI import tokens — prompt: ${prompt_tokens}, completion: ${completion_tokens}, total: ${total_tokens}`);
  }

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) {
    throw new Error('OpenAI did not return a structured document.');
  }

  return JSON.parse(responseContent);
}
