import { Component, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { EditorStore } from '../../store/editor.store';
import { TemplateVersionsService, TemplateVersionMeta } from '../../services/template-versions.service';
import { EmailDoc } from '../../models/email-doc.model';
import { HlmButton } from '@spartan-ng/helm/button';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';
import { DocPreviewComponent } from '../doc-preview/doc-preview.component';

// 'current' is a sentinel meaning "the live in-editor doc" — lets the compare
// grid show "a saved version vs. current" without a fake row in the versions table.
type PaneId = 'current' | string;

@Component({
  selector: 'app-version-history-dialog',
  standalone: true,
  imports: [DatePipe, HlmButton, SpinnerComponent, DocPreviewComponent],
  templateUrl: './version-history-dialog.component.html',
})
export class VersionHistoryDialogComponent {
  store = inject(EditorStore);
  private versionsService = inject(TemplateVersionsService);

  templateId = input.required<string>();
  templateName = input<string>('');

  closed = output<void>();
  restored = output<void>();

  list = signal<TemplateVersionMeta[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  leftId = signal<PaneId>('current');
  rightId = signal<PaneId | null>(null);

  private docCache = new Map<string, EmailDoc>();
  private loadingIds = signal<Set<string>>(new Set());

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.error.set(null);
    this.versionsService.list(this.templateId()).subscribe({
      next: versions => {
        this.list.set(versions);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? 'Failed to load version history.');
      },
    });
  }

  metaFor(id: PaneId | null): TemplateVersionMeta | undefined {
    if (!id || id === 'current') return undefined;
    return this.list().find(v => v.id === id);
  }

  docFor(id: PaneId | null): EmailDoc | null {
    if (!id) return null;
    if (id === 'current') return this.store.doc();
    return this.docCache.get(id) ?? null;
  }

  isLoading(id: PaneId | null): boolean {
    return !!id && this.loadingIds().has(id);
  }

  select(side: 'left' | 'right', id: PaneId) {
    (side === 'left' ? this.leftId : this.rightId).set(id);
    if (id !== 'current' && !this.docCache.has(id)) {
      this.loadingIds.update(s => new Set(s).add(id));
      this.versionsService.get(this.templateId(), id).subscribe({
        next: version => {
          this.docCache.set(id, version.doc);
          this.loadingIds.update(s => {
            const next = new Set(s);
            next.delete(id);
            return next;
          });
        },
        error: err => {
          this.loadingIds.update(s => {
            const next = new Set(s);
            next.delete(id);
            return next;
          });
          this.error.set(err?.error?.error ?? 'Failed to load version.');
        },
      });
    }
  }

  restore(id: PaneId | null) {
    const doc = this.docFor(id);
    if (!doc) return;
    if (!confirm('Restore this version into the editor? You will need to Save to keep it.')) return;
    this.store.loadDoc(doc);
    this.restored.emit();
    this.closed.emit();
  }
}
