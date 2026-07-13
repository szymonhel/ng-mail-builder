import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SavedColor } from '../../models/email-doc.model';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmButton } from '@spartan-ng/helm/button';

// Dumb palette editor shared by the editor's Colors tab (account or per-email
// palette) and the category settings page. `editable=false` renders a read-only
// swatch list (e.g. a category palette the email merely inherits).
@Component({
  selector: 'app-color-palette-editor',
  standalone: true,
  imports: [FormsModule, HlmInput, HlmButton],
  templateUrl: './color-palette-editor.component.html',
})
export class ColorPaletteEditorComponent {
  colors = input.required<SavedColor[]>();
  editable = input(true);

  added = output<{ name: string; value: string }>();
  removed = output<string>();

  newName = signal('');
  newValue = signal('#1a73e8');

  add() {
    const name = this.newName().trim();
    if (!name) return;
    this.added.emit({ name, value: this.newValue() });
    this.newName.set('');
  }
}
