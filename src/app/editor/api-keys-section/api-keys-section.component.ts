import { Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiKeysService, ApiKeyMeta, CreatedApiKey } from '../../services/api-keys.service';
import { environment } from '../../../environments/environment';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmButton } from '@spartan-ng/helm/button';

// Manage the API keys of one category container: keys let external services send
// that category's emails (and read their contracts) — nothing else. Creating a key
// shows the plaintext exactly once; only revocation is possible after.
@Component({
  selector: 'app-api-keys-section',
  standalone: true,
  imports: [DatePipe, FormsModule, HlmInput, HlmButton],
  templateUrl: './api-keys-section.component.html',
})
export class ApiKeysSectionComponent implements OnInit {
  private apiKeys = inject(ApiKeysService);

  // The category container whose keys are managed here.
  categoryId = input.required<string>();

  apiUrl = environment.apiUrl;

  keys = signal<ApiKeyMeta[]>([]);
  loading = signal(true);
  creating = signal(false);
  error = signal<string | null>(null);
  newName = signal('');
  // Held only in memory until dismissed — never retrievable again.
  createdKey = signal<CreatedApiKey | null>(null);
  copied = signal(false);

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.apiKeys.list(this.categoryId()).subscribe({
      next: keys => {
        this.keys.set(keys);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? 'Failed to load API keys.');
      },
    });
  }

  create() {
    const name = this.newName().trim();
    if (!name) return;
    this.creating.set(true);
    this.error.set(null);
    this.apiKeys.create(name, this.categoryId()).subscribe({
      next: created => {
        this.creating.set(false);
        this.newName.set('');
        this.createdKey.set(created);
        this.copied.set(false);
        this.keys.update(list => [{ id: created.id, name: created.name, prefix: created.prefix, categoryId: created.categoryId, createdAt: created.createdAt }, ...list]);
      },
      error: err => {
        this.creating.set(false);
        this.error.set(err?.error?.error ?? 'Failed to create API key.');
      },
    });
  }

  copyKey() {
    const created = this.createdKey();
    if (!created) return;
    navigator.clipboard.writeText(created.key);
    this.copied.set(true);
  }

  revoke(key: ApiKeyMeta) {
    if (!confirm(`Revoke "${key.name}" (${key.prefix}…)? Services using it will stop working immediately.`)) return;
    this.apiKeys.revoke(key.id).subscribe({
      next: () => this.keys.update(list => list.filter(k => k.id !== key.id)),
      error: err => this.error.set(err?.error?.error ?? 'Failed to revoke API key.'),
    });
  }
}
