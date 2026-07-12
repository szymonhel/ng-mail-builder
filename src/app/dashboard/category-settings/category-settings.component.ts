import { Component, effect, inject, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CategoriesService } from '../../services/categories.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { defaultCategorySettings } from '../../models/category.model';
import { DocSettings, SavedColor } from '../../models/email-doc.model';
import { uid } from '../../utils/id.utils';
import { SettingsFormComponent } from '../../shared/settings-form/settings-form.component';
import { ColorPaletteEditorComponent } from '../../shared/color-palette-editor/color-palette-editor.component';
import { AssetsTabComponent } from '../../editor/assets-tab/assets-tab.component';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent } from '@spartan-ng/helm/tabs';

// Edits a category container's shared defaults: global document settings, the color
// palette, and its asset library. Settings/colors are drafts persisted with Save;
// assets upload immediately (they're blobs, not part of the category entity).
@Component({
  selector: 'app-category-settings',
  standalone: true,
  imports: [FormsModule, RouterLink, SettingsFormComponent, ColorPaletteEditorComponent, AssetsTabComponent, HlmButton, HlmInput, HlmTabs, HlmTabsList, HlmTabsTrigger, HlmTabsContent],
  templateUrl: './category-settings.component.html',
})
export class CategorySettingsComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private categoriesService = inject(CategoriesService);
  private workspace = inject(WorkspaceContextService);

  categoryId = signal<string | null>(null);
  name = signal('');
  settings = signal<DocSettings>(defaultCategorySettings());
  savedColors = signal<SavedColor[]>([]);

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

  save() {
    const id = this.categoryId();
    const name = this.name().trim();
    if (!id || !name) return;
    this.saveState.set('saving');
    this.error.set(null);
    this.categoriesService.update(id, name, this.settings(), this.savedColors()).subscribe({
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
