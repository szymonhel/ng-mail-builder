// Table storage caps string properties at 64 KB (32 K UTF-16 chars), so JSON
// payloads are split across json0..jsonN properties and reassembled on read.
const CHUNK_CHARS = 30000;
// Whole-entity limit is 1 MB; reject payloads that would blow past it.
const MAX_JSON_CHARS = 800000;

export function chunkJson(value: unknown, propertyPrefix = 'doc'): Record<string, string | number> {
  const json = JSON.stringify(value);
  if (json.length > MAX_JSON_CHARS) {
    throw Object.assign(new Error('Payload is too large to save.'), { status: 413 });
  }
  const props: Record<string, string | number> = {
    [`${propertyPrefix}Chunks`]: Math.ceil(json.length / CHUNK_CHARS) || 1,
  };
  for (let i = 0; i * CHUNK_CHARS < json.length || i === 0; i++) {
    props[`${propertyPrefix}${i}`] = json.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS);
  }
  return props;
}

export function unchunkJson(entity: Record<string, unknown>, propertyPrefix = 'doc'): unknown {
  const chunks = Number(entity[`${propertyPrefix}Chunks`] ?? 1);
  let json = '';
  for (let i = 0; i < chunks; i++) json += (entity[`${propertyPrefix}${i}`] as string) ?? '';
  return JSON.parse(json);
}
