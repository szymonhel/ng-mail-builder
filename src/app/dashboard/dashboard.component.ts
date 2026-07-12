import { Component, computed, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { FormsModule } from '@angular/forms';
import { CategoriesService, CategoryResponse } from '../services/categories.service';
import { TemplatesService, EmailTemplateMeta } from '../services/templates.service';
import { WorkspaceContextService } from '../services/workspace-context.service';
import { defaultCategorySettings } from '../models/category.model';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';

interface CategoryGroup {
  category: CategoryResponse | null; // null = uncategorized
  emails: EmailTemplateMeta[];
}

// Landing page: every saved email grouped by its category container, plus category
// management. Opening an email navigates into the editor (/emails/:id).
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AsyncPipe, DatePipe, FormsModule, RouterLink, HlmButton, HlmInput],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  private categoriesService = inject(CategoriesService);
  private templatesService = inject(TemplatesService);
  private workspace = inject(WorkspaceContextService);

  categories = signal<CategoryResponse[]>([]);
  templates = signal<EmailTemplateMeta[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  newCategoryName = signal('');
  creatingCategory = signal(false);
  renamingCategoryId = signal<string | null>(null);
  renameValue = signal('');

  groups = computed<CategoryGroup[]>(() => {
    const cats = this.categories();
    const knownIds = new Set(cats.map(c => c.id));
    const byCategory = new Map<string, EmailTemplateMeta[]>();
    const uncategorized: EmailTemplateMeta[] = [];
    for (const t of this.templates()) {
      // Emails whose category was deleted fall back to Uncategorized.
      if (t.categoryId && knownIds.has(t.categoryId)) {
        const list = byCategory.get(t.categoryId) ?? [];
        list.push(t);
        byCategory.set(t.categoryId, list);
      } else {
        uncategorized.push(t);
      }
    }
    const groups: CategoryGroup[] = cats.map(category => ({ category, emails: byCategory.get(category.id) ?? [] }));
    if (uncategorized.length > 0 || groups.length === 0) groups.push({ category: null, emails: uncategorized });
    return groups;
  });

  constructor() {
    // The dashboard isn't scoped to any category/palette.
    this.workspace.reset();
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.error.set(null);
    let pending = 2;
    const done = () => { if (--pending === 0) this.loading.set(false); };
    this.categoriesService.list().subscribe({
      next: categories => { this.categories.set(categories); done(); },
      error: err => { this.error.set(err?.error?.error ?? 'Failed to load categories.'); done(); },
    });
    this.templatesService.list().subscribe({
      next: templates => { this.templates.set(templates); done(); },
      error: err => { this.error.set(err?.error?.error ?? 'Failed to load saved emails.'); done(); },
    });
  }

  logout() {
    this.auth.logout({ logoutParams: { returnTo: document.baseURI } });
  }

  createCategory() {
    const name = this.newCategoryName().trim();
    if (!name) return;
    this.creatingCategory.set(true);
    this.categoriesService.create(name, defaultCategorySettings(), []).subscribe({
      next: category => {
        this.categories.update(list => [...list, category].sort((a, b) => a.name.localeCompare(b.name)));
        this.newCategoryName.set('');
        this.creatingCategory.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Failed to create category.');
        this.creatingCategory.set(false);
      },
    });
  }

  startRename(category: CategoryResponse) {
    this.renamingCategoryId.set(category.id);
    this.renameValue.set(category.name);
  }

  confirmRename(category: CategoryResponse) {
    const name = this.renameValue().trim();
    this.renamingCategoryId.set(null);
    if (!name || name === category.name) return;
    this.categoriesService.update(category.id, name, category.settings ?? defaultCategorySettings(), category.savedColors).subscribe({
      next: updated => this.categories.update(list =>
        list.map(c => c.id === updated.id ? updated : c).sort((a, b) => a.name.localeCompare(b.name))),
      error: err => this.error.set(err?.error?.error ?? 'Failed to rename category.'),
    });
  }

  deleteCategory(category: CategoryResponse, emailCount: number) {
    const suffix = emailCount > 0 ? ` Its ${emailCount} email(s) will move to Uncategorized and keep their current look.` : '';
    if (!confirm(`Delete category "${category.name}"?${suffix}`)) return;
    this.categoriesService.delete(category.id).subscribe({
      next: () => this.categories.update(list => list.filter(c => c.id !== category.id)),
      error: err => this.error.set(err?.error?.error ?? 'Failed to delete category.'),
    });
  }

  newEmail(categoryId: string | null) {
    this.router.navigate(['/emails/new'], categoryId ? { queryParams: { category: categoryId } } : {});
  }

  deleteEmail(email: EmailTemplateMeta) {
    if (!confirm(`Delete "${email.name}"? This cannot be undone.`)) return;
    this.templatesService.delete(email.id).subscribe({
      next: () => this.templates.update(list => list.filter(t => t.id !== email.id)),
      error: err => this.error.set(err?.error?.error ?? 'Failed to delete email.'),
    });
  }

  moveEmail(email: EmailTemplateMeta, categoryId: string) {
    const target = categoryId || null;
    if (target === (email.categoryId ?? null)) return;
    this.templatesService.moveToCategory(email.id, target).subscribe({
      next: () => this.templates.update(list => list.map(t => t.id === email.id ? { ...t, categoryId: target } : t)),
      error: err => this.error.set(err?.error?.error ?? 'Failed to move email.'),
    });
  }
}
