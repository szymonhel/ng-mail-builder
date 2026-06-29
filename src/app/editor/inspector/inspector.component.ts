import { Component, inject } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { EditorStore } from '../../store/editor.store';
import { FormsModule } from '@angular/forms';
import { Block } from '../../models/email-doc.model';

@Component({
  selector: 'app-inspector',
  standalone: true,
  imports: [FormsModule, TitleCasePipe],
  templateUrl: './inspector.component.html'
})
export class InspectorComponent {
  store = inject(EditorStore);

  get block(): Block | null { return this.store.selectedBlock(); }

  update(props: any) {
    if (this.block) {
      this.store.updateBlockProps(this.block.id, props);
    }
  }

  get textProps() { return this.block?.props as any; }
  get imageProps() { return this.block?.props as any; }
  get buttonProps() { return this.block?.props as any; }
  get dividerProps() { return this.block?.props as any; }
  get spacerProps() { return this.block?.props as any; }
}
