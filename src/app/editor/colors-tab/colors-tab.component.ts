import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SavedColorsService } from '../../services/saved-colors.service';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-colors-tab',
  standalone: true,
  imports: [FormsModule, HlmInput, HlmButton],
  templateUrl: './colors-tab.component.html',
})
export class ColorsTabComponent {
  savedColorsService = inject(SavedColorsService);
  colors = this.savedColorsService.colors;

  newName = signal('');
  newValue = signal('#1a73e8');

  add() {
    const name = this.newName().trim();
    if (!name) return;
    this.savedColorsService.add(name, this.newValue());
    this.newName.set('');
  }

  remove(id: string) {
    this.savedColorsService.remove(id);
  }
}
