import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SendHistoryService, SendHistoryEntry, DeliveryStatus } from '../../services/send-history.service';
import { HlmButton } from '@spartan-ng/helm/button';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';

// Newest-first log of every send attempt (in-app and via API keys), including
// failures with their error message. Read-only.
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [DatePipe, RouterLink, HlmButton, SpinnerComponent],
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

  // Per-entry live delivery lookups (keyed by history entry id).
  deliveryLoading = signal<string | null>(null);
  deliveryError = signal<string | null>(null);
  deliveryResults = signal<Record<string, DeliveryStatus>>({});

  checkDelivery(entry: SendHistoryEntry) {
    this.deliveryLoading.set(entry.id);
    this.deliveryError.set(null);
    this.history.checkDeliveryStatus(entry.id).subscribe({
      next: status => {
        this.deliveryLoading.set(null);
        this.deliveryResults.update(map => ({ ...map, [entry.id]: status }));
        // Reflect the freshly cached status in the list row too.
        this.entries.update(list => list.map(e => e.id !== entry.id ? e : { ...e, deliveryStatus: status.status, deliveryCheckedAt: status.checkedAt }));
      },
      error: err => {
        this.deliveryLoading.set(null);
        this.deliveryError.set(err?.error?.error ?? 'Failed to fetch delivery status.');
      },
    });
  }

  // Color bucket for a Mailjet delivery status badge.
  deliveryTone(status: string): 'good' | 'bad' | 'neutral' {
    if (['opened', 'clicked', 'sent'].includes(status)) return 'good';
    if (['bounced', 'hardbounced', 'softbounced', 'blocked', 'spam'].includes(status)) return 'bad';
    return 'neutral';
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
