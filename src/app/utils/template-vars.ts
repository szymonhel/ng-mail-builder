import { EmailVariable } from '../models/email-doc.model';

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

// Leaves unknown tokens untouched rather than blanking them, so a typo in a
// variable name is visible in the output instead of silently disappearing.
export function applyVariables(content: string, values: Record<string, string>): string {
  return content.replace(TOKEN_RE, (match, name) => values[name] ?? match);
}

export function defaultVariableValues(variables: EmailVariable[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const v of variables) values[v.name] = v.defaultValue;
  return values;
}
