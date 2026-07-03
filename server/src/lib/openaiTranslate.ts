import OpenAI from 'openai';

export interface TranslateField {
  key: string;
  text: string;
}

function buildSystemPrompt(locale: { code: string; label: string }): string {
  return `Translate the given short pieces of email copy into ${locale.label} (locale code: ${locale.code}).

Rules:
- Return a JSON object of the exact shape {"translations": {"<key>": "<translated text>", ...}} using precisely the same keys you were given, and nothing else.
- Preserve all HTML tags, attributes, and structure exactly as-is; translate only the human-readable text between tags.
- Never translate or alter text matching the pattern {{variableName}} — copy those tokens through completely unchanged.
- Keep tone and roughly the same length as the source; this is marketing email copy, not literal machine translation.
- If a given value is empty, return it unchanged.

Respond only with the JSON object — no extra commentary.`;
}

// Plain JSON mode (not strict json_schema) because field keys are dynamic per document —
// strict Structured Outputs needs a fixed property list, which doesn't fit here.
export async function translateFields(
  openaiKey: string,
  locale: { code: string; label: string },
  fields: TranslateField[]
): Promise<Record<string, string>> {
  const client = new OpenAI({ apiKey: openaiKey });

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: buildSystemPrompt(locale) },
      { role: 'user', content: JSON.stringify({ fields }) },
    ],
    response_format: { type: 'json_object' },
  });

  if (completion.usage) {
    const { prompt_tokens, completion_tokens, total_tokens } = completion.usage;
    console.log(`OpenAI translate tokens — prompt: ${prompt_tokens}, completion: ${completion_tokens}, total: ${total_tokens}`);
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('OpenAI did not return any translations.');

  const parsed = JSON.parse(raw);
  return parsed?.translations && typeof parsed.translations === 'object' ? parsed.translations : {};
}
