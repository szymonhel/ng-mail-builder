import { DocSettings, SavedColor } from './email-doc.model';

// Same shapes as the account-level settings (user-settings.service); redeclared here
// because categories persist them in their own payload.
export interface CategoryButtonDefaults {
  bg: string;
  color: string;
  borderRadius: number;
}

export interface CategoryDataItem {
  id: string;
  name: string;
  value: string;
}

// A category container groups saved emails and provides their shared defaults:
// global document settings (layout, colors, border, typography, preview text),
// a color palette for the pickers, an asset scope, and optionally button defaults
// and global data layered over the account-level ones. Variables, translations
// and content always stay per-email.
export interface Category {
  id: string;
  name: string;
  settings: DocSettings;
  savedColors: SavedColor[];
  // null = use the account-level button defaults.
  buttonDefaults?: CategoryButtonDefaults | null;
  // Layered over account global data: on a name clash the category value wins,
  // and an email variable with the same name wins over both.
  globalData?: CategoryDataItem[];
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
