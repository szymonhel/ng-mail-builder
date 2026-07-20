import { Block, Row } from './email-doc.model';

// A user-saved row or block, reusable across their own emails. Scoped to a category
// (shared by every email in that container) or personal (categoryId null, shows up
// everywhere), mirroring how templates/assets are optionally category-scoped.
export interface BlockPreset {
  id: string;
  name: string;
  kind: 'row' | 'block';
  categoryId: string | null;
  payload: Row | Block;
  createdAt?: string;
  updatedAt?: string;
}
