import { Component, inject, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { EditorStore } from '../store/editor.store';
import { PaletteComponent } from './palette/palette.component';
import { CanvasComponent } from './canvas/canvas.component';
import { InspectorComponent } from './inspector/inspector.component';
import { PreviewComponent } from './preview/preview.component';
import { docToMjml } from '../utils/mjml-mapper';
import { docToHtml } from '../utils/html-preview';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [NgClass, PaletteComponent, CanvasComponent, InspectorComponent, PreviewComponent],
  templateUrl: './editor.component.html'
})
export class EditorComponent {
  store = inject(EditorStore);

  jsonOutput = computed(() => JSON.stringify(this.store.doc(), null, 2));
  mjmlOutput = computed(() => docToMjml(this.store.doc()));

  copyJson() { navigator.clipboard.writeText(this.jsonOutput()); }
  copyMjml() { navigator.clipboard.writeText(this.mjmlOutput()); }
}
