import { Injectable, signal, computed } from '@angular/core';
import { EmailDoc, Block, BlockType, Row, Column } from '../models/email-doc.model';
import { uid } from '../utils/id.utils';

const BLOCK_DEFAULTS: Record<BlockType, any> = {
  text: { html: '<p>Your text here</p>', align: 'left', fontSize: 14, color: '#333333', padding: '10px 25px' },
  image: { src: 'https://placehold.co/600x200', alt: 'Image', width: 600, align: 'center', href: '', padding: '10px 25px' },
  button: { label: 'Click here', href: '#', bg: '#1a73e8', color: '#ffffff', align: 'center', borderRadius: 3, padding: '10px 25px' },
  divider: { borderColor: '#dddddd', borderWidth: 1, padding: '10px 25px' },
  spacer: { height: 20 },
};

function initialDoc(): EmailDoc {
  return {
    version: 1,
    settings: { contentWidth: 600, backgroundColor: '#f4f4f4', bodyColor: '#ffffff', fontFamily: 'Arial, sans-serif' },
    rows: [
      {
        id: uid(),
        backgroundColor: '#ffffff',
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
  private _activeTab = signal<'editor' | 'preview' | 'json'>('editor');

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

  setActiveTab(tab: 'editor' | 'preview' | 'json') { this._activeTab.set(tab); }
  selectBlock(id: string | null) { this._selectedBlockId.set(id); }
  selectRow(id: string | null) { this._selectedRowId.set(id); }

  addRow() {
    const row: Row = { id: uid(), backgroundColor: '#ffffff', padding: '0px', columns: [{ id: uid(), blocks: [] }] };
    this._doc.update(d => ({ ...d, rows: [...d.rows, row] }));
  }

  removeRow(rowId: string) {
    this._doc.update(d => ({ ...d, rows: d.rows.filter(r => r.id !== rowId) }));
    if (this._selectedRowId() === rowId) this._selectedRowId.set(null);
  }

  addBlock(rowId: string, type: BlockType) {
    const block: Block = { id: uid(), type, props: { ...BLOCK_DEFAULTS[type] } };
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
    const block: Block = { id: uid(), type, props: { ...BLOCK_DEFAULTS[type] } };
    this._doc.update(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : {
        ...r,
        columns: r.columns.map(c => c.id !== colId ? c : {
          ...c,
          blocks: [...c.blocks.slice(0, index), block, ...c.blocks.slice(index)]
        })
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
    this._doc.update(d => ({
      ...d,
      rows: d.rows.map(r => r.id !== rowId ? r : {
        ...r,
        columns: r.columns.map(c => c.id !== colId ? c : { ...c, blocks })
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
