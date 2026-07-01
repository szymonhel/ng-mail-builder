import { Injectable, signal, computed } from '@angular/core';
import { EmailDoc, Block, BlockType, Row, Column } from '../models/email-doc.model';
import { uid } from '../utils/id.utils';

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
    version: 1,
    settings: { contentWidth: 600, backgroundColor: '#f4f4f4', bodyColor: '#ffffff', fontFamily: 'Arial, sans-serif', previewText: '', googleFontName: '', googleFontUrl: '' },
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

@Injectable({ providedIn: 'root' })
export class EditorStore {
  private _doc = signal<EmailDoc>(initialDoc());
  private _selectedBlockId = signal<string | null>(null);
  private _selectedRowId = signal<string | null>(null);
  private _activeTab = signal<'editor' | 'preview' | 'json' | 'colors'>('editor');

  doc = this._doc.asReadonly();
  selectedBlockId = this._selectedBlockId.asReadonly();
  selectedRowId = this._selectedRowId.asReadonly();
  activeTab = this._activeTab.asReadonly();

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

  setActiveTab(tab: 'editor' | 'preview' | 'json' | 'colors') { this._activeTab.set(tab); }
  selectBlock(id: string | null) { this._selectedBlockId.set(id); }
  selectRow(id: string | null) { this._selectedRowId.set(id); }

  addRow() {
    const row: Row = { id: uid(), backgroundColor: null, padding: '0px', columns: [{ id: uid(), blocks: [] }] };
    this._doc.update(d => ({ ...d, rows: [...d.rows, row] }));
  }

  addColumn(rowId: string) {
    const row = this._doc().rows.find(r => r.id === rowId);
    if (!row || row.columns.some(c => c.blocks.some(b => b.type === 'hero'))) return;
    this._doc.update(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : {
        ...r,
        columns: [...r.columns, { id: uid(), blocks: [] }]
      })
    }));
  }

  // mj-hero must be the sole block in the sole column of its row (see mjml-mapper.ts rowToMjml)
  private canPlaceInColumn(row: Row, blocks: Block[]): boolean {
    if (!blocks.some(b => b.type === 'hero')) return true;
    return blocks.length === 1 && row.columns.length === 1;
  }

  // Fallback for when a block can't join its intended row (most commonly: hero can't share
  // a row with other content) — give it a fresh row right after the intended spot instead of
  // silently dropping the add.
  private insertRowAfter(afterRowId: string, block: Block) {
    const row: Row = { id: uid(), backgroundColor: null, padding: '0px', columns: [{ id: uid(), blocks: [block] }] };
    this._doc.update(d => {
      const idx = d.rows.findIndex(r => r.id === afterRowId);
      const rows = [...d.rows];
      rows.splice(idx + 1, 0, row);
      return { ...d, rows };
    });
    this._selectedRowId.set(row.id);
    this._selectedBlockId.set(block.id);
  }

  removeColumn(rowId: string, colId: string) {
    this._doc.update(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : {
        ...r,
        columns: r.columns.filter(c => c.id !== colId)
      })
    }));
  }

  removeRow(rowId: string) {
    this._doc.update(d => ({ ...d, rows: d.rows.filter(r => r.id !== rowId) }));
    if (this._selectedRowId() === rowId) this._selectedRowId.set(null);
  }

  addBlock(rowId: string, type: BlockType) {
    const row = this._doc().rows.find(r => r.id === rowId);
    const col = row?.columns[0];
    if (!row || !col) return;
    const block: Block = { id: uid(), type, props: { ...BLOCK_DEFAULTS[type] } };
    if (!this.canPlaceInColumn(row, [...col.blocks, block])) {
      this.insertRowAfter(rowId, block);
      return;
    }
    this._doc.update(d => ({
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
    const block: Block = { id: uid(), type, props: { ...BLOCK_DEFAULTS[type] } };
    const nextBlocks = [...col.blocks.slice(0, index), block, ...col.blocks.slice(index)];
    if (!this.canPlaceInColumn(row, nextBlocks)) {
      this.insertRowAfter(rowId, block);
      return;
    }
    this._doc.update(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : {
        ...r,
        columns: r.columns.map(c => c.id !== colId ? c : { ...c, blocks: nextBlocks })
      })
    }));
    this._selectedBlockId.set(block.id);
  }

  removeBlock(blockId: string) {
    this._doc.update(d => ({
      ...d,
      rows: d.rows.map(r => ({
        ...r,
        columns: r.columns.map(c => ({ ...c, blocks: c.blocks.filter(b => b.id !== blockId) }))
      }))
    }));
    if (this._selectedBlockId() === blockId) this._selectedBlockId.set(null);
  }

  updateBlockProps(blockId: string, props: Partial<any>) {
    this._doc.update(d => ({
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
    this._doc.update(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : { ...r, ...props })
    }));
  }

  updateSettings(settings: Partial<EmailDoc['settings']>) {
    this._doc.update(d => ({ ...d, settings: { ...d.settings, ...settings } }));
  }

  setRows(rows: Row[]) {
    this._doc.update(d => ({ ...d, rows }));
  }

  setBlocksInColumn(rowId: string, colId: string, blocks: Block[]) {
    const row = this._doc().rows.find(r => r.id === rowId);
    if (!row || !this.canPlaceInColumn(row, blocks)) return;
    this._doc.update(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : {
        ...r,
        columns: r.columns.map(c => c.id !== colId ? c : { ...c, blocks })
      })
    }));
  }

  // Atomic version of two setBlocksInColumn calls, used when dragging a block between
  // columns: validating only the target and applying both updates together avoids losing
  // the block if it were removed from the source before the target rejected it.
  moveBlockAcrossColumns(sourceRowId: string, sourceColId: string, sourceBlocks: Block[], targetRowId: string, targetColId: string, targetBlocks: Block[]) {
    const targetRow = this._doc().rows.find(r => r.id === targetRowId);
    if (!targetRow || !this.canPlaceInColumn(targetRow, targetBlocks)) return;
    this._doc.update(d => ({
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
    this._doc.update(d => {
      const rows = [...d.rows];
      const [moved] = rows.splice(fromIndex, 1);
      rows.splice(toIndex, 0, moved);
      return { ...d, rows };
    });
  }
}
