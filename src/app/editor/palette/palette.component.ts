import { Component, inject, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { CdkDrag, CdkDropList, CdkDragPreview, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { EditorStore } from '../../store/editor.store';
import { DropListsService, PALETTE_LIST_ID, SECTIONS_LIST_ID, CANVAS_ROWS_LIST_ID } from '../drop-lists.service';
import { BlockType } from '../../models/email-doc.model';
import { ColorPickerComponent } from '../../shared/color-picker/color-picker.component';
import { SectionPreset, SECTION_PRESETS } from '../presets/section-presets';

export interface PaletteItem {
  type: BlockType;
  icon: string;
  label: string;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'text',    icon: 'T',  label: 'Text'    },
  { type: 'image',   icon: '🖼', label: 'Image'   },
  { type: 'button',  icon: '⬚',  label: 'Button'  },
  { type: 'divider', icon: '—',  label: 'Divider' },
  { type: 'spacer',  icon: '↕',  label: 'Spacer'  },
  { type: 'heading', icon: 'H',  label: 'Heading' },
  { type: 'social',  icon: '🔗', label: 'Social'  },
  { type: 'video',   icon: '▶',  label: 'Video'   },
  { type: 'html',      icon: '<>',  label: 'HTML'      },
  { type: 'hero',      icon: '🌅', label: 'Hero'      },
  { type: 'table',     icon: '⊞',  label: 'Table'     },
  { type: 'accordion', icon: '≡',  label: 'Accordion' },
  { type: 'navbar',    icon: '☰',  label: 'Navbar'    },
  { type: 'carousel',  icon: '⟳',  label: 'Carousel'  },
];

@Component({
  selector: 'app-palette',
  standalone: true,
  imports: [NgClass, CdkDrag, CdkDropList, CdkDragPreview, CdkDragPlaceholder, FormsModule, ColorPickerComponent],
  templateUrl: './palette.component.html'
})
export class PaletteComponent {
  store = inject(EditorStore);
  dropListsService = inject(DropListsService);

  readonly paletteListId = PALETTE_LIST_ID;
  readonly sectionsListId = SECTIONS_LIST_ID;
  readonly canvasRowsListId = CANVAS_ROWS_LIST_ID;
  readonly items = PALETTE_ITEMS;
  readonly sections = SECTION_PRESETS;
  activeTab = signal<'blocks' | 'sections' | 'settings'>('blocks');

  connectedTo = computed(() => this.dropListsService.columnIds());

  addBlock(type: BlockType) {
    const rows = this.store.doc().rows;
    let targetRowId = this.store.selectedRowId();
    if (!targetRowId) {
      if (rows.length === 0) {
        this.store.addRow();
        targetRowId = this.store.doc().rows[0].id;
      } else {
        targetRowId = rows[rows.length - 1].id;
      }
    }
    this.store.addBlock(targetRowId, type);
  }

  addSection(preset: SectionPreset) {
    this.store.addPresetRow(preset.build());
  }
}
