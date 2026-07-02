import { Component, inject, computed } from '@angular/core';
import { CdkDrag, CdkDropList, CdkDragPreview, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { EditorStore } from '../../store/editor.store';
import { DropListsService, PALETTE_LIST_ID, SECTIONS_LIST_ID, CANVAS_ROWS_LIST_ID } from '../drop-lists.service';
import { BlockType } from '../../models/email-doc.model';
import { SectionPreset, SECTION_PRESETS } from '../presets/section-presets';
import { HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent } from '@spartan-ng/helm/tabs';
import { NgIcon } from '@ng-icons/core';

export interface PaletteItem {
  type: BlockType;
  icon: string;
  label: string;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'text',      icon: 'lucideType',              label: 'Text'      },
  { type: 'image',     icon: 'lucideImage',              label: 'Image'     },
  { type: 'button',    icon: 'lucideRectangleHorizontal', label: 'Button'    },
  { type: 'divider',   icon: 'lucideMinus',               label: 'Divider'   },
  { type: 'spacer',    icon: 'lucideArrowUpDown',         label: 'Spacer'    },
  { type: 'heading',   icon: 'lucideHeading',             label: 'Heading'   },
  { type: 'social',    icon: 'lucideLink',                label: 'Social'    },
  { type: 'video',     icon: 'lucideVideo',               label: 'Video'     },
  { type: 'html',      icon: 'lucideCode2',               label: 'HTML'      },
  { type: 'hero',      icon: 'lucideSunrise',             label: 'Hero'      },
  { type: 'table',     icon: 'lucideTable',               label: 'Table'     },
  { type: 'accordion', icon: 'lucideRows3',               label: 'Accordion' },
  { type: 'navbar',    icon: 'lucideMenu',                label: 'Navbar'    },
  { type: 'carousel',  icon: 'lucideGalleryHorizontal',   label: 'Carousel'  },
];

@Component({
  selector: 'app-palette',
  standalone: true,
  imports: [CdkDrag, CdkDropList, CdkDragPreview, CdkDragPlaceholder, FormsModule, HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent, NgIcon],
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
