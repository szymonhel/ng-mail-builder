import { Component, inject, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorStore, PresetSaveRequest } from '../../store/editor.store';
import { BlockPresetsService } from '../../services/block-presets.service';
import { BlockPreset } from '../../models/block-preset.model';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmButton } from '@spartan-ng/helm/button';

// Names and (optionally) scopes a row/block preset before saving it. Scope only
// matters when the open email belongs to a category — otherwise every preset is
// personal by definition, so the toggle stays hidden.
@Component({
  selector: 'app-save-preset-dialog',
  standalone: true,
  imports: [FormsModule, HlmInput, HlmButton],
  templateUrl: './save-preset-dialog.component.html',
})
export class SavePresetDialogComponent {
  private store = inject(EditorStore);
  private blockPresets = inject(BlockPresetsService);

  request = input.required<PresetSaveRequest>();
  categoryId = input<string | null>(null);

  closed = output<void>();
  saved = output<BlockPreset>();

  name = '';
  scope: 'category' | 'personal' = 'category';
  saving = signal(false);
  error = signal<string | null>(null);

  categoryName = computed(() => this.store.category()?.name ?? null);

  save() {
    const name = this.name.trim();
    if (!name) return;

    const req = this.request();
    const payload = req.kind === 'row' ? req.row : req.block;
    const categoryId = this.categoryName() && this.scope === 'category' ? this.categoryId() : null;

    this.saving.set(true);
    this.error.set(null);
    this.blockPresets.create(name, req.kind, payload, categoryId).subscribe({
      next: preset => {
        this.saving.set(false);
        this.saved.emit(preset);
        this.closed.emit();
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Failed to save preset.');
      },
    });
  }
}
