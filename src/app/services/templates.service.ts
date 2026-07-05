import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EmailDoc } from '../models/email-doc.model';

export interface EmailTemplateMeta {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailTemplate extends EmailTemplateMeta {
  doc: EmailDoc;
}

@Injectable({ providedIn: 'root' })
export class TemplatesService {
  private http = inject(HttpClient);

  list(): Observable<EmailTemplateMeta[]> {
    return this.http
      .get<{ templates: EmailTemplateMeta[] }>(`${environment.apiUrl}/templates`)
      .pipe(map(res => res.templates));
  }

  get(id: string): Observable<EmailTemplate> {
    return this.http.get<EmailTemplate>(`${environment.apiUrl}/templates/${encodeURIComponent(id)}`);
  }

  create(name: string, doc: EmailDoc): Observable<EmailTemplateMeta> {
    return this.http.post<EmailTemplateMeta>(`${environment.apiUrl}/templates`, { name, doc });
  }

  update(id: string, name: string, doc: EmailDoc): Observable<EmailTemplateMeta> {
    return this.http.put<EmailTemplateMeta>(`${environment.apiUrl}/templates/${encodeURIComponent(id)}`, { name, doc });
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${environment.apiUrl}/templates/${encodeURIComponent(id)}`);
  }
}
