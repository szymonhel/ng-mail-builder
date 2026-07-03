import { EmailDoc } from '../models/email-doc.model';
import { TRANSLATABLE_FIELDS } from './translatable-fields';

// Produces a copy of the doc with every translatable field swapped for its override in
// the given locale (falling back to the source value when no override exists). This
// runs on the EmailDoc structure itself, before docToMjml/docToHtml stringify it —
// unlike custom variables, which substitute {{token}}s in the already-serialized output.
export function resolveDocForLocale(doc: EmailDoc, localeId: string | null): EmailDoc {
  if (!localeId) return doc;
  const map = doc.translations[localeId];
  if (!map || Object.keys(map).length === 0) return doc;

  let docChanged = false;
  const rows = doc.rows.map(row => {
    let rowChanged = false;
    const columns = row.columns.map(col => {
      let colChanged = false;
      const blocks = col.blocks.map(block => {
        const specs = TRANSLATABLE_FIELDS[block.type];
        if (!specs || specs.length === 0) return block;

        let propsChanged = false;
        let props: any = block.props;

        for (const spec of specs) {
          if (spec.kind === 'scalar') {
            const override = map[`${block.id}:${spec.field}`];
            if (override) {
              if (!propsChanged) { props = { ...props }; propsChanged = true; }
              props[spec.field] = override;
            }
          } else if (spec.kind === 'itemArray') {
            const items: any[] = props[spec.arrayField] ?? [];
            let itemsChanged = false;
            const nextItems = items.map(item => {
              let itemChanged = false;
              let nextItem = item;
              for (const f of spec.itemFields) {
                const override = map[`${block.id}:${item.id}:${f.field}`];
                if (override) {
                  if (!itemChanged) { nextItem = { ...nextItem }; itemChanged = true; }
                  nextItem[f.field] = override;
                }
              }
              if (itemChanged) itemsChanged = true;
              return nextItem;
            });
            if (itemsChanged) {
              if (!propsChanged) { props = { ...props }; propsChanged = true; }
              props[spec.arrayField] = nextItems;
            }
          } else if (spec.kind === 'table') {
            const tableRows: { id: string; cells: string[] }[] = props[spec.arrayField] ?? [];
            let rowsChanged = false;
            const nextRows = tableRows.map(tableRow => {
              let cellsChanged = false;
              const nextCells = tableRow.cells.map((cell, cellIndex) => {
                const override = map[`${block.id}:${tableRow.id}:cell${cellIndex}`];
                if (override) { cellsChanged = true; return override; }
                return cell;
              });
              if (!cellsChanged) return tableRow;
              rowsChanged = true;
              return { ...tableRow, cells: nextCells };
            });
            if (rowsChanged) {
              if (!propsChanged) { props = { ...props }; propsChanged = true; }
              props[spec.arrayField] = nextRows;
            }
          }
        }

        if (!propsChanged) return block;
        colChanged = true;
        return { ...block, props };
      });

      if (!colChanged) return col;
      rowChanged = true;
      return { ...col, blocks };
    });

    if (!rowChanged) return row;
    docChanged = true;
    return { ...row, columns };
  });

  if (!docChanged) return doc;
  return { ...doc, rows };
}
