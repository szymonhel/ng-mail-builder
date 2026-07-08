import { AccordionProps, Block, Column, EmailCollection, EmailVariable, Row, TableProps, VisibilityCondition } from '../models/email-doc.model';

// Dots allowed so collection item tokens ({{items.price}}) share the same syntax.
const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

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

// collectionName -> item list, defaulting to each collection's sample items —
// the collection counterpart of defaultVariableValues above.
export function defaultCollectionItems(collections: EmailCollection[]): Record<string, Record<string, string>[]> {
  const data: Record<string, Record<string, string>[]> = {};
  for (const c of collections) data[c.name] = c.sampleItems;
  return data;
}

// {{items.price}}-style values for one item of one collection.
function itemScopedValues(collectionName: string, item: Record<string, string>): Record<string, string> {
  const scoped: Record<string, string> = {};
  for (const [field, value] of Object.entries(item)) scoped[`${collectionName}.${field}`] = value;
  return scoped;
}

function mapStringsDeep<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === 'string') return fn(value) as T;
  if (Array.isArray(value)) return value.map(v => mapStringsDeep(v, fn)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = mapStringsDeep(v, fn);
    return out as T;
  }
  return value;
}

// First copy keeps the original id so preview-highlighting by block id still finds
// something; later copies get suffixed ids to stay unique within the rendered output.
function copyId(id: string, copyIndex: number): string {
  return copyIndex === 0 ? id : `${id}__${copyIndex}`;
}

// Expands each repeated row into one copy per collection item, resolving that item's
// {{collection.field}} tokens and any conditions that reference them. Conditions on
// plain variables are left in place for the caller's usual condition filtering, and
// unknown tokens survive substitution, so this composes with applyVariables downstream.
// Block-level repeats (table body rows, accordion items) are expanded in the same pass.
export function expandRepeats(rows: Row[], collectionItems: Record<string, Record<string, string>[]>): Row[] {
  const out: Row[] = [];
  for (const row of rows) {
    if (!row.repeat) {
      out.push(expandBlockRepeats(row, collectionItems));
      continue;
    }
    const items = collectionItems[row.repeat.collectionName] ?? [];
    items.forEach((item, i) => {
      const scoped = itemScopedValues(row.repeat!.collectionName, item);
      const copy = instantiateRow(row, scoped, i);
      if (copy) out.push(expandBlockRepeats(copy, collectionItems));
    });
  }
  return out;
}

// Runs after any row-level expansion (whose scoped substitution leaves this block's
// collection tokens untouched), so a repeated table can even live inside a repeated row.
function expandBlockRepeats(row: Row, collectionItems: Record<string, Record<string, string>[]>): Row {
  return {
    ...row,
    columns: row.columns.map(col => ({
      ...col,
      blocks: col.blocks.map(b => expandBlockItems(b, collectionItems)),
    })),
  };
}

function expandBlockItems(block: Block, collectionItems: Record<string, Record<string, string>[]>): Block {
  if (block.type === 'table') {
    const p = block.props as TableProps;
    if (!p.repeat?.collectionName) return block;
    const items = collectionItems[p.repeat.collectionName] ?? [];
    const header = p.hasHeader ? p.rows.slice(0, 1) : [];
    const templates = p.hasHeader ? p.rows.slice(1) : p.rows;
    const body = items.flatMap((item, i) => {
      const scoped = itemScopedValues(p.repeat!.collectionName, item);
      return templates.map(t => ({
        id: copyId(t.id, i),
        cells: t.cells.map(c => applyVariables(c, scoped)),
      }));
    });
    return { ...block, props: { ...p, repeat: null, rows: [...header, ...body] } };
  }
  if (block.type === 'accordion') {
    const p = block.props as AccordionProps;
    if (!p.repeat?.collectionName) return block;
    const items = collectionItems[p.repeat.collectionName] ?? [];
    const expanded = items.flatMap((item, i) => {
      const scoped = itemScopedValues(p.repeat!.collectionName, item);
      return p.items.map(t => ({
        ...t,
        id: copyId(t.id, i),
        title: applyVariables(t.title, scoped),
        content: applyVariables(t.content, scoped),
      }));
    });
    return { ...block, props: { ...p, repeat: null, items: expanded } };
  }
  return block;
}

function instantiateRow(row: Row, scoped: Record<string, string>, copyIndex: number): Row | null {
  if (row.condition && row.condition.variableName in scoped) {
    if (!evaluateCondition(row.condition, scoped)) return null;
  }
  const columns: Column[] = row.columns.map(col => ({
    ...col,
    id: copyId(col.id, copyIndex),
    blocks: col.blocks
      .map(b => instantiateBlock(b, scoped, copyIndex))
      .filter((b): b is Block => b !== null),
  }));
  return {
    ...row,
    id: copyId(row.id, copyIndex),
    repeat: null,
    // item-scoped conditions were just resolved; variable-based ones stay for later
    condition: row.condition && row.condition.variableName in scoped ? null : row.condition,
    columns,
  };
}

function instantiateBlock(block: Block, scoped: Record<string, string>, copyIndex: number): Block | null {
  let condition = block.condition;
  if (condition && condition.variableName in scoped) {
    if (!evaluateCondition(condition, scoped)) return null;
    condition = null;
  }
  return {
    ...block,
    id: copyId(block.id, copyIndex),
    condition,
    props: mapStringsDeep(block.props, s => applyVariables(s, scoped)),
  };
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
