// Server-side EmailDoc -> MJML render pipeline for template-based sends.
//
// Hand-written mirror of the client's pure render utils (same convention as
// emailDocSchema.ts — the server and Angular app are separate TS projects):
//   - src/app/models/email-doc.model.ts   (doc structure)
//   - src/app/utils/template-vars.ts      (variables, conditions, repeat expansion)
//   - src/app/utils/translatable-fields.ts + translation-resolver.ts (locales)
//   - src/app/utils/mjml-mapper.ts        (docToMjml half only; mjmlToDoc needs a DOM)
// If rendering behavior changes on the client, mirror it here too.

// --- Doc structure -----------------------------------------------------------------

export type BlockType = 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'heading' | 'social' | 'video' | 'html' | 'hero' | 'table' | 'accordion' | 'navbar' | 'carousel';

export type ConditionOperator = 'isSet' | 'isNotSet' | 'equals' | 'notEquals';

export interface VisibilityCondition {
  variableName: string;
  operator: ConditionOperator;
  value?: string;
}

export interface RowRepeat {
  collectionName: string;
}

export interface Block {
  id: string;
  type: BlockType;
  // Block props are consumed dynamically (same as the client's mapper functions).
  props: any;
  condition?: VisibilityCondition | null;
}

export interface Column {
  id: string;
  blocks: Block[];
  backgroundColor?: string | null;
}

export interface Row {
  id: string;
  backgroundColor: string | null;
  padding: string;
  columns: Column[];
  condition?: VisibilityCondition | null;
  repeat?: RowRepeat | null;
}

export interface EmailVariable {
  id: string;
  name: string;
  defaultValue: string;
}

export interface EmailCollection {
  id: string;
  name: string;
  fields: string[];
  sampleItems: Record<string, string>[];
}

export interface Locale {
  id: string;
  code: string;
  label: string;
}

export interface DocSettings {
  contentWidth: number;
  backgroundColor: string;
  bodyColor: string;
  bodyBorderWidth: number;
  bodyBorderColor: string;
  bodyBorderStyle: 'solid' | 'dashed' | 'dotted';
  fontFamily: string;
  previewText: string;
  googleFontName: string;
  googleFontUrl: string;
}

export interface EmailDoc {
  version: number;
  settings: DocSettings;
  variables: EmailVariable[];
  collections?: EmailCollection[];
  rows: Row[];
  locales: Locale[];
  translations: Record<string /* localeId */, Record<string, string>>;
  // When true and the email belongs to a category, the category's default settings
  // replace `settings` at render time (see send.ts). Colors/palette fields are
  // editor-only and don't affect rendering.
  inheritSettings?: boolean;
  inheritColors?: boolean;
  savedColors?: { id: string; name: string; value: string }[];
}

export type CollectionItems = Record<string, Record<string, string>[]>;

// --- Variables, conditions, repeat expansion (mirror of template-vars.ts) -----------

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export function applyVariables(content: string, values: Record<string, string>): string {
  return content.replace(TOKEN_RE, (match, name) => values[name] ?? match);
}

export function defaultVariableValues(variables: EmailVariable[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const v of variables ?? []) values[v.name] = v.defaultValue;
  return values;
}

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
    default: return true;
  }
}

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

function copyId(id: string, copyIndex: number): string {
  return copyIndex === 0 ? id : `${id}__${copyIndex}`;
}

export function expandRepeats(rows: Row[], collectionItems: CollectionItems): Row[] {
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

function expandBlockRepeats(row: Row, collectionItems: CollectionItems): Row {
  return {
    ...row,
    columns: row.columns.map(col => ({
      ...col,
      blocks: col.blocks.map(b => expandBlockItems(b, collectionItems)),
    })),
  };
}

function expandBlockItems(block: Block, collectionItems: CollectionItems): Block {
  if (block.type === 'table') {
    const p = block.props;
    if (!p?.repeat?.collectionName) return block;
    const items = collectionItems[p.repeat.collectionName] ?? [];
    const rows: { id: string; cells: string[] }[] = p.rows ?? [];
    const header = p.hasHeader ? rows.slice(0, 1) : [];
    const templates = p.hasHeader ? rows.slice(1) : rows;
    const body = items.flatMap((item, i) => {
      const scoped = itemScopedValues(p.repeat.collectionName, item);
      return templates.map(t => ({
        id: copyId(t.id, i),
        cells: t.cells.map(c => applyVariables(c, scoped)),
      }));
    });
    return { ...block, props: { ...p, repeat: null, rows: [...header, ...body] } };
  }
  if (block.type === 'accordion') {
    const p = block.props;
    if (!p?.repeat?.collectionName) return block;
    const items = collectionItems[p.repeat.collectionName] ?? [];
    const templates: { id: string; title: string; content: string }[] = p.items ?? [];
    const expanded = items.flatMap((item, i) => {
      const scoped = itemScopedValues(p.repeat.collectionName, item);
      return templates.map(t => ({
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

// --- Locale resolution (mirror of translatable-fields.ts + translation-resolver.ts) --

type TranslatableFieldSpec =
  | { kind: 'scalar'; field: string }
  | { kind: 'itemArray'; arrayField: string; itemFields: { field: string }[] }
  | { kind: 'table'; arrayField: 'rows' };

const TRANSLATABLE_FIELDS: Record<BlockType, TranslatableFieldSpec[]> = {
  text: [{ kind: 'scalar', field: 'html' }],
  image: [{ kind: 'scalar', field: 'alt' }],
  button: [{ kind: 'scalar', field: 'label' }],
  divider: [],
  spacer: [],
  heading: [{ kind: 'scalar', field: 'text' }],
  social: [],
  video: [{ kind: 'scalar', field: 'alt' }],
  html: [{ kind: 'scalar', field: 'html' }],
  hero: [
    { kind: 'scalar', field: 'title' },
    { kind: 'scalar', field: 'subtitle' },
    { kind: 'scalar', field: 'buttonLabel' },
  ],
  table: [{ kind: 'table', arrayField: 'rows' }],
  accordion: [{ kind: 'itemArray', arrayField: 'items', itemFields: [{ field: 'title' }, { field: 'content' }] }],
  navbar: [{ kind: 'itemArray', arrayField: 'links', itemFields: [{ field: 'label' }] }],
  carousel: [{ kind: 'itemArray', arrayField: 'images', itemFields: [{ field: 'alt' }] }],
};

export function resolveDocForLocale(doc: EmailDoc, localeId: string | null): EmailDoc {
  if (!localeId) return doc;
  const map = doc.translations?.[localeId];
  if (!map || Object.keys(map).length === 0) return doc;

  const rows = doc.rows.map(row => ({
    ...row,
    columns: row.columns.map(col => ({
      ...col,
      blocks: col.blocks.map(block => {
        const specs = TRANSLATABLE_FIELDS[block.type];
        if (!specs || specs.length === 0) return block;
        const props: any = { ...block.props };

        for (const spec of specs) {
          if (spec.kind === 'scalar') {
            const override = map[`${block.id}:${spec.field}`];
            if (override) props[spec.field] = override;
          } else if (spec.kind === 'itemArray') {
            props[spec.arrayField] = (props[spec.arrayField] ?? []).map((item: any) => {
              const next = { ...item };
              for (const f of spec.itemFields) {
                const override = map[`${block.id}:${item.id}:${f.field}`];
                if (override) next[f.field] = override;
              }
              return next;
            });
          } else if (spec.kind === 'table') {
            props[spec.arrayField] = (props[spec.arrayField] ?? []).map((tableRow: any) => ({
              ...tableRow,
              cells: tableRow.cells.map((cell: string, cellIndex: number) =>
                map[`${block.id}:${tableRow.id}:cell${cellIndex}`] || cell),
            }));
          }
        }
        return { ...block, props };
      }),
    })),
  }));

  return { ...doc, rows };
}

// --- EmailDoc -> MJML (mirror of mjml-mapper.ts's docToMjml half) --------------------

type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok' | 'pinterest' | 'github' | 'discord' | 'reddit' | 'whatsapp' | 'telegram';

const FALLBACK_SOCIAL_COLORS: Partial<Record<SocialPlatform, string>> = {
  tiktok: '#000000',
  discord: '#5865f2',
  reddit: '#ff4500',
  whatsapp: '#25d366',
  telegram: '#229ed9',
};

function blockToMjml(b: Block): string {
  switch (b.type) {
    case 'text': {
      const p = b.props;
      return `<mj-text align="${p.align}" font-size="${p.fontSize}px" color="${p.color}" padding="${p.padding}">${p.html}</mj-text>`;
    }
    case 'image': {
      const p = b.props;
      const href = p.href ? ` href="${p.href}"` : '';
      return `<mj-image src="${p.src}" alt="${p.alt}" width="${p.width}px" align="${p.align}" padding="${p.padding}"${href} />`;
    }
    case 'button': {
      const p = b.props;
      return `<mj-button href="${p.href}" background-color="${p.bg}" color="${p.color}" align="${p.align}" border-radius="${p.borderRadius}px" padding="${p.padding}">${p.label}</mj-button>`;
    }
    case 'divider': {
      const p = b.props;
      return `<mj-divider border-color="${p.borderColor}" border-width="${p.borderWidth}px" padding="${p.padding}" />`;
    }
    case 'spacer': {
      const p = b.props;
      return `<mj-spacer height="${p.height}px" />`;
    }
    case 'heading': {
      const p = b.props;
      const sizes: Record<number, string> = { 1: '28px', 2: '22px', 3: '18px' };
      const size = sizes[p.level] ?? '22px';
      return `<mj-text align="${p.align}" font-size="${size}" color="${p.color}" padding="${p.padding}" font-weight="700">${p.text}</mj-text>`;
    }
    case 'social': {
      const p = b.props;
      const els = p.links.filter((l: any) => l.href).map((l: any) => {
        const src = l.iconUrl ? ` src="${l.iconUrl}"` : '';
        const fallbackColor = FALLBACK_SOCIAL_COLORS[l.platform as SocialPlatform];
        const bg = fallbackColor ? ` background-color="${fallbackColor}"` : '';
        return `<mj-social-element name="${l.platform}" href="${l.href}"${src}${bg}></mj-social-element>`;
      }).join('\n          ');
      return `<mj-social align="${p.align}" icon-size="${p.iconSize}px" padding="${p.padding}">\n          ${els}\n        </mj-social>`;
    }
    case 'video': {
      const p = b.props;
      return `<mj-image src="${p.thumbnailUrl}" alt="${p.alt}" width="${p.width}px" align="${p.align}" padding="${p.padding}" href="${p.videoUrl}" />`;
    }
    case 'html': {
      const p = b.props;
      return `<mj-raw><div style="padding:${p.padding}">${p.html}</div></mj-raw>`;
    }
    case 'hero': return heroToMjml(b);
    case 'table': {
      const p = b.props;
      const rows = p.rows.map((row: any, ri: number) => {
        const cells = row.cells.map((cell: string) =>
          (ri === 0 && p.hasHeader)
            ? `<th style="font-size: ${p.fontSize}px;border:1px solid ${p.borderColor};padding:8px 12px;background:#f5f5f5;font-weight:600">${cell}</th>`
            : `<td style="font-size: ${p.fontSize}px;border:1px solid ${p.borderColor};padding:8px 12px">${cell}</td>`
        ).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<mj-table align="${p.align}" color="${p.color}" font-size="${p.fontSize}px" padding="${p.padding}" cellpadding="0" cellspacing="0"><table style="border-collapse:collapse;width:100%">${rows}</table></mj-table>`;
    }
    case 'accordion': {
      const p = b.props;
      const els = p.items.map((item: any) =>
        `<mj-accordion-element>
            <mj-accordion-title background-color="${p.titleBg}" color="${p.titleColor}">${item.title}</mj-accordion-title>
            <mj-accordion-text>${item.content}</mj-accordion-text>
          </mj-accordion-element>`
      ).join('\n          ');
      return `<mj-accordion padding="${p.padding}" border="1px solid ${p.borderColor}">\n          ${els}\n        </mj-accordion>`;
    }
    case 'navbar': {
      const p = b.props;
      const links = p.links.map((l: any) =>
        `<mj-navbar-link href="${l.href}" color="${p.color}" font-size="${p.fontSize}px">${l.label}</mj-navbar-link>`
      ).join('\n          ');
      return `<mj-navbar>\n          ${links}\n        </mj-navbar>`;
    }
    case 'carousel': {
      const p = b.props;
      const images = p.images.map((img: any) => {
        const href = img.href ? ` href="${img.href}"` : '';
        return `<mj-carousel-image src="${img.src}" alt="${img.alt}"${href} />`;
      }).join('\n          ');
      return `<mj-carousel padding="${p.padding}" tb-width="${p.thumbnailWidth}px">\n          ${images}\n        </mj-carousel>`;
    }
    default: return '';
  }
}

function heroToMjml(b: Block): string {
  const p = b.props;
  const subtitle = p.subtitle ? `\n      <mj-text align="center" color="${p.subtitleColor}" font-size="16px" padding="0 25px 16px">${p.subtitle}</mj-text>` : '';
  const button = p.buttonLabel ? `\n      <mj-button href="${p.buttonHref}" background-color="${p.buttonBg}" color="${p.buttonColor}" border-radius="${p.buttonBorderRadius ?? 3}px">${p.buttonLabel}</mj-button>` : '';
  return `    <mj-hero mode="fixed-height" height="${p.height}" background-width="${p.backgroundWidth}" background-height="${p.backgroundHeight}" background-url="${p.backgroundUrl}" background-color="${p.backgroundColor}" vertical-align="${p.verticalAlign}" padding="${p.padding}">
      <mj-text align="center" color="${p.titleColor}" font-size="${p.titleSize}px" font-weight="700" padding="0 25px 12px">${p.title}</mj-text>${subtitle}${button}
    </mj-hero>`;
}

function rowToMjml(row: Row): string {
  if (row.columns.length === 1 && row.columns[0].blocks.length === 1 && row.columns[0].blocks[0].type === 'hero') {
    return heroToMjml(row.columns[0].blocks[0]);
  }
  const hasNavbar = row.columns.some(c => c.blocks.some(b => b.type === 'navbar'));
  const fullWidth = hasNavbar ? ' full-width="full-width"' : '';
  const cols = row.columns.map(col => {
    const blocks = col.blocks.map(blockToMjml).join('\n        ');
    const colBg = col.backgroundColor ? ` background-color="${col.backgroundColor}"` : '';
    return `      <mj-column${colBg}>\n        ${blocks}\n      </mj-column>`;
  }).join('\n');
  const bg = row.backgroundColor ? ` background-color="${row.backgroundColor}"` : '';
  return `    <mj-section${bg} padding="${row.padding}"${fullWidth}>\n${cols}\n    </mj-section>`;
}

export function docToMjml(doc: EmailDoc, values?: Record<string, string>, collectionItems?: CollectionItems): string {
  const vals = values ?? defaultVariableValues(doc.variables);
  // Unlike the client, missing collections do NOT fall back to the doc's sample
  // items: this renders real sends, and sample data must never reach a recipient.
  const items = collectionItems ?? {};
  const visibleRows = expandRepeats(doc.rows, items)
    .filter(row => evaluateCondition(row.condition, vals))
    .map(row => ({
      ...row,
      columns: row.columns.map(col => ({ ...col, blocks: col.blocks.filter(b => evaluateCondition(b.condition, vals)) })),
    }));
  const rows = visibleRows.map(row => rowToMjml(row)).join('\n');

  const previewMjml = doc.settings.previewText
    ? `\n    <mj-preview>${doc.settings.previewText}</mj-preview>`
    : '';

  const fontMjml = (doc.settings.googleFontName && doc.settings.googleFontUrl)
    ? `\n    <mj-font name="${doc.settings.googleFontName}" href="${doc.settings.googleFontUrl}" />`
    : '';

  const border = doc.settings.bodyBorderWidth > 0
    ? ` border="${doc.settings.bodyBorderWidth}px ${doc.settings.bodyBorderStyle} ${doc.settings.bodyBorderColor}"`
    : '';

  return `<mjml>
  <mj-head>${fontMjml}
    <mj-attributes>
      <mj-all font-family="${doc.settings.fontFamily}" />
      <mj-body background-color="${doc.settings.backgroundColor}" width="${doc.settings.contentWidth}px" />
    </mj-attributes>${previewMjml}
  </mj-head>
  <mj-body background-color="${doc.settings.backgroundColor}" width="${doc.settings.contentWidth}px">
    <mj-wrapper background-color="${doc.settings.bodyColor}"${border}>
${rows}
    </mj-wrapper>
  </mj-body>
</mjml>`;
}
