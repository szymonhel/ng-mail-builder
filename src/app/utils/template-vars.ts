import { EmailVariable, VisibilityCondition } from '../models/email-doc.model';

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

// "Set" means non-empty and not the literal string "false", so a variable can
// double as a boolean toggle (e.g. defaultValue "false") without a separate type.
function isTruthy(raw: string | undefined): boolean {
  return !!raw && raw.trim() !== '' && raw.trim().toLowerCase() !== 'false';
}

export function evaluateCondition(condition: VisibilityCondition | null | undefined, values: Record<string, string>): boolean {
  if (!condition) return true;
  const raw = values[condition.variableName];
  switch (condition.operator) {
    case 'isSet': return isTruthy(raw);
    case 'isNotSet': return !isTruthy(raw);
    case 'equals': return (raw ?? '') === (condition.value ?? '');
    case 'notEquals': return (raw ?? '') !== (condition.value ?? '');
  }
}
