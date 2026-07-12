import { Component, effect, inject, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CategoriesService } from '../../services/categories.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { UserSettingsService } from '../../services/user-settings.service';
import { defaultCategorySettings, CategoryButtonDefaults, CategoryDataItem } from '../../models/category.model';
import { DocSettings, SavedColor } from '../../models/email-doc.model';
import { uid } from '../../utils/id.utils';
import { SettingsFormComponent } from '../../shared/settings-form/settings-form.component';
import { ColorPaletteEditorComponent } from '../../shared/color-palette-editor/color-palette-editor.component';
import { ColorPickerComponent } from '../../shared/color-picker/color-picker.component';
import { SettingsSaveBarComponent } from '../../shared/settings-save-bar/settings-save-bar.component';
import { AssetsTabComponent } from '../../editor/assets-tab/assets-tab.component';
import { ApiKeysSectionComponent } from '../../editor/api-keys-section/api-keys-section.component';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent } from '@spartan-ng/helm/tabs';

// Edits a category container's shared defaults: global document settings, the color
// palette, and its asset library. Settings/colors are drafts persisted with Save;
// assets upload immediately (they're blobs, not part of the category entity).
@Component({
  selector: 'app-category-settings',
  standalone: true,
  imports: [FormsModule, RouterLink, SettingsFormComponent, ColorPaletteEditorComponent, ColorPickerComponent, SettingsSaveBarComponent, AssetsTabComponent, ApiKeysSectionComponent, HlmButton, HlmInput, HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent],
  templateUrl: './category-settings.component.html',
})
export class CategorySettingsComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private categoriesService = inject(CategoriesService);
  private workspace = inject(WorkspaceContextService);
  // Public: the template binds the account-wide OpenAI key on the Integrations tab.
  userSettings = inject(UserSettingsService);

  categoryId = signal<string | null>(null);
  name = signal('');
  settings = signal<DocSettings>(defaultCategorySettings());
  savedColors = signal<SavedColor[]>([]);
  // null = defer to the account-level button defaults.
  buttonDefaults = signal<CategoryButtonDefaults | null>(null);
  globalData = signal<CategoryDataItem[]>([]);

  loading = signal(true);
  dirty = signal(false);
  saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  error = signal<string | null>(null);

  constructor() {
    // Assets scope to this category; color pickers in the settings form preview
    // the palette as it's being edited.
    effect(() => {
      this.workspace.categoryId.set(this.categoryId());
      this.workspace.palette.set(this.savedColors());
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) {
        this.router.navigate(['/']);
        return;
      }
      this.loading.set(true);
      this.categoriesService.get(id).subscribe({
        next: category => {
          this.categoryId.set(category.id);
          this.name.set(category.name);
          this.settings.set(category.settings ?? defaultCategorySettings());
          this.savedColors.set(category.savedColors);
          this.buttonDefaults.set(category.buttonDefaults ?? null);
          this.globalData.set(category.globalData ?? []);
          this.dirty.set(false);
          this.loading.set(false);
        },
        error: () => this.router.navigate(['/']),
      });
    });
  }

  ngOnDestroy() {
    this.workspace.reset();
  }

  updateSettings(patch: Partial<DocSettings>) {
    this.settings.update(s => ({ ...s, ...patch }));
    this.dirty.set(true);
  }

  setName(name: string) {
    this.name.set(name);
    this.dirty.set(true);
  }

  addColor(color: { name: string; value: string }) {
    this.savedColors.update(list => [...list, { id: uid(), ...color }]);
    this.dirty.set(true);
  }

  removeColor(id: string) {
    this.savedColors.update(list => list.filter(c => c.id !== id));
    this.dirty.set(true);
  }

  // Seeds the category's button defaults from the account values so customizing
  // starts from what new buttons currently look like.
  customizeButtonDefaults() {
    this.buttonDefaults.set({ ...this.userSettings.buttonDefaults() });
    this.dirty.set(true);
  }

  useAccountButtonDefaults() {
    this.buttonDefaults.set(null);
    this.dirty.set(true);
  }

  updateButtonDefaults(patch: Partial<CategoryButtonDefaults>) {
    this.buttonDefaults.update(b => b ? { ...b, ...patch } : b);
    this.dirty.set(true);
  }

  addGlobalData() {
    this.globalData.update(list => [...list, { id: uid(), name: '', value: '' }]);
    this.dirty.set(true);
  }

  updateGlobalData(id: string, patch: Partial<Pick<CategoryDataItem, 'name' | 'value'>>) {
    this.globalData.update(list => list.map(item => item.id !== id ? item : { ...item, ...patch }));
    this.dirty.set(true);
  }

  removeGlobalData(id: string) {
    this.globalData.update(list => list.filter(item => item.id !== id));
    this.dirty.set(true);
  }

  save() {
    const id = this.categoryId();
    const name = this.name().trim();
    if (!id || !name) return;
    this.saveState.set('saving');
    this.error.set(null);
    this.categoriesService.update(id, name, {
      settings: this.settings(),
      savedColors: this.savedColors(),
      buttonDefaults: this.buttonDefaults(),
      globalData: this.globalData(),
    }).subscribe({
      next: () => {
        this.dirty.set(false);
        this.saveState.set('saved');
        setTimeout(() => this.saveState.set('idle'), 1500);
      },
      error: err => {
        this.saveState.set('error');
        this.error.set(err?.error?.error ?? 'Failed to save category.');
        setTimeout(() => this.saveState.set('idle'), 3000);
      },
    });
  }
}
