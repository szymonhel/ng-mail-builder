import { Component, inject, signal } from '@angular/core';
import { AssetsService, Asset } from '../../services/assets.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { HlmButton } from '@spartan-ng/helm/button';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';

@Component({
  selector: 'app-assets-tab',
  standalone: true,
  imports: [HlmButton, SpinnerComponent],
  templateUrl: './assets-tab.component.html',
})
export class AssetsTabComponent {
  private assetsService = inject(AssetsService);
  // Scopes uploads/listings to the active category (shared by all its emails);
  // null means the account-wide pool.
  workspace = inject(WorkspaceContextService);

  assets = signal<Asset[]>([]);
  loading = signal(false);
  uploading = signal(false);
  error = signal<string | null>(null);
  copiedUrl = signal<string | null>(null);
  dragOver = signal(false);

  constructor() {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.error.set(null);
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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    this.uploadFiles(files);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave() {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
    const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
    this.uploadFiles(files.filter(f => f.type.startsWith('image/')));
  }

  private uploadFiles(files: File[]) {
    if (files.length === 0) return;
    this.error.set(null);
    this.uploading.set(true);

    let remaining = files.length;
    for (const file of files) {
      this.assetsService.upload(file, this.workspace.categoryId()).subscribe({
        next: asset => {
          this.assets.update(list => [asset, ...list]);
          if (--remaining === 0) this.uploading.set(false);
        },
        error: err => {
          this.error.set(err?.error?.error ?? `Failed to upload ${file.name}.`);
          if (--remaining === 0) this.uploading.set(false);
        },
      });
    }
  }

  copyUrl(asset: Asset) {
    navigator.clipboard.writeText(asset.url);
    this.copiedUrl.set(asset.url);
    setTimeout(() => {
      if (this.copiedUrl() === asset.url) this.copiedUrl.set(null);
    }, 1500);
  }

  delete(asset: Asset) {
    if (!confirm(`Delete "${this.displayName(asset)}"? Emails already using this image will break.`)) return;
    this.assetsService.delete(asset.name).subscribe({
      next: () => this.assets.update(list => list.filter(a => a.name !== asset.name)),
      error: err => this.error.set(err?.error?.error ?? 'Failed to delete asset.'),
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
