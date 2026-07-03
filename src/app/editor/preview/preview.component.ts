import { Component, inject, computed, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { EditorStore } from '../../store/editor.store';
import { docToHtml } from '../../utils/html-preview';
import { docToMjml } from '../../utils/mjml-mapper';
import { applyVariables, defaultVariableValues } from '../../utils/template-vars';
import { resolveDocForLocale } from '../../utils/translation-resolver';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [FormsModule, HlmButton],
  templateUrl: './preview.component.html'
})
export class PreviewComponent {
  store = inject(EditorStore);
  sanitizer = inject(DomSanitizer);

  mode: 'desktop' | 'mobile' = 'desktop';
  locale = signal<string | null>(null);

  private localizedDoc = computed(() => resolveDocForLocale(this.store.doc(), this.locale()));

  previewHtml = computed(() => {
    const doc = this.localizedDoc();
    const html = applyVariables(docToHtml(doc), defaultVariableValues(doc.variables));
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  mjmlOutput = computed(() => docToMjml(this.localizedDoc()));

  iframeSrc = computed(() => {
    const doc = this.localizedDoc();
    const html = applyVariables(docToHtml(doc), defaultVariableValues(doc.variables));
    const blob = new Blob([html], { type: 'text/html' });
    return this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob));
  });

  setMode(mode: 'desktop' | 'mobile') { this.mode = mode; }

  setLocale(id: string | null) { this.locale.set(id); }

  copyMjml() {
    navigator.clipboard.writeText(this.mjmlOutput());
  }
}
