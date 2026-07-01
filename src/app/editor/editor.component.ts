import { Component, inject, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { EditorStore } from '../store/editor.store';
import { PaletteComponent } from './palette/palette.component';
import { CanvasComponent } from './canvas/canvas.component';
import { InspectorComponent } from './inspector/inspector.component';
import { PreviewComponent } from './preview/preview.component';
import { SendDialogComponent, SendFormValue } from './send-dialog/send-dialog.component';
import { ColorsTabComponent } from './colors-tab/colors-tab.component';
import { MailService } from '../services/mail.service';
import { docToMjml } from '../utils/mjml-mapper';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [NgClass, PaletteComponent, CanvasComponent, InspectorComponent, PreviewComponent, SendDialogComponent, ColorsTabComponent],
  templateUrl: './editor.component.html'
})
export class EditorComponent {
  store = inject(EditorStore);
  private mail = inject(MailService);

  jsonOutput = computed(() => JSON.stringify(this.store.doc(), null, 2));
  mjmlOutput = computed(() => docToMjml(this.store.doc()));

  sendDialogOpen = signal(false);
  sendStatus = signal<'idle' | 'sending' | 'success' | 'error'>('idle');
  sendError = signal('');

  copyJson() { navigator.clipboard.writeText(this.jsonOutput()); }
  copyMjml() { navigator.clipboard.writeText(this.mjmlOutput()); }

  openSendDialog() {
    this.sendStatus.set('idle');
    this.sendError.set('');
    this.sendDialogOpen.set(true);
  }

  closeSendDialog() {
    if (this.sendStatus() === 'sending') return;
    this.sendDialogOpen.set(false);
  }

  onSendSubmit(form: SendFormValue) {
    this.sendStatus.set('sending');
    this.mail.send({
      to: form.to,
      toName: form.toName || undefined,
      subject: form.subject,
      mjml: this.mjmlOutput(),
    }).subscribe({
      next: () => this.sendStatus.set('success'),
      error: (err) => {
        this.sendStatus.set('error');
        this.sendError.set(err?.error?.error ?? err.message ?? 'Unexpected error');
      },
    });
  }
}
