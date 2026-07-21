import { Component, effect, inject, input, output, signal } from '@angular/core';
import { EditorStore } from '../../store/editor.store';
import { AiImportService, ChatTurn } from '../../services/ai-import.service';
import { AiApiKeyService } from '../../services/ai-api-key.service';
import { normalizeImportedDoc } from '../../utils/import.utils';
import { HlmButton } from '@spartan-ng/helm/button';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';

@Component({
  selector: 'app-ai-chat-panel',
  standalone: true,
  imports: [HlmButton, SpinnerComponent],
  templateUrl: './ai-chat-panel.component.html',
})
export class AiChatPanelComponent {
  store = inject(EditorStore);
  aiApiKeyService = inject(AiApiKeyService);
  private aiImport = inject(AiImportService);

  // Set when chatting on top of an already-saved template — its content counts as
  // real, editable context from the very first message (unlike a brand-new email's
  // boilerplate starter doc, which shouldn't be sent until the AI has produced
  // something itself).
  templateId = input<string | null>(null);

  // Bumped by the editor on real navigation (a different email opened, or "New"). The panel
  // itself is kept mounted while collapsed so the conversation survives hiding it; this is
  // what resets it when the underlying email actually changes instead.
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
        // The AI's schema only knows about settings/variables/rows — it never sees (and for
        // "variables" is told to ignore) locales, translations, collections, category
        // inheritance flags, or the saved-color palette. Carry those over from the doc as it
        // stood before this turn so an AI edit can't silently wipe out translation work etc.
        const before = this.store.doc();
        const merged = {
          ...normalizeImportedDoc(doc),
          variables: before.variables,
          collections: before.collections,
          locales: before.locales,
          translations: before.translations,
          inheritSettings: before.inheritSettings,
          inheritColors: before.inheritColors,
          savedColors: before.savedColors,
        };
        this.store.loadDoc(merged);
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
