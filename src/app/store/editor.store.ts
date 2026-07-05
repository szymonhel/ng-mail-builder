import { Injectable, signal, computed, inject } from '@angular/core';
import { EmailDoc, Block, BlockType, Row, Column, EmailVariable, VisibilityCondition, Locale } from '../models/email-doc.model';
import { UserSettingsService } from '../services/user-settings.service';
import { uid } from '../utils/id.utils';

// Nested array props whose items need a stable id (for translation-key targeting).
// Block creation deep-clones these via cloneBlockProps so every instance gets fresh ids.
const ITEM_ARRAY_FIELDS = ['links', 'rows', 'items', 'images'] as const;

function cloneBlockProps(type: BlockType, overrides: Record<string, unknown> = {}): any {
  const base: any = { ...BLOCK_DEFAULTS[type], ...overrides };
  for (const field of ITEM_ARRAY_FIELDS) {
    if (Array.isArray(base[field])) {
      base[field] = base[field].map((item: any) => ({ ...item, id: uid() }));
    }
  }
  return base;
}

const BLOCK_DEFAULTS: Record<BlockType, any> = {
  text: { html: '<p>Your text here</p>', align: 'left', fontSize: 14, color: '#333333', padding: '10px 25px' },
  image: { src: 'https://placehold.co/600x200', alt: 'Image', width: 600, align: 'center', href: '', padding: '10px 25px' },
  button: { label: 'Click here', href: '#', bg: '#1a73e8', color: '#ffffff', align: 'center', borderRadius: 3, padding: '10px 25px' },
  divider: { borderColor: '#dddddd', borderWidth: 1, padding: '10px 25px' },
  spacer: { height: 20 },
  heading: { text: 'Your Heading', level: 2, align: 'center', color: '#222222', padding: '20px 25px 10px' },
  social: {
    links: [
      { platform: 'facebook',  href: 'https://facebook.com' },
      { platform: 'instagram', href: 'https://instagram.com' },
      { platform: 'twitter',   href: 'https://twitter.com' },
      { platform: 'linkedin',  href: '' },
      { platform: 'youtube',   href: '' },
      { platform: 'tiktok',    href: '' },
      { platform: 'pinterest', href: '' },
      { platform: 'github',    href: '' },
      { platform: 'discord',   href: '' },
      { platform: 'reddit',    href: '' },
      { platform: 'whatsapp',  href: '' },
      { platform: 'telegram',  href: '' },
    ],
    align: 'center',
    iconSize: 32,
    padding: '10px 25px',
  },
  video: { thumbnailUrl: 'https://placehold.co/600x340', videoUrl: 'https://youtube.com', alt: 'Watch video', width: 600, align: 'center', padding: '10px 25px' },
  html: { html: '<p style="margin:0;text-align:center;font-size:12px;color:#999">Custom HTML content</p>', padding: '10px 25px' },
  hero: {
    backgroundUrl: 'https://placehold.co/600x400',
    backgroundColor: '#1a1a2e',
    backgroundWidth: '600px',
    backgroundHeight: '400px',
    height: '400px',
    verticalAlign: 'middle',
    title: 'Welcome to Our Hotel',
    titleColor: '#ffffff',
    titleSize: 32,
    subtitle: 'Experience luxury like never before',
    subtitleColor: '#eeeeee',
    buttonLabel: 'Book Now',
    buttonHref: '#',
    buttonBg: '#1a73e8',
    buttonColor: '#ffffff',
    buttonBorderRadius: 3,
    padding: '40px 25px',
  },
  table: {
    rows: [
      { cells: ['Check-in', 'Check-out', 'Room', 'Total'] },
      { cells: ['15 Jul 2025', '18 Jul 2025', 'Deluxe Suite', '$450'] },
    ],
    hasHeader: true,
    align: 'center',
    color: '#333333',
    fontSize: 14,
    borderColor: '#dddddd',
    padding: '10px 25px',
  },
  accordion: {
    items: [
      { title: 'What time is check-in?', content: 'Check-in is available from 3:00 PM.' },
      { title: 'Is breakfast included?',  content: 'Breakfast is included with all premium bookings.' },
    ],
    borderColor: '#dddddd',
    titleBg: '#f5f5f5',
    titleColor: '#333333',
    padding: '10px 25px',
  },
  navbar: {
    links: [
      { label: 'Website', href: '#' },
      { label: 'Bookings', href: '#' },
      { label: 'Contact', href: '#' },
    ],
    align: 'center',
    backgroundColor: '#ffffff',
    color: '#333333',
    fontSize: 14,
    padding: '10px 25px',
  },
  carousel: {
    images: [
      { src: 'https://placehold.co/600x400/1a73e8/ffffff?text=Slide+1', alt: 'Slide 1', href: '' },
      { src: 'https://placehold.co/600x400/e8341a/ffffff?text=Slide+2', alt: 'Slide 2', href: '' },
      { src: 'https://placehold.co/600x400/1ae87a/ffffff?text=Slide+3', alt: 'Slide 3', href: '' },
    ],
    thumbnailWidth: 100,
    padding: '0px',
  },
};

function initialDoc(): EmailDoc {
  return {
    version: 2,
    settings: { contentWidth: 600, backgroundColor: '#f4f4f4', bodyColor: '#ffffff', bodyBorderWidth: 0, bodyBorderColor: '#dddddd', bodyBorderStyle: 'solid', fontFamily: 'Arial, sans-serif', previewText: '', googleFontName: '', googleFontUrl: '' },
    variables: [],
    locales: [],
    translations: {},
    rows: [
      {
        id: uid(),
        backgroundColor: null,
        padding: '0px',
        columns: [{
          id: uid(),
          blocks: [
            { id: uid(), type: 'image', props: { src: 'https://placehold.co/600x120', alt: 'Header', width: 600, align: 'center', href: '', padding: '0px' } },
            { id: uid(), type: 'text', props: { html: '<h1 style="margin:0">Welcome!</h1>', align: 'center', fontSize: 24, color: '#333333', padding: '20px 25px 10px' } },
            { id: uid(), type: 'button', props: { label: 'Book now', href: '#', bg: '#1a73e8', color: '#ffffff', align: 'center', borderRadius: 3, padding: '20px 25px' } },
          ]
        }]
      }
    ]
  };
}

// Rapid-fire edits (e.g. dragging the native color input, which fires on every tick)
// land within this window of each other and are coalesced into a single undo step.
const HISTORY_COALESCE_MS = 400;
const HISTORY_LIMIT = 100;

@Injectable({ providedIn: 'root' })
export class EditorStore {
  private userSettings = inject(UserSettingsService);
  private _doc = signal<EmailDoc>(initialDoc());

  // Account-level style defaults applied on top of BLOCK_DEFAULTS when a new
  // block is created; existing blocks are never touched.
  private userDefaultsFor(type: BlockType): Record<string, unknown> {
    const btn = this.userSettings.buttonDefaults();
    switch (type) {
      case 'button': return { bg: btn.bg, color: btn.color, borderRadius: btn.borderRadius };
      case 'hero': return { buttonBg: btn.bg, buttonColor: btn.color, buttonBorderRadius: btn.borderRadius };
      default: return {};
    }
  }

  // Section presets carry fully-styled blocks; restyle their buttons with the
  // account defaults so presets match individually added blocks.
  private applyUserDefaultsToRow(row: Row): Row {
    return {
      ...row,
      columns: row.columns.map(c => ({
        ...c,
        blocks: c.blocks.map(b => {
          const overrides = this.userDefaultsFor(b.type);
          return Object.keys(overrides).length ? { ...b, props: { ...b.props, ...overrides } as Block['props'] } : b;
        }),
      })),
    };
  }
  private _selectedBlockId = signal<string | null>(null);
  private _selectedRowId = signal<string | null>(null);
  private _selectedColumnId = signal<string | null>(null);
  private _activeTab = signal<'editor' | 'preview' | 'json' | 'settings' | 'translations' | 'assets'>('editor');

  private _past = signal<EmailDoc[]>([]);
  private _future = signal<EmailDoc[]>([]);
  private _lastCommitAt = 0;

  doc = this._doc.asReadonly();
  selectedBlockId = this._selectedBlockId.asReadonly();
  selectedRowId = this._selectedRowId.asReadonly();
  selectedColumnId = this._selectedColumnId.asReadonly();
  activeTab = this._activeTab.asReadonly();
  canUndo = computed(() => this._past().length > 0);
  canRedo = computed(() => this._future().length > 0);

  selectedBlock = computed(() => {
    const id = this._selectedBlockId();
    if (!id) return null;
    for (const row of this._doc().rows) {
      for (const col of row.columns) {
        const block = col.blocks.find(b => b.id === id);
        if (block) return block;
      }
    }
    return null;
  });

  // All doc mutations funnel through here so undo/redo has a single choke point.
  private commit(updater: (doc: EmailDoc) => EmailDoc) {
    const prev = this._doc();
    const next = updater(prev);
    if (next === prev) return;

    const now = Date.now();
    if (now - this._lastCommitAt > HISTORY_COALESCE_MS) {
      this._past.update(p => {
        const grown = [...p, prev];
        return grown.length > HISTORY_LIMIT ? grown.slice(grown.length - HISTORY_LIMIT) : grown;
      });
      this._future.set([]);
    }
    this._lastCommitAt = now;
    this._doc.set(next);
  }

  undo() {
    const past = this._past();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    this._past.set(past.slice(0, -1));
    this._future.update(f => [this._doc(), ...f]);
    this._doc.set(previous);
    this._lastCommitAt = 0;
    this.clearSelection();
  }

  redo() {
    const future = this._future();
    if (future.length === 0) return;
    const next = future[0];
    this._future.set(future.slice(1));
    this._past.update(p => [...p, this._doc()]);
    this._doc.set(next);
    this._lastCommitAt = 0;
    this.clearSelection();
  }

  private clearSelection() {
    this._selectedBlockId.set(null);
    this._selectedRowId.set(null);
    this._selectedColumnId.set(null);
  }

  setActiveTab(tab: 'editor' | 'preview' | 'json' | 'settings' | 'translations' | 'assets') { this._activeTab.set(tab); }
  selectBlock(id: string | null) {
    this._selectedBlockId.set(id);
    if (id) this._selectedColumnId.set(null);
  }
  selectRow(id: string | null) {
    this._selectedRowId.set(id);
    this._selectedColumnId.set(null);
  }
  selectColumn(rowId: string, colId: string | null) {
    this._selectedRowId.set(rowId);
    this._selectedColumnId.set(colId);
    this._selectedBlockId.set(null);
  }

  addRow() {
    const row: Row = { id: uid(), backgroundColor: null, padding: '0px', columns: [{ id: uid(), blocks: [] }] };
    this.commit(d => ({ ...d, rows: [...d.rows, row] }));
  }

  addPresetRow(presetRow: Row) {
    const row = this.applyUserDefaultsToRow(presetRow);
    this.commit(d => ({ ...d, rows: [...d.rows, row] }));
    this._selectedRowId.set(row.id);
  }

  insertPresetRowAt(index: number, presetRow: Row) {
    const row = this.applyUserDefaultsToRow(presetRow);
    this.commit(d => {
      const rows = [...d.rows];
      rows.splice(index, 0, row);
      return { ...d, rows };
    });
    this._selectedRowId.set(row.id);
  }

  addColumn(rowId: string) {
    const row = this._doc().rows.find(r => r.id === rowId);
    if (!row) return;
    this.commit(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : {
        ...r,
        columns: [...r.columns, { id: uid(), blocks: [] }]
      })
    }));
  }

  removeColumn(rowId: string, colId: string) {
    this.commit(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : {
        ...r,
        columns: r.columns.filter(c => c.id !== colId)
      })
    }));
  }

  removeRow(rowId: string) {
    this.commit(d => ({ ...d, rows: d.rows.filter(r => r.id !== rowId) }));
    if (this._selectedRowId() === rowId) this._selectedRowId.set(null);
  }

  addBlock(rowId: string, type: BlockType) {
    const row = this._doc().rows.find(r => r.id === rowId);
    const col = row?.columns[0];
    if (!row || !col) return;
    const block: Block = { id: uid(), type, props: cloneBlockProps(type, this.userDefaultsFor(type)) };
    this.commit(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : {
        ...r,
        columns: r.columns.map((c, i) => i === 0 ? { ...c, blocks: [...c.blocks, block] } : c)
      })
    }));
    this._selectedBlockId.set(block.id);
  }

  addBlockAt(rowId: string, colId: string, type: BlockType, index: number) {
    const row = this._doc().rows.find(r => r.id === rowId);
    const col = row?.columns.find(c => c.id === colId);
    if (!row || !col) return;
    const block: Block = { id: uid(), type, props: cloneBlockProps(type, this.userDefaultsFor(type)) };
    const nextBlocks = [...col.blocks.slice(0, index), block, ...col.blocks.slice(index)];
    this.commit(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : {
        ...r,
        columns: r.columns.map(c => c.id !== colId ? c : { ...c, blocks: nextBlocks })
      })
    }));
    this._selectedBlockId.set(block.id);
  }

  removeBlock(blockId: string) {
    this.commit(d => ({
      ...d,
      rows: d.rows.map(r => ({
        ...r,
        columns: r.columns.map(c => ({ ...c, blocks: c.blocks.filter(b => b.id !== blockId) }))
      }))
    }));
    if (this._selectedBlockId() === blockId) this._selectedBlockId.set(null);
    this.pruneTranslationsForItem(blockId);
  }

  updateBlockProps(blockId: string, props: Partial<any>) {
    this.commit(d => ({
      ...d,
      rows: d.rows.map(r => ({
        ...r,
        columns: r.columns.map(c => ({
          ...c,
          blocks: c.blocks.map(b => b.id !== blockId ? b : { ...b, props: { ...b.props, ...props } })
        }))
      }))
    }));
  }

  updateRowStyle(rowId: string, props: Partial<Pick<Row, 'backgroundColor' | 'padding'>>) {
    this.commit(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : { ...r, ...props })
    }));
  }

  updateRowCondition(rowId: string, condition: VisibilityCondition | null) {
    this.commit(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : { ...r, condition })
    }));
  }

  updateBlockCondition(blockId: string, condition: VisibilityCondition | null) {
    this.commit(d => ({
      ...d,
      rows: d.rows.map(r => ({
        ...r,
        columns: r.columns.map(c => ({
          ...c,
          blocks: c.blocks.map(b => b.id !== blockId ? b : { ...b, condition })
        }))
      }))
    }));
  }

  updateColumnStyle(rowId: string, colId: string, props: Partial<Pick<Column, 'backgroundColor'>>) {
    this.commit(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : {
        ...r,
        columns: r.columns.map(c => c.id !== colId ? c : { ...c, ...props })
      })
    }));
  }

  updateSettings(settings: Partial<EmailDoc['settings']>) {
    this.commit(d => ({ ...d, settings: { ...d.settings, ...settings } }));
  }

  addVariable(name: string, defaultValue: string) {
    const variable: EmailVariable = { id: uid(), name, defaultValue };
    this.commit(d => ({ ...d, variables: [...d.variables, variable] }));
  }

  updateVariable(id: string, props: Partial<Pick<EmailVariable, 'name' | 'defaultValue'>>) {
    this.commit(d => ({
      ...d,
      variables: d.variables.map(v => v.id !== id ? v : { ...v, ...props })
    }));
  }

  removeVariable(id: string) {
    this.commit(d => ({ ...d, variables: d.variables.filter(v => v.id !== id) }));
  }

  addLocale(code: string, label: string) {
    const locale: Locale = { id: uid(), code, label };
    this.commit(d => ({
      ...d,
      locales: [...d.locales, locale],
      translations: { ...d.translations, [locale.id]: {} },
    }));
  }

  updateLocale(id: string, props: Partial<Pick<Locale, 'code' | 'label'>>) {
    this.commit(d => ({
      ...d,
      locales: d.locales.map(l => l.id !== id ? l : { ...l, ...props })
    }));
  }

  removeLocale(id: string) {
    this.commit(d => {
      if (!(id in d.translations) && !d.locales.some(l => l.id === id)) return d;
      const { [id]: _removed, ...restTranslations } = d.translations;
      return { ...d, locales: d.locales.filter(l => l.id !== id), translations: restTranslations };
    });
  }

  // '' clears the override so the field falls back to its source value, mirroring
  // how an unset custom variable falls back to leaving its {{token}} untouched.
  setTranslation(localeId: string, fieldKey: string, value: string) {
    this.commit(d => {
      const map = d.translations[localeId] ?? {};
      if (value === '') {
        if (!(fieldKey in map)) return d;
        const { [fieldKey]: _dropped, ...rest } = map;
        return { ...d, translations: { ...d.translations, [localeId]: rest } };
      }
      if (map[fieldKey] === value) return d;
      return { ...d, translations: { ...d.translations, [localeId]: { ...map, [fieldKey]: value } } };
    });
  }

  clearTranslation(localeId: string, fieldKey: string) {
    this.setTranslation(localeId, fieldKey, '');
  }

  // Strips every translation key (across all locales) scoped under blockId[:itemId],
  // so deleting a block/row-item/table-row doesn't leave orphaned translation data
  // that could later be silently misattributed to a different item reusing the slot.
  pruneTranslationsForItem(blockId: string, itemId?: string) {
    const prefix = itemId ? `${blockId}:${itemId}:` : `${blockId}:`;
    this.commit(d => {
      let changed = false;
      const nextTranslations: Record<string, Record<string, string>> = {};
      for (const [localeId, map] of Object.entries(d.translations)) {
        const nextMap: Record<string, string> = {};
        let localeChanged = false;
        for (const [key, val] of Object.entries(map)) {
          if (key.startsWith(prefix)) { localeChanged = true; changed = true; continue; }
          nextMap[key] = val;
        }
        nextTranslations[localeId] = localeChanged ? nextMap : map;
      }
      return changed ? { ...d, translations: nextTranslations } : d;
    });
  }

  setRows(rows: Row[]) {
    this.commit(d => ({ ...d, rows }));
  }

  // Replaces the whole document (e.g. from an imported JSON/MJML file). Goes through the
  // normal commit path so the previous doc is still one undo away.
  loadDoc(doc: EmailDoc) {
    this.commit(() => doc);
    this.clearSelection();
    this._activeTab.set('editor');
  }

  setBlocksInColumn(rowId: string, colId: string, blocks: Block[]) {
    const row = this._doc().rows.find(r => r.id === rowId);
    if (!row) return;
    this.commit(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : {
        ...r,
        columns: r.columns.map(c => c.id !== colId ? c : { ...c, blocks })
      })
    }));
  }

  // Atomic version of two setBlocksInColumn calls, used when dragging a block between
  // columns: applying both updates together avoids losing the block if it were removed
  // from the source before the target update landed.
  moveBlockAcrossColumns(sourceRowId: string, sourceColId: string, sourceBlocks: Block[], targetRowId: string, targetColId: string, targetBlocks: Block[]) {
    const targetRow = this._doc().rows.find(r => r.id === targetRowId);
    if (!targetRow) return;
    this.commit(d => ({
      ...d,
      rows: d.rows.map(r => {
        if (r.id !== sourceRowId && r.id !== targetRowId) return r;
        return {
          ...r,
          columns: r.columns.map(c => {
            if (c.id === sourceColId) return { ...c, blocks: sourceBlocks };
            if (c.id === targetColId) return { ...c, blocks: targetBlocks };
            return c;
          })
        };
      })
    }));
  }

  moveRow(fromIndex: number, toIndex: number) {
    this.commit(d => {
      const rows = [...d.rows];
      const [moved] = rows.splice(fromIndex, 1);
      rows.splice(toIndex, 0, moved);
      return { ...d, rows };
    });
  }
}
