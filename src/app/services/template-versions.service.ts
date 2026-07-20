import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EmailDoc } from '../models/email-doc.model';

export interface TemplateVersionMeta {
  id: string;
  templateId: string;
  templateName: string;
  comment: string;
  savedAt: string;
}

export interface TemplateVersion extends TemplateVersionMeta {
  doc: EmailDoc;
}

@Injectable({ providedIn: 'root' })
export class TemplateVersionsService {
  private http = inject(HttpClient);

  list(templateId: string): Observable<TemplateVersionMeta[]> {
    return this.http
      .get<{ versions: TemplateVersionMeta[] }>(`${environment.apiUrl}/templates/${encodeURIComponent(templateId)}/versions`)
      .pipe(map(res => res.versions));
  }

  get(templateId: string, versionId: string): Observable<TemplateVersion> {
    return this.http.get<TemplateVersion>(
      `${environment.apiUrl}/templates/${encodeURIComponent(templateId)}/versions/${encodeURIComponent(versionId)}`,
    );
  }
}
