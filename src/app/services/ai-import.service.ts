import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EmailDoc } from '../models/email-doc.model';

export type PdfImportMode = 'mockup' | 'brief';

@Injectable({ providedIn: 'root' })
export class AiImportService {
  private http = inject(HttpClient);

  // openaiApiKey is supplied by the user (never stored server-side) and is forwarded
  // per-request so our server can call OpenAI's vision API on their behalf.
  importFromImage(file: File, openaiApiKey: string): Observable<EmailDoc> {
    const formData = new FormData();
    formData.append('image', file);

    const headers = new HttpHeaders({
      'x-openai-key': openaiApiKey,
    });

    return this.http
      .post<{ doc: EmailDoc }>(`${environment.apiUrl}/ai/import-image`, formData, { headers })
      .pipe(map(res => res.doc));
  }

  // mode 'mockup' = the PDF is a visual design to reconstruct; 'brief' = the PDF is
  // written instructions/content to design an email from, with no visual reference.
  importFromPdf(file: File, mode: PdfImportMode, openaiApiKey: string): Observable<EmailDoc> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    const headers = new HttpHeaders({
      'x-openai-key': openaiApiKey,
    });

    return this.http
      .post<{ doc: EmailDoc }>(`${environment.apiUrl}/ai/import-pdf`, formData, { headers })
      .pipe(map(res => res.doc));
  }
}
