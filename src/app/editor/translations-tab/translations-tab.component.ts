import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EditorStore } from '../../store/editor.store';
import { listTranslatableFields, TranslatableFieldEntry } from '../../utils/translatable-fields';
import { LOCALE_OPTIONS } from '../../utils/locale-options';
import { AiApiKeyService } from '../../services/ai-api-key.service';
import { AiTranslateService } from '../../services/ai-translate.service';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTextarea } from '@spartan-ng/helm/textarea';

interface FieldGroup {
  blockId: string;
  label: string;
  entries: TranslatableFieldEntry[];
}

function blockTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

@Component({
  selector: 'app-translations-tab',
  standalone: true,
  imports: [FormsModule, HlmInput, HlmButton, HlmTextarea],
  templateUrl: './translations-tab.component.html',
})
export class TranslationsTabComponent {
  store = inject(EditorStore);
  aiApiKeyService = inject(AiApiKeyService);
  private aiTranslate = inject(AiTranslateService);

  locales = computed(() => this.store.doc().locales);
  fields = computed(() => listTranslatableFields(this.store.doc()));

  // Consecutive entries share a blockId (listTranslatableFields walks block-by-block),
  // so a single linear pass is enough to group them for the tab's "which block is this" headers.
  groups = computed<FieldGroup[]>(() => {
    const typeCounts: Record<string, number> = {};
    const result: FieldGroup[] = [];
    for (const entry of this.fields()) {
      const last = result[result.length - 1];
      if (last && last.blockId === entry.blockId) {
        last.entries.push(entry);
        continue;
      }
      typeCounts[entry.blockType] = (typeCounts[entry.blockType] ?? 0) + 1;
      result.push({
        blockId: entry.blockId,
        label: `${blockTypeLabel(entry.blockType)} #${typeCounts[entry.blockType]}`,
        entries: [entry],
      });
    }
    return result;
  });

  coverage = computed(() => {
    const doc = this.store.doc();
    const total = this.fields().length;
    return doc.locales.map(locale => {
      const map = doc.translations[locale.id] ?? {};
      const translated = this.fields().filter(f => (map[f.key] ?? '') !== '').length;
      return { locale, translated, total };
    });
  });

  // Explicit user picks; may be stale (locale removed) or unset (component just
  // (re)created — this whole tab is destroyed/recreated on every nav away and back,
  // so state can't just live in a signal that starts at null every time).
  private explicitLocaleId = signal<string | null>(null);

  // Falls back to the first available locale whenever the explicit pick is unset or
  // no longer exists, so re-entering the tab (or deleting the selected locale) doesn't
  // silently dump the user into an empty "pick a language" state.
  selectedLocaleId = computed(() => {
    const explicit = this.explicitLocaleId();
    const locales = this.locales();
    if (explicit && locales.some(l => l.id === explicit)) return explicit;
    return locales[0]?.id ?? null;
  });
  selectedLocale = computed(() => this.locales().find(l => l.id === this.selectedLocaleId()) ?? null);

  // Languages already added are removed from the picker so the same language can't
  // be added twice with two separate translation sets.
  availableLocaleOptions = computed(() => {
    const usedCodes = new Set(this.locales().map(l => l.code));
    return LOCALE_OPTIONS.filter(o => !usedCodes.has(o.code));
  });

  newLocaleCode = signal('');

  addLocale() {
    const option = LOCALE_OPTIONS.find(o => o.code === this.newLocaleCode());
    if (!option) return;
    const before = new Set(this.store.doc().locales.map(l => l.id));
    this.store.addLocale(option.code, option.label);
    const added = this.store.doc().locales.find(l => !before.has(l.id));
    if (added) this.explicitLocaleId.set(added.id);
    this.newLocaleCode.set('');
    this.pendingSuggestions.set({});
  }

  selectLocale(id: string) {
    this.explicitLocaleId.set(id);
    this.pendingSuggestions.set({});
  }

  removeLocale(id: string) {
    this.store.removeLocale(id);
    if (this.explicitLocaleId() === id) this.explicitLocaleId.set(null);
    this.pendingSuggestions.set({});
  }

  renameLocale(id: string, label: string) {
    this.store.updateLocale(id, { label });
  }

  overrideValue(fieldKey: string): string {
    const localeId = this.selectedLocaleId();
    if (!localeId) return '';
    return this.store.doc().translations[localeId]?.[fieldKey] ?? '';
  }

  setOverride(fieldKey: string, value: string) {
    const localeId = this.selectedLocaleId();
    if (localeId) this.store.setTranslation(localeId, fieldKey, value);
  }

  clearOverride(fieldKey: string) {
    const localeId = this.selectedLocaleId();
    if (localeId) this.store.clearTranslation(localeId, fieldKey);
  }

  translating = signal(false);
  translateError = signal<string | null>(null);
  // AI output staged for review — never written to the store until the user accepts it.
  pendingSuggestions = signal<Record<string, string>>({});
  pendingSuggestionCount = computed(() => Object.keys(this.pendingSuggestions()).length);

  // Fields worth sending: has source text, and no existing override yet (never
  // overwrites a manual translation — re-running only fills newly-blank gaps).
  blankFields = computed(() =>
    this.fields().filter(f => f.sourceValue.trim() !== '' && !this.overrideValue(f.key).trim())
  );

  autoTranslate() {
    const locale = this.selectedLocale();
    const apiKey = this.aiApiKeyService.key();
    const targets = this.blankFields();
    if (!locale || !apiKey || targets.length === 0) return;

    this.translating.set(true);
    this.translateError.set(null);
    this.aiTranslate
      .translateFields(
        targets.map(f => ({ key: f.key, text: f.sourceValue })),
        { code: locale.code, label: locale.label },
        apiKey,
      )
      .subscribe({
        next: (translations) => {
          this.translating.set(false);
          this.pendingSuggestions.set(translations);
        },
        error: (err) => {
          this.translating.set(false);
          this.translateError.set(err?.error?.error ?? err.message ?? 'Failed to auto-translate.');
        },
      });
  }

  useSuggestion(key: string) {
    const localeId = this.selectedLocaleId();
    const value = this.pendingSuggestions()[key];
    if (!localeId || value === undefined) return;
    this.store.setTranslation(localeId, key, value);
    const { [key]: _used, ...rest } = this.pendingSuggestions();
    this.pendingSuggestions.set(rest);
  }

  dismissSuggestion(key: string) {
    const { [key]: _dropped, ...rest } = this.pendingSuggestions();
    this.pendingSuggestions.set(rest);
  }

  acceptAllSuggestions() {
    const localeId = this.selectedLocaleId();
    if (!localeId) return;
    for (const [key, value] of Object.entries(this.pendingSuggestions())) {
      this.store.setTranslation(localeId, key, value);
    }
    this.pendingSuggestions.set({});
  }

  discardAllSuggestions() {
    this.pendingSuggestions.set({});
  }
}
