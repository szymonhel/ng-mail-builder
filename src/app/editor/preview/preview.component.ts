import { Component, ElementRef, inject, computed, effect, input, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { EditorStore } from '../../store/editor.store';
import { UserSettingsService } from '../../services/user-settings.service';
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
  private userSettings = inject(UserSettingsService);

  // Account-level global data participates in previews; a doc variable with
  // the same name wins.
  private variableValues(docVariables: Parameters<typeof defaultVariableValues>[0]): Record<string, string> {
    return { ...this.userSettings.globalValues(), ...defaultVariableValues(docVariables) };
  }

  // When set (e.g. embedded in the Translations tab), the locale is driven by
  // the host and the picker is hidden instead of using the internal `locale` signal.
  lockedLocale = input<string | null | undefined>(undefined);
  hideLocalePicker = input(false);
  // Block to outline in the rendered iframe, e.g. whichever translation field
  // currently has focus — null clears any existing highlight.
  highlightBlockId = input<string | null>(null);

  iframeEl = viewChild<ElementRef<HTMLIFrameElement>>('iframeEl');

  mode: 'desktop' | 'mobile' = 'desktop';
  private internalLocale = signal<string | null>(null);
  locale = computed(() => this.lockedLocale() !== undefined ? this.lockedLocale()! : this.internalLocale());

  private localizedDoc = computed(() => resolveDocForLocale(this.store.doc(), this.locale()));

  previewHtml = computed(() => {
    const doc = this.localizedDoc();
    const html = applyVariables(docToHtml(doc), this.variableValues(doc.variables));
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  mjmlOutput = computed(() => docToMjml(this.localizedDoc()));

  // Debounced so typing a translation doesn't renavigate the iframe on every
  // keystroke (each renavigation resets scroll position, which read as "jumpy").
  private debouncedLocalizedDoc = toSignal(
    toObservable(this.localizedDoc).pipe(debounceTime(400)),
    { initialValue: this.localizedDoc() },
  );

  iframeSrc = computed(() => {
    const doc = this.debouncedLocalizedDoc();
    const html = applyVariables(docToHtml(doc), this.variableValues(doc.variables));
    const blob = new Blob([html], { type: 'text/html' });
    return this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob));
  });

  private lastHighlightedId: string | null = null;

  constructor() {
    // Focus moving to a different block is worth scrolling to; the iframe's
    // document is unchanged here so this alone covers that case.
    effect(() => {
      const id = this.highlightBlockId();
      const scroll = id !== this.lastHighlightedId;
      this.lastHighlightedId = id;
      this.postHighlight(this.iframeEl()?.nativeElement, id, scroll);
    });
  }

  // Covers the iframe navigating to a fresh document (e.g. after the debounced
  // edit above), which forgets any highlight state the script set previously.
  // Same block is still focused here, so re-apply the outline without scrolling.
  onIframeLoad() {
    this.postHighlight(this.iframeEl()?.nativeElement, this.highlightBlockId(), false);
  }

  private postHighlight(frame: HTMLIFrameElement | undefined, blockId: string | null, scroll: boolean) {
    frame?.contentWindow?.postMessage({ type: 'email-preview-highlight', blockId, scroll }, '*');
  }

  setMode(mode: 'desktop' | 'mobile') { this.mode = mode; }

  setLocale(id: string | null) { this.internalLocale.set(id); }

  copyMjml() {
    navigator.clipboard.writeText(this.mjmlOutput());
  }
}
