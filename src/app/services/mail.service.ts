import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SendPayload {
  to: string;
  toName?: string;
  subject: string;
  mjml: string;
  categoryId?: string;
}

@Injectable({ providedIn: 'root' })
export class MailService {
  private http = inject(HttpClient);

  send(payload: SendPayload): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiUrl}/send`, payload);
  }
}
