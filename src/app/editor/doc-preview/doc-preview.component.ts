import { Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { EmailDoc } from '../../models/email-doc.model';
import { docToHtml } from '../../utils/html-preview';
import { applyVariables, defaultVariableValues } from '../../utils/template-vars';
import { resolveDocForLocale } from '../../utils/translation-resolver';

// Renders an arbitrary EmailDoc snapshot (e.g. a historical version), unlike
// PreviewComponent which always reads the live EditorStore. Used by the
// version-history compare view to show two docs side by side. No debounce here
// (unlike PreviewComponent) — the doc only changes when the user picks a
// different version or locale, not on every keystroke.
@Component({
  selector: 'app-doc-preview',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './doc-preview.component.html',
})
export class DocPreviewComponent {
  sanitizer = inject(DomSanitizer);

  doc = input.required<EmailDoc>();
  globalValues = input<Record<string, string>>({});

  locale = signal<string | null>(null);

  private localizedDoc = computed(() => resolveDocForLocale(this.doc(), this.locale()));

  private renderHtml(doc: EmailDoc): string {
    const html = docToHtml(doc);
    return applyVariables(html, { ...this.globalValues(), ...defaultVariableValues(doc.variables) });
  }

  iframeSrc = computed(() => {
    const html = this.renderHtml(this.localizedDoc());
    const blob = new Blob([html], { type: 'text/html' });
    return this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob));
  });

  setLocale(id: string | null) {
    this.locale.set(id);
  }
}
