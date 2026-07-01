import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

export interface SendFormValue {
  to: string;
  toName: string;
  subject: string;
}

@Component({
  selector: 'app-send-dialog',
  standalone: true,
  imports: [FormsModule, NgClass],
  templateUrl: './send-dialog.component.html',
})
export class SendDialogComponent {
  status = input<'idle' | 'sending' | 'success' | 'error'>('idle');
  errorMessage = input<string>('');

  closed = output<void>();
  submitted = output<SendFormValue>();

  to = '';
  toName = '';
  subject = '';

  submit() {
    if (!this.to || !this.subject) return;
    this.submitted.emit({ to: this.to, toName: this.toName, subject: this.subject });
  }

  close() {
    this.closed.emit();
  }
}
