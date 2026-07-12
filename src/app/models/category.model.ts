import { DocSettings, SavedColor } from './email-doc.model';

// A category container groups saved emails and provides their shared defaults:
// global document settings (layout, colors, border, typography, preview text),
// a color palette for the pickers, and an asset scope. Variables, translations
// and content always stay per-email.
export interface Category {
  id: string;
  name: string;
  settings: DocSettings;
  savedColors: SavedColor[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryMeta {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export function defaultCategorySettings(): DocSettings {
  return {
    contentWidth: 600,
    backgroundColor: '#f4f4f4',
    bodyColor: '#ffffff',
    bodyBorderWidth: 0,
    bodyBorderColor: '#dddddd',
    bodyBorderStyle: 'solid',
    fontFamily: 'Arial, sans-serif',
    previewText: '',
    googleFontName: '',
    googleFontUrl: '',
  };
}
