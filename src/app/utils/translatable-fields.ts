import { BlockType, EmailDoc } from '../models/email-doc.model';

export type ScalarFieldSpec = { kind: 'scalar'; field: string; label: string; multiline?: boolean };
export type ItemArrayFieldSpec = {
  kind: 'itemArray';
  arrayField: string;
  itemFields: { field: string; label: string; multiline?: boolean }[];
  itemLabel: (item: any, index: number) => string;
};
export type TableFieldSpec = { kind: 'table'; arrayField: 'rows' };

export type TranslatableFieldSpec = ScalarFieldSpec | ItemArrayFieldSpec | TableFieldSpec;

// Which prop fields hold natural-language text per block type. Colors, URLs, alignment,
// padding, etc. are deliberately excluded — only fields that actually appear as
// human-readable copy in the rendered output belong here. Single source of truth for
// both the Translations tab's field list and the render-time override resolver.
export const TRANSLATABLE_FIELDS: Record<BlockType, TranslatableFieldSpec[]> = {
  text: [{ kind: 'scalar', field: 'html', label: 'Text', multiline: true }],
  image: [{ kind: 'scalar', field: 'alt', label: 'Alt text' }],
  button: [{ kind: 'scalar', field: 'label', label: 'Button label' }],
  divider: [],
  spacer: [],
  heading: [{ kind: 'scalar', field: 'text', label: 'Heading text' }],
  social: [],
  video: [{ kind: 'scalar', field: 'alt', label: 'Alt text' }],
  html: [{ kind: 'scalar', field: 'html', label: 'HTML content', multiline: true }],
  hero: [
    { kind: 'scalar', field: 'title', label: 'Title' },
    { kind: 'scalar', field: 'subtitle', label: 'Subtitle' },
    { kind: 'scalar', field: 'buttonLabel', label: 'Button label' },
  ],
  table: [{ kind: 'table', arrayField: 'rows' }],
  accordion: [
    {
      kind: 'itemArray',
      arrayField: 'items',
      itemFields: [
        { field: 'title', label: 'Question' },
        { field: 'content', label: 'Answer', multiline: true },
      ],
      itemLabel: (item) => item.title || 'Item',
    },
  ],
  navbar: [
    {
      kind: 'itemArray',
      arrayField: 'links',
      itemFields: [{ field: 'label', label: 'Link label' }],
      itemLabel: (item) => item.label || 'Link',
    },
  ],
  carousel: [
    {
      kind: 'itemArray',
      arrayField: 'images',
      itemFields: [{ field: 'alt', label: 'Alt text' }],
      itemLabel: (_item, index) => `Slide ${index + 1}`,
    },
  ],
};

export interface TranslatableFieldEntry {
  key: string;
  blockId: string;
  blockType: BlockType;
  rowId: string;
  colId: string;
  groupLabel: string;
  sourceValue: string;
  multiline?: boolean;
}

// Flattens the whole doc into every translatable field, in doc order. Used both to
// render the Translations tab's field list and to compute per-locale coverage.
export function listTranslatableFields(doc: EmailDoc): TranslatableFieldEntry[] {
  const entries: TranslatableFieldEntry[] = [];

  for (const row of doc.rows) {
    for (const col of row.columns) {
      for (const block of col.blocks) {
        const specs = TRANSLATABLE_FIELDS[block.type] ?? [];
        const props: any = block.props;

        for (const spec of specs) {
          if (spec.kind === 'scalar') {
            entries.push({
              key: `${block.id}:${spec.field}`,
              blockId: block.id,
              blockType: block.type,
              rowId: row.id,
              colId: col.id,
              groupLabel: spec.label,
              sourceValue: props[spec.field] ?? '',
              multiline: spec.multiline,
            });
          } else if (spec.kind === 'itemArray') {
            const items: any[] = props[spec.arrayField] ?? [];
            items.forEach((item, index) => {
              for (const f of spec.itemFields) {
                entries.push({
                  key: `${block.id}:${item.id}:${f.field}`,
                  blockId: block.id,
                  blockType: block.type,
                  rowId: row.id,
                  colId: col.id,
                  groupLabel: `${spec.itemLabel(item, index)}: ${f.label}`,
                  sourceValue: item[f.field] ?? '',
                  multiline: f.multiline,
                });
              }
            });
          } else if (spec.kind === 'table') {
            const rows: { id: string; cells: string[] }[] = props[spec.arrayField] ?? [];
            rows.forEach((tableRow, rowIndex) => {
              tableRow.cells.forEach((cell, cellIndex) => {
                entries.push({
                  key: `${block.id}:${tableRow.id}:cell${cellIndex}`,
                  blockId: block.id,
                  blockType: block.type,
                  rowId: row.id,
                  colId: col.id,
                  groupLabel: `Row ${rowIndex + 1}, Column ${cellIndex + 1}`,
                  sourceValue: cell ?? '',
                });
              });
            });
          }
        }
      }
    }
  }

  return entries;
}
