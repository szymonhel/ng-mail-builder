import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface TranslateField {
  key: string;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class AiTranslateService {
  private http = inject(HttpClient);

  // openaiApiKey is supplied by the user (never stored server-side) and is forwarded
  // per-request so our server can call OpenAI on their behalf, same as AiImportService.
  translateFields(
    fields: TranslateField[],
    locale: { code: string; label: string },
    openaiApiKey: string
  ): Observable<Record<string, string>> {
    const headers = new HttpHeaders({
      'x-api-key': environment.apiKey,
      'x-openai-key': openaiApiKey,
    });

    return this.http
      .post<{ translations: Record<string, string> }>(`${environment.apiUrl}/ai/translate`, { locale, fields }, { headers })
      .pipe(map(res => res.translations));
  }
}
