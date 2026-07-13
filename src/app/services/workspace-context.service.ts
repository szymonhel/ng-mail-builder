import { Injectable, signal } from '@angular/core';
import { SavedColor } from '../models/email-doc.model';

// Ambient context for components that behave differently depending on where they're
// used (color picker swatches, asset tab/picker scope) without threading inputs
// through every layer. The editor keeps it synced to the open email's category;
// the category settings page sets it to the category being edited; the dashboard
// clears it.
@Injectable({ providedIn: 'root' })
export class WorkspaceContextService {
  // Asset scope: uploads/listings target this category; null = account-wide pool only.
  categoryId = signal<string | null>(null);

  // Swatches shown in color pickers; null falls back to the account's saved colors.
  palette = signal<SavedColor[] | null>(null);

  reset() {
    this.categoryId.set(null);
    this.palette.set(null);
  }
}
