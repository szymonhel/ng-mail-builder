import { Component, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmailVariable, Locale } from '../../models/email-doc.model';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmButton } from '@spartan-ng/helm/button';

export interface SendFormValue {
  to: string;
  toName: string;
  subject: string;
  variableValues: Record<string, string>;
  localeId: string | null;
}

const TO_STORAGE_KEY = 'sendDialog.to';

@Component({
  selector: 'app-send-dialog',
  standalone: true,
  imports: [FormsModule, HlmInput, HlmButton],
  templateUrl: './send-dialog.component.html',
})
export class SendDialogComponent {
  status = input<'idle' | 'sending' | 'success' | 'error'>('idle');
  errorMessage = input<string>('');
  variables = input<EmailVariable[]>([]);
  locales = input<Locale[]>([]);

  closed = output<void>();
  submitted = output<SendFormValue>();

  to = sessionStorage.getItem(TO_STORAGE_KEY) ?? '';
  toName = '';
  subject = '';
  variableValues = signal<Record<string, string>>({});
  localeId = signal<string | null>(null);

  constructor() {
    // Pre-fill with each variable's default the moment the dialog opens with a doc;
    // doesn't re-fire on unrelated doc edits since the variables array reference is
    // only replaced when a variable is actually added/edited/removed.
    effect(() => {
      const defaults: Record<string, string> = {};
      for (const v of this.variables()) defaults[v.name] = v.defaultValue;
      this.variableValues.set(defaults);
    });
  }

  onToChange(value: string) {
    this.to = value;
    sessionStorage.setItem(TO_STORAGE_KEY, value);
  }

  setVariableValue(name: string, value: string) {
    this.variableValues.update(values => ({ ...values, [name]: value }));
  }

  setLocaleId(id: string | null) {
    this.localeId.set(id);
  }

  submit() {
    if (!this.to || !this.subject) return;
    this.submitted.emit({
      to: this.to,
      toName: this.toName,
      subject: this.subject,
      variableValues: this.variableValues(),
      localeId: this.localeId(),
    });
  }

  close() {
    this.closed.emit();
  }
}
