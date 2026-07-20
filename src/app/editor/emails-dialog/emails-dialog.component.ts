import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorStore } from '../../store/editor.store';
import { TemplatesService, EmailTemplateMeta } from '../../services/templates.service';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmButton } from '@spartan-ng/helm/button';

// Names (and, on an overwrite, optionally comments) the current email, then saves it.
// Browsing/opening/deleting saved emails lives on the dashboard (route '/'), not here.
@Component({
  selector: 'app-emails-dialog',
  standalone: true,
  imports: [FormsModule, HlmInput, HlmButton],
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

  name = '';
  comment = '';
  saving = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.name = this.currentName();
  }

  save() {
    const name = this.name.trim();
    if (!name) return;

    this.saving.set(true);
    this.error.set(null);
    const id = this.currentId();
    const request = id
      ? this.templates.update(id, name, this.store.doc(), undefined, this.comment.trim() || undefined)
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
}
