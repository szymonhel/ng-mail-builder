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

  updateSocialLink(index: number, href: string) {
    if (!this.block) return;
    const links = [...(this.block.props as any).links];
    links[index] = { ...links[index], href };
    this.store.updateBlockProps(this.block.id, { links });
  }

  get textProps() { return this.block?.props as any; }
  get imageProps() { return this.block?.props as any; }
  get buttonProps() { return this.block?.props as any; }
  get dividerProps() { return this.block?.props as any; }
  get spacerProps() { return this.block?.props as any; }

  updateAccordionItem(index: number, field: 'title' | 'content', value: string) {
    if (!this.block) return;
    const items = [...(this.block.props as any).items];
    items[index] = { ...items[index], [field]: value };
    this.store.updateBlockProps(this.block.id, { items });
  }

  addAccordionItem() {
    if (!this.block) return;
    const items = [...(this.block.props as any).items, { title: 'New question', content: 'Answer here' }];
    this.store.updateBlockProps(this.block.id, { items });
  }

  removeAccordionItem(index: number) {
    if (!this.block) return;
    const items = (this.block.props as any).items.filter((_: any, i: number) => i !== index);
    this.store.updateBlockProps(this.block.id, { items });
  }

  updateNavbarLink(index: number, field: 'label' | 'href', value: string) {
    if (!this.block) return;
    const links = [...(this.block.props as any).links];
    links[index] = { ...links[index], [field]: value };
    this.store.updateBlockProps(this.block.id, { links });
  }

  addNavbarLink() {
    if (!this.block) return;
    const links = [...(this.block.props as any).links, { label: 'Link', href: '#' }];
    this.store.updateBlockProps(this.block.id, { links });
  }

  removeNavbarLink(index: number) {
    if (!this.block) return;
    const links = (this.block.props as any).links.filter((_: any, i: number) => i !== index);
    this.store.updateBlockProps(this.block.id, { links });
  }

  updateTableCell(rowIndex: number, cellIndex: number, value: string) {
    if (!this.block) return;
    const rows = (this.block.props as any).rows.map((r: any, ri: number) =>
      ri !== rowIndex ? r : { cells: r.cells.map((c: string, ci: number) => ci !== cellIndex ? c : value) }
    );
    this.store.updateBlockProps(this.block.id, { rows });
  }

  addTableRow() {
    if (!this.block) return;
    const existing = (this.block.props as any).rows as any[];
    const numCols = existing[0]?.cells.length ?? 1;
    const rows = [...existing, { cells: Array(numCols).fill('') }];
    this.store.updateBlockProps(this.block.id, { rows });
  }

  removeTableRow(index: number) {
    if (!this.block) return;
    const rows = (this.block.props as any).rows.filter((_: any, i: number) => i !== index);
    this.store.updateBlockProps(this.block.id, { rows });
  }

  addTableColumn() {
    if (!this.block) return;
    const rows = (this.block.props as any).rows.map((r: any) => ({ cells: [...r.cells, ''] }));
    this.store.updateBlockProps(this.block.id, { rows });
  }

  removeTableColumn(colIndex: number) {
    if (!this.block) return;
    const rows = (this.block.props as any).rows.map((r: any) => ({
      cells: r.cells.filter((_: any, i: number) => i !== colIndex)
    }));
    this.store.updateBlockProps(this.block.id, { rows });
  }

  updateCarouselImage(index: number, field: 'src' | 'alt' | 'href', value: string) {
    if (!this.block) return;
    const images = [...(this.block.props as any).images];
    images[index] = { ...images[index], [field]: value };
    this.store.updateBlockProps(this.block.id, { images });
  }

  addCarouselImage() {
    if (!this.block) return;
    const images = [...(this.block.props as any).images, { src: 'https://placehold.co/600x400', alt: 'Slide', href: '' }];
    this.store.updateBlockProps(this.block.id, { images });
  }

  removeCarouselImage(index: number) {
    if (!this.block) return;
    const images = (this.block.props as any).images.filter((_: any, i: number) => i !== index);
    this.store.updateBlockProps(this.block.id, { images });
  }
}
