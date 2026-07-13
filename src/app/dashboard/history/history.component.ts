import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SendHistoryService, SendHistoryEntry } from '../../services/send-history.service';
import { HlmButton } from '@spartan-ng/helm/button';

// Newest-first log of every send attempt (in-app and via API keys), including
// failures with their error message. Read-only.
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [DatePipe, RouterLink, HlmButton],
  templateUrl: './history.component.html',
})
export class HistoryComponent {
  private history = inject(SendHistoryService);

  entries = signal<SendHistoryEntry[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  expandedId = signal<string | null>(null);

  constructor() {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.error.set(null);
    this.history.list({ limit: 100 }).subscribe({
      next: entries => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.error ?? 'Failed to load send history.');
      },
    });
  }

  toggle(id: string) {
    this.expandedId.update(current => current === id ? null : id);
  }

  // "name: value" lines out of the stored variables JSON, for the details view.
  detailLines(json?: string): { name: string; value: string }[] {
    if (!json) return [];
    try {
      return Object.entries(JSON.parse(json) as Record<string, unknown>).map(([name, value]) => ({ name, value: String(value) }));
    } catch {
      return [];
    }
  }
}
