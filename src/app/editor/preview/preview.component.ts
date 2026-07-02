import { Component, inject, computed } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { EditorStore } from '../../store/editor.store';
import { docToHtml } from '../../utils/html-preview';
import { docToMjml } from '../../utils/mjml-mapper';
import { applyVariables, defaultVariableValues } from '../../utils/template-vars';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [HlmButton],
  templateUrl: './preview.component.html'
})
export class PreviewComponent {
  store = inject(EditorStore);
  sanitizer = inject(DomSanitizer);

  mode: 'desktop' | 'mobile' = 'desktop';

  previewHtml = computed(() => {
    const doc = this.store.doc();
    const html = applyVariables(docToHtml(doc), defaultVariableValues(doc.variables));
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  mjmlOutput = computed(() => docToMjml(this.store.doc()));

  iframeSrc = computed(() => {
    const doc = this.store.doc();
    const html = applyVariables(docToHtml(doc), defaultVariableValues(doc.variables));
    const blob = new Blob([html], { type: 'text/html' });
    return this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob));
  });

  setMode(mode: 'desktop' | 'mobile') { this.mode = mode; }

  copyMjml() {
    navigator.clipboard.writeText(this.mjmlOutput());
  }
}
