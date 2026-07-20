import OpenAI from 'openai';
import { EMAIL_DOC_JSON_SCHEMA } from './emailDocSchema';

// Shared by the image, PDF, and chat import routes: all just supply a full OpenAI
// messages array (system + one or more user/assistant turns) and get back a parsed object,
// forced to match the given schema (an EmailDoc by default) via strict Structured Outputs.
export async function generateEmailDoc(
  openaiKey: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  schema: Record<string, unknown> = EMAIL_DOC_JSON_SCHEMA,
  schemaName = 'emit_email_doc'
): Promise<unknown> {
  const client = new OpenAI({ apiKey: openaiKey });

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 8192,
    messages,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
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
