import { Component, inject, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { EditorStore } from '../../store/editor.store';
import { docToHtml } from '../../utils/html-preview';
import { docToMjml } from '../../utils/mjml-mapper';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [NgClass],
  templateUrl: './preview.component.html'
})
export class PreviewComponent {
  store = inject(EditorStore);
  sanitizer = inject(DomSanitizer);

  mode: 'desktop' | 'mobile' = 'desktop';

  previewHtml = computed(() => {
    const html = docToHtml(this.store.doc());
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  mjmlOutput = computed(() => docToMjml(this.store.doc()));

  iframeSrc = computed(() => {
    const html = docToHtml(this.store.doc());
    const blob = new Blob([html], { type: 'text/html' });
    return this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob));
  });

  setMode(mode: 'desktop' | 'mobile') { this.mode = mode; }

  copyMjml() {
    navigator.clipboard.writeText(this.mjmlOutput());
  }
}
