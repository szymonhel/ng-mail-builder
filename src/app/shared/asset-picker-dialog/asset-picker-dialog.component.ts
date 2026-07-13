import { Component, inject, output, signal } from '@angular/core';
import { AssetsService, Asset } from '../../services/assets.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { HlmButton } from '@spartan-ng/helm/button';

// Modal asset library: pick an existing upload or upload a new image, which is
// then selected immediately. Emits the chosen asset; the caller takes its URL.
@Component({
  selector: 'app-asset-picker-dialog',
  standalone: true,
  imports: [HlmButton],
  templateUrl: './asset-picker-dialog.component.html',
})
export class AssetPickerDialogComponent {
  private assetsService = inject(AssetsService);
  private workspace = inject(WorkspaceContextService);

  closed = output<void>();
  selected = output<Asset>();

  assets = signal<Asset[]>([]);
  loading = signal(false);
  uploading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.loading.set(true);
    this.assetsService.list(this.workspace.categoryId()).subscribe({
      next: assets => {
        this.assets.set(assets);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? 'Failed to load assets.');
      },
    });
  }

  pick(asset: Asset) {
    this.selected.emit(asset);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.error.set(null);
    this.uploading.set(true);
    this.assetsService.upload(file, this.workspace.categoryId()).subscribe({
      next: asset => {
        this.uploading.set(false);
        this.selected.emit(asset);
      },
      error: err => {
        this.uploading.set(false);
        this.error.set(err?.error?.error ?? 'Upload failed.');
      },
    });
  }

  // Blob names look like "<userId>/<uuid>-original-name.png"; show only the original name.
  displayName(asset: Asset): string {
    const base = asset.name.split('/').pop() ?? asset.name;
    return base.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, '');
  }

  formatSize(bytes?: number): string {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
