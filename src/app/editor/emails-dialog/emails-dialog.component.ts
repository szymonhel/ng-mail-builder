import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { EditorStore } from '../../store/editor.store';
import { TemplatesService, EmailTemplateMeta } from '../../services/templates.service';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmButton } from '@spartan-ng/helm/button';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';

// Save/open/delete emails stored in Azure Table storage. The dialog owns the
// service calls; the editor tracks which saved email is currently loaded.
@Component({
  selector: 'app-emails-dialog',
  standalone: true,
  imports: [FormsModule, DatePipe, HlmInput, HlmButton, SpinnerComponent],
  templateUrl: './emails-dialog.component.html',
})
export class EmailsDialogComponent {
  private store = inject(EditorStore);
  private templates = inject(TemplatesService);

  currentId = input<string | null>(null);
  currentName = input<string>('');
  // Category the email being saved belongs to (new saves inherit it).
  categoryId = input<string | null>(null);

  closed = output<void>();
  saved = output<EmailTemplateMeta>();
  opened = output<EmailTemplateMeta>();
  deleted = output<string>();

  name = '';
  list = signal<EmailTemplateMeta[]>([]);
  loading = signal(false);
  saving = signal(false);
  openingId = signal<string | null>(null);
  error = signal<string | null>(null);

  constructor() {
    this.refresh();
  }

  ngOnInit() {
    this.name = this.currentName();
  }

  refresh() {
    this.loading.set(true);
    this.error.set(null);
    this.templates.list().subscribe({
      next: templates => {
        this.list.set(templates);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? 'Failed to load saved emails.');
      },
    });
  }

  save(asNew: boolean) {
    const name = this.name.trim();
    if (!name) return;

    this.saving.set(true);
    this.error.set(null);
    const id = this.currentId();
    const request = !asNew && id
      ? this.templates.update(id, name, this.store.doc())
      : this.templates.create(name, this.store.doc(), this.categoryId());

    request.subscribe({
      next: meta => {
        this.saving.set(false);
        this.saved.emit(meta);
        this.closed.emit();
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Failed to save email.');
      },
    });
  }

  open(meta: EmailTemplateMeta) {
    this.openingId.set(meta.id);
    this.error.set(null);
    this.templates.get(meta.id).subscribe({
      next: template => {
        this.openingId.set(null);
        this.store.loadDoc(template.doc);
        this.opened.emit(template);
        this.closed.emit();
      },
      error: err => {
        this.openingId.set(null);
        this.error.set(err?.error?.error ?? 'Failed to open email.');
      },
    });
  }

  delete(meta: EmailTemplateMeta) {
    if (!confirm(`Delete "${meta.name}"? This cannot be undone.`)) return;
    this.error.set(null);
    this.templates.delete(meta.id).subscribe({
      next: () => {
        this.list.update(list => list.filter(t => t.id !== meta.id));
        this.deleted.emit(meta.id);
      },
      error: err => this.error.set(err?.error?.error ?? 'Failed to delete email.'),
    });
  }
}
