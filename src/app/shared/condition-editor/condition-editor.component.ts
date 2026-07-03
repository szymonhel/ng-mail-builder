import { Component, computed, inject, input, output } from '@angular/core';
import { EditorStore } from '../../store/editor.store';
import { ConditionOperator, VisibilityCondition } from '../../models/email-doc.model';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { HlmLabel } from '@spartan-ng/helm/label';

@Component({
  selector: 'app-condition-editor',
  standalone: true,
  imports: [HlmInput, HlmCheckbox, HlmLabel],
  templateUrl: './condition-editor.component.html',
})
export class ConditionEditorComponent {
  private store = inject(EditorStore);

  condition = input<VisibilityCondition | null | undefined>(null);
  label = input('Only show when...');
  conditionChange = output<VisibilityCondition | null>();

  variables = computed(() => this.store.doc().variables);

  toggle(enabled: boolean) {
    if (!enabled) {
      this.conditionChange.emit(null);
      return;
    }
    const first = this.variables()[0];
    this.conditionChange.emit({ variableName: first?.name ?? '', operator: 'isSet' });
  }

  setVariableName(variableName: string) {
    const current = this.condition();
    if (!current) return;
    this.conditionChange.emit({ ...current, variableName });
  }

  setOperator(operator: string) {
    const current = this.condition();
    if (!current) return;
    this.conditionChange.emit({ ...current, operator: operator as ConditionOperator });
  }

  setValue(value: string) {
    const current = this.condition();
    if (!current) return;
    this.conditionChange.emit({ ...current, value });
  }
}
