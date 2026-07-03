import { EmailDoc, Row, Column, Block, BlockType, DocSettings, EmailVariable } from '../models/email-doc.model';
import { uid } from './id.utils';

const DEFAULT_SETTINGS: DocSettings = {
  contentWidth: 600,
  backgroundColor: '#f4f4f4',
  bodyColor: '#ffffff',
  bodyBorderWidth: 0,
  bodyBorderColor: '#dddddd',
  bodyBorderStyle: 'solid',
  fontFamily: 'Arial, sans-serif',
  previewText: '',
  googleFontName: '',
  googleFontUrl: '',
};

const KNOWN_BLOCK_TYPES: ReadonlySet<BlockType> = new Set([
  'text', 'image', 'button', 'divider', 'spacer', 'heading', 'social',
  'video', 'html', 'hero', 'table', 'accordion', 'navbar', 'carousel',
]);

// Backfills ids/defaults for a doc coming from outside the app (hand-edited or
// exported from an older version) so the rest of the app can rely on the invariants
// that in-app mutations already guarantee (every row/column/block has an id, etc).
export function normalizeImportedDoc(input: any): EmailDoc {
  if (!input || typeof input !== 'object' || !Array.isArray(input.rows)) {
    throw new Error('Not a valid email document: expected an object with a "rows" array.');
  }

  const rows: Row[] = input.rows.map((row: any): Row => ({
    id: typeof row?.id === 'string' ? row.id : uid(),
    backgroundColor: row?.backgroundColor ?? null,
    padding: typeof row?.padding === 'string' ? row.padding : '0px',
    condition: row?.condition ?? null,
    columns: Array.isArray(row?.columns)
      ? row.columns.map((col: any): Column => ({
          id: typeof col?.id === 'string' ? col.id : uid(),
          backgroundColor: col?.backgroundColor ?? null,
          blocks: Array.isArray(col?.blocks)
            ? col.blocks
                .filter((b: any) => KNOWN_BLOCK_TYPES.has(b?.type))
                .map((b: any): Block => ({
                  id: typeof b?.id === 'string' ? b.id : uid(),
                  type: b.type,
                  props: b?.props ?? {},
                  condition: b?.condition ?? null,
                }))
            : [],
        }))
      : [],
  }));

  return {
    version: typeof input.version === 'number' ? input.version : 1,
    settings: { ...DEFAULT_SETTINGS, ...(input.settings ?? {}) },
    variables: Array.isArray(input.variables)
      ? input.variables.map((v: any): EmailVariable => ({
          id: typeof v?.id === 'string' ? v.id : uid(),
          name: typeof v?.name === 'string' ? v.name : '',
          defaultValue: typeof v?.defaultValue === 'string' ? v.defaultValue : '',
        }))
      : [],
    rows,
  };
}

export function parseJsonImport(text: string): EmailDoc {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  return normalizeImportedDoc(parsed);
}
