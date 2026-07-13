import { EmailDoc, Row, Column, Block, BlockType, DocSettings, EmailCollection, EmailVariable, Locale, SavedColor } from '../models/email-doc.model';
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

// Nested array props whose items need a stable id for translation-key targeting.
// Legacy JSON (pre-translations) won't have these, so backfill them on import.
const ITEM_ARRAY_FIELDS = ['links', 'rows', 'items', 'images'] as const;

function backfillNestedItemIds(type: BlockType, props: any): any {
  if (!props || typeof props !== 'object') return props ?? {};
  let changed = false;
  const next: any = { ...props };
  for (const field of ITEM_ARRAY_FIELDS) {
    if (Array.isArray(next[field])) {
      next[field] = next[field].map((item: any) => {
        if (item && typeof item === 'object' && typeof item.id === 'string') return item;
        changed = true;
        return { ...item, id: uid() };
      });
    }
  }
  return changed ? next : props;
}

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
    repeat: typeof row?.repeat?.collectionName === 'string' ? { collectionName: row.repeat.collectionName } : null,
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
                  props: backfillNestedItemIds(b.type, b?.props ?? {}),
                  condition: b?.condition ?? null,
                }))
            : [],
        }))
      : [],
  }));

  const locales: Locale[] = Array.isArray(input.locales)
    ? input.locales.map((l: any): Locale => ({
        id: typeof l?.id === 'string' ? l.id : uid(),
        code: typeof l?.code === 'string' ? l.code : '',
        label: typeof l?.label === 'string' ? l.label : '',
      }))
    : [];

  const validLocaleIds = new Set(locales.map(l => l.id));
  const translations: Record<string, Record<string, string>> = {};
  if (input.translations && typeof input.translations === 'object') {
    for (const [localeId, map] of Object.entries(input.translations as Record<string, unknown>)) {
      if (!validLocaleIds.has(localeId) || !map || typeof map !== 'object') continue;
      const nextMap: Record<string, string> = {};
      for (const [key, value] of Object.entries(map as Record<string, unknown>)) {
        if (typeof value === 'string') nextMap[key] = value;
      }
      translations[localeId] = nextMap;
    }
  }
  for (const locale of locales) {
    if (!translations[locale.id]) translations[locale.id] = {};
  }

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
    collections: Array.isArray(input.collections)
      ? input.collections.map((c: any): EmailCollection => {
          const fields: string[] = Array.isArray(c?.fields) ? c.fields.filter((f: any) => typeof f === 'string') : [];
          return {
            id: typeof c?.id === 'string' ? c.id : uid(),
            name: typeof c?.name === 'string' ? c.name : '',
            fields,
            sampleItems: Array.isArray(c?.sampleItems)
              ? c.sampleItems.map((item: any) => {
                  const next: Record<string, string> = {};
                  for (const field of fields) {
                    if (typeof item?.[field] === 'string') next[field] = item[field];
                  }
                  return next;
                })
              : [],
          };
        })
      : [],
    locales,
    translations,
    rows,
    // Category inheritance flags: missing means "keep own settings/colors", the
    // safe reading for docs exported before categories existed.
    inheritSettings: input.inheritSettings === true,
    inheritColors: input.inheritColors === true,
    savedColors: Array.isArray(input.savedColors)
      ? input.savedColors
          .filter((c: any) => typeof c?.value === 'string')
          .map((c: any): SavedColor => ({
            id: typeof c?.id === 'string' ? c.id : uid(),
            name: typeof c?.name === 'string' ? c.name : '',
            value: c.value,
          }))
      : undefined,
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
