import { Component, input } from '@angular/core';
import { TableProps } from '../../models/email-doc.model';

@Component({
  selector: 'app-table-block',
  standalone: true,
  template: `
    <div [style.padding]="props().padding" [style.overflowX]="'auto'">
      <table [style.width]="'100%'" [style.borderCollapse]="'collapse'">
        @for (row of props().rows; track $index; let first = $first) {
          <tr>
            @for (cell of row.cells; track $index) {
              @if (first && props().hasHeader) {
                <th [style.border]="'1px solid ' + props().borderColor"
                    [style.padding]="'8px 12px'"
                    [style.background]="'#f5f5f5'"
                    [style.fontWeight]="'600'"
                    [style.fontSize.px]="props().fontSize"
                    [style.color]="props().color"
                    [style.textAlign]="props().align">{{ cell }}</th>
              } @else {
                <td [style.border]="'1px solid ' + props().borderColor"
                    [style.padding]="'8px 12px'"
                    [style.fontSize.px]="props().fontSize"
                    [style.color]="props().color"
                    [style.textAlign]="props().align">{{ cell }}</td>
              }
            }
          </tr>
        }
      </table>
    </div>
  `
})
export class TableBlockComponent {
  props = input.required<TableProps>();
}
