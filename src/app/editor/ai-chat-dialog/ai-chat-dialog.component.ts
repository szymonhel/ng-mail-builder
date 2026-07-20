import { Component, effect, inject, input, output, signal } from '@angular/core';
import { EditorStore } from '../../store/editor.store';
import { AiImportService, ChatTurn } from '../../services/ai-import.service';
import { AiApiKeyService } from '../../services/ai-api-key.service';
import { normalizeImportedDoc } from '../../utils/import.utils';
import { HlmButton } from '@spartan-ng/helm/button';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';
import { DocPreviewComponent } from '../doc-preview/doc-preview.component';

@Component({
  selector: 'app-ai-chat-dialog',
  standalone: true,
  imports: [HlmButton, SpinnerComponent, DocPreviewComponent],
  templateUrl: './ai-chat-dialog.component.html',
})
export class AiChatDialogComponent {
  store = inject(EditorStore);
  aiApiKeyService = inject(AiApiKeyService);
  private aiImport = inject(AiImportService);

  // Set when chatting on top of an already-saved template — its content counts as
  // real, editable context from the very first message (unlike a brand-new email's
  // boilerplate starter doc, which shouldn't be sent until the AI has produced
  // something itself).
  templateId = input<string | null>(null);

  // Bumped by the editor on real navigation (a different email opened, or "New"). The dialog
  // itself is kept mounted across open/close so the conversation survives closing the modal;
  // this is what resets it when the underlying email actually changes instead.
  sessionKey = input<number>(0);

  closed = output<void>();

  turns = signal<ChatTurn[]>([]);
  draft = signal('');
  attachedFile = signal<File | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  hasGenerated = signal(false);

  constructor() {
    effect(() => {
      this.sessionKey();
      this.clearChat();
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.attachedFile.set(input.files?.[0] ?? null);
    input.value = '';
  }

  clearChat() {
    this.turns.set([]);
    this.error.set(null);
    this.hasGenerated.set(false);
  }

  send() {
    const text = this.draft().trim();
    const file = this.attachedFile();
    const apiKey = this.aiApiKeyService.key();
    if ((!text && !file) || !apiKey || this.loading()) return;

    const userTurn: ChatTurn = { role: 'user', text: text || `(attached ${file!.name})` };
    const requestTurns = [...this.turns(), userTurn];
    this.turns.set(requestTurns);
    this.loading.set(true);
    this.error.set(null);

    const currentDoc = this.hasGenerated() || !!this.templateId() ? this.store.doc() : null;

    this.aiImport.chat(requestTurns, currentDoc, file, apiKey).subscribe({
      next: ({ reply, doc }) => {
        this.store.loadDoc(normalizeImportedDoc(doc));
        this.turns.update(t => [...t, { role: 'assistant', text: reply }]);
        this.hasGenerated.set(true);
        this.loading.set(false);
        this.draft.set('');
        this.attachedFile.set(null);
      },
      error: (err) => {
        this.loading.set(false);
        // Drop the optimistically-added turn but keep the draft/file so the user can retry as-is.
        this.turns.set(requestTurns.slice(0, -1));
        this.error.set(err?.error?.error ?? err.message ?? 'Failed to generate template.');
      },
    });
  }
}
