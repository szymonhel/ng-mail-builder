import { Component, inject, computed, signal, HostListener } from '@angular/core';
import { NgClass } from '@angular/common';
import { EditorStore } from '../store/editor.store';
import { PaletteComponent } from './palette/palette.component';
import { CanvasComponent } from './canvas/canvas.component';
import { InspectorComponent } from './inspector/inspector.component';
import { PreviewComponent } from './preview/preview.component';
import { SendDialogComponent, SendFormValue } from './send-dialog/send-dialog.component';
import { SettingsTabComponent } from './settings-tab/settings-tab.component';
import { MailService } from '../services/mail.service';
import { AiImportService, PdfImportMode } from '../services/ai-import.service';
import { docToMjml, mjmlToDoc } from '../utils/mjml-mapper';
import { parseJsonImport, normalizeImportedDoc } from '../utils/import.utils';
import { applyVariables } from '../utils/template-vars';
import { HlmButton } from '@spartan-ng/helm/button';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [NgClass, PaletteComponent, CanvasComponent, InspectorComponent, PreviewComponent, SendDialogComponent, SettingsTabComponent, HlmButton, NgIcon],
  templateUrl: './editor.component.html'
})
export class EditorComponent {
  store = inject(EditorStore);
  private mail = inject(MailService);
  private aiImport = inject(AiImportService);

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;

    const target = e.target as HTMLElement | null;
    const isEditingText = !!target && (
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
    );
    if (isEditingText) return;

    e.preventDefault();
    if (e.shiftKey) {
      this.store.redo();
    } else {
      this.store.undo();
    }
  }

  jsonOutput = computed(() => JSON.stringify(this.store.doc(), null, 2));
  mjmlOutput = computed(() => docToMjml(this.store.doc()));

  sendDialogOpen = signal(false);
  sendStatus = signal<'idle' | 'sending' | 'success' | 'error'>('idle');
  sendError = signal('');

  importError = signal<string | null>(null);

  private static readonly AI_KEY_STORAGE_KEY = 'ngmb.openaiApiKey';
  aiApiKey = signal(localStorage.getItem(EditorComponent.AI_KEY_STORAGE_KEY) ?? '');
  aiImageFile = signal<File | null>(null);
  aiImagePreviewUrl = signal<string | null>(null);
  aiImportLoading = signal(false);
  aiImportError = signal<string | null>(null);

  copyJson() { navigator.clipboard.writeText(this.jsonOutput()); }
  copyMjml() { navigator.clipboard.writeText(this.mjmlOutput()); }

  saveAiKey(value: string) {
    const trimmed = value.trim();
    this.aiApiKey.set(trimmed);
    if (trimmed) {
      localStorage.setItem(EditorComponent.AI_KEY_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(EditorComponent.AI_KEY_STORAGE_KEY);
    }
  }

  clearAiKey() {
    this.aiApiKey.set('');
    localStorage.removeItem(EditorComponent.AI_KEY_STORAGE_KEY);
  }

  onAiImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.aiImportError.set(null);
    this.aiImageFile.set(file);

    const previous = this.aiImagePreviewUrl();
    if (previous) URL.revokeObjectURL(previous);
    this.aiImagePreviewUrl.set(file ? URL.createObjectURL(file) : null);

    input.value = '';
  }

  generateFromPhoto() {
    const file = this.aiImageFile();
    const apiKey = this.aiApiKey();
    if (!file || !apiKey) return;

    this.aiImportLoading.set(true);
    this.aiImportError.set(null);

    this.aiImport.importFromImage(file, apiKey).subscribe({
      next: (doc) => {
        this.store.loadDoc(normalizeImportedDoc(doc));
        this.aiImportLoading.set(false);
        this.aiImageFile.set(null);
        const previewUrl = this.aiImagePreviewUrl();
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        this.aiImagePreviewUrl.set(null);
      },
      error: (err) => {
        this.aiImportLoading.set(false);
        this.aiImportError.set(err?.error?.error ?? err.message ?? 'Failed to generate template from photo.');
      },
    });
  }

  aiPdfMode = signal<PdfImportMode>('mockup');
  aiPdfFile = signal<File | null>(null);
  aiPdfImportLoading = signal(false);
  aiPdfImportError = signal<string | null>(null);

  onAiPdfSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.aiPdfImportError.set(null);
    this.aiPdfFile.set(file);
    input.value = '';
  }

  generateFromPdf() {
    const file = this.aiPdfFile();
    const apiKey = this.aiApiKey();
    if (!file || !apiKey) return;

    this.aiPdfImportLoading.set(true);
    this.aiPdfImportError.set(null);

    this.aiImport.importFromPdf(file, this.aiPdfMode(), apiKey).subscribe({
      next: (doc) => {
        this.store.loadDoc(normalizeImportedDoc(doc));
        this.aiPdfImportLoading.set(false);
        this.aiPdfFile.set(null);
      },
      error: (err) => {
        this.aiPdfImportLoading.set(false);
        this.aiPdfImportError.set(err?.error?.error ?? err.message ?? 'Failed to generate template from PDF.');
      },
    });
  }

  // Shared by both the paste-text and file-upload import paths: sniffs JSON vs MJML
  // from content alone, for whichever of the two doesn't have a filename to go by.
  private importDocFromText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Paste some JSON or MJML first.');
    return trimmed.startsWith('{') ? parseJsonImport(text) : mjmlToDoc(text);
  }

  importFromText(textarea: HTMLTextAreaElement) {
    try {
      const doc = this.importDocFromText(textarea.value);
      this.store.loadDoc(doc);
      this.importError.set(null);
      textarea.value = '';
    } catch (err: any) {
      this.importError.set(err?.message ?? 'Failed to import.');
    }
  }

  onImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      try {
        const doc = /\.(mjml|xml)$/i.test(file.name)
          ? mjmlToDoc(text)
          : file.name.toLowerCase().endsWith('.json')
            ? parseJsonImport(text)
            : this.importDocFromText(text);
        this.store.loadDoc(doc);
        this.importError.set(null);
      } catch (err: any) {
        this.importError.set(err?.message ?? 'Failed to import file.');
      }
    };
    reader.onerror = () => this.importError.set('Failed to read that file.');
    reader.readAsText(file);

    input.value = '';
  }

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
    // Regenerated from the doc (rather than reusing mjmlOutput()) so block/row
    // visibility conditions are re-evaluated against this send's actual values,
    // not the defaults baked into the Export tab's preview.
    const mjml = applyVariables(docToMjml(this.store.doc(), form.variableValues), form.variableValues);
    this.mail.send({
      to: form.to,
      toName: form.toName || undefined,
      subject: form.subject,
      mjml,
    }).subscribe({
      next: () => this.sendStatus.set('success'),
      error: (err) => {
        this.sendStatus.set('error');
        this.sendError.set(err?.error?.error ?? err.message ?? 'Unexpected error');
      },
    });
  }
}
