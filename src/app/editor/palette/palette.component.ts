import { Component, inject, computed, signal, effect } from '@angular/core';
import { CdkDrag, CdkDropList, CdkDragPreview, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { EditorStore } from '../../store/editor.store';
import { DropListsService, PALETTE_LIST_ID, SECTIONS_LIST_ID, CANVAS_ROWS_LIST_ID } from '../drop-lists.service';
import { Block, BlockType, Row } from '../../models/email-doc.model';
import { SectionPreset, SECTION_PRESETS } from '../presets/section-presets';
import { BlockPresetsService } from '../../services/block-presets.service';
import { BlockPreset } from '../../models/block-preset.model';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent } from '@spartan-ng/helm/tabs';
import { NgIcon } from '@ng-icons/core';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';

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
  imports: [CdkDrag, CdkDropList, CdkDragPreview, CdkDragPlaceholder, FormsModule, HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent, NgIcon, SpinnerComponent],
  templateUrl: './palette.component.html'
})
export class PaletteComponent {
  store = inject(EditorStore);
  dropListsService = inject(DropListsService);
  private blockPresetsService = inject(BlockPresetsService);
  private workspace = inject(WorkspaceContextService);

  readonly paletteListId = PALETTE_LIST_ID;
  readonly sectionsListId = SECTIONS_LIST_ID;
  readonly canvasRowsListId = CANVAS_ROWS_LIST_ID;
  readonly items = PALETTE_ITEMS;
  readonly sections = SECTION_PRESETS;

  userPresets = signal<BlockPreset[]>([]);
  userPresetsLoading = signal(false);
  userPresetsError = signal<string | null>(null);

  connectedTo = computed(() => this.dropListsService.columnIds());

  constructor() {
    // Refetch whenever the open email's category changes (kept in sync by the editor
    // shell), or a preset is created/updated/deleted anywhere (e.g. the save dialog,
    // which isn't otherwise connected to this component) so the list always matches
    // what's available to the current email.
    effect(() => {
      const categoryId = this.workspace.categoryId();
      this.blockPresetsService.changed();
      this.userPresetsLoading.set(true);
      this.userPresetsError.set(null);
      this.blockPresetsService.list(categoryId).subscribe({
        next: presets => {
          this.userPresetsLoading.set(false);
          this.userPresets.set(presets);
        },
        error: err => {
          this.userPresetsLoading.set(false);
          this.userPresetsError.set(err?.error?.error ?? 'Failed to load presets.');
        },
      });
    });
  }

  private targetRowId(): string {
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
    return targetRowId;
  }

  addBlock(type: BlockType) {
    this.store.addBlock(this.targetRowId(), type);
  }

  addSection(preset: SectionPreset) {
    this.store.addPresetRow(preset.build());
  }

  usePreset(preset: BlockPreset) {
    if (preset.kind === 'row') {
      this.store.addUserPresetRow(preset.payload as Row);
    } else {
      this.store.addUserPresetBlock(this.targetRowId(), preset.payload as Block);
    }
  }

  deletePreset(preset: BlockPreset, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm(`Delete preset "${preset.name}"? This cannot be undone.`)) return;
    this.blockPresetsService.delete(preset.id).subscribe({
      next: () => this.userPresets.update(list => list.filter(p => p.id !== preset.id)),
      error: err => this.userPresetsError.set(err?.error?.error ?? 'Failed to delete preset.'),
    });
  }
}
