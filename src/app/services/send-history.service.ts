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
}
