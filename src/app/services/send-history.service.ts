import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface SendHistoryEntry {
  id: string;
  sentAt: string;
  status: 'sent' | 'failed';
  error?: string;
  to: string;
  toName?: string;
  subject: string;
  source: 'app' | 'api';
  apiKeyName?: string;
  templateId?: string;
  templateName?: string;
  categoryId?: string;
  language?: string;
  // JSON strings: variables used (values truncated) and collection item counts.
  variablesJson?: string;
  collectionsJson?: string;
  // Mailjet message id (present for successful sends since delivery tracking).
  mailjetMessageId?: string;
  // Last delivery status fetched from Mailjet, cached server-side.
  deliveryStatus?: string;
  deliveryCheckedAt?: string;
}

export interface DeliveryStatus {
  // Mailjet message status: sent, opened, clicked, bounced, blocked, spam, queued, ...
  status: string;
  arrivedAt?: string;
  checkedAt: string;
  events: { at: string | null; type: string; state?: string; userAgent?: string }[];
}

@Injectable({ providedIn: 'root' })
export class SendHistoryService {
  private http = inject(HttpClient);

  list(options: { templateId?: string; limit?: number } = {}): Observable<SendHistoryEntry[]> {
    const params: Record<string, string> = {};
    if (options.templateId) params['template'] = options.templateId;
    if (options.limit) params['limit'] = String(options.limit);
    return this.http
      .get<{ entries: SendHistoryEntry[] }>(`${environment.apiUrl}/history`, { params })
      .pipe(map(res => res.entries));
  }

  // Live delivery lookup against Mailjet (also refreshes the cached status server-side).
  checkDeliveryStatus(id: string): Observable<DeliveryStatus> {
    return this.http.get<DeliveryStatus>(`${environment.apiUrl}/history/${encodeURIComponent(id)}/status`);
  }
}
