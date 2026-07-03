<div class="flex flex-col h-screen overflow-hidden font-sans">
  <!-- Top bar -->
  <header class="flex items-center px-4 h-[52px] bg-[#1a1a2e] text-white shrink-0 gap-4">
    <div class="flex items-center gap-2 font-bold text-base mr-4">
      <span class="text-xl">&#x2709;</span>
      <span>Email Builder</span>
    </div>
    <nav class="flex gap-1 flex-1">
      <button
        class="border-0 px-4 py-1.5 rounded-sm cursor-pointer text-sm transition-all"
        [ngClass]="store.activeTab() === 'editor' ? 'bg-white/15 text-white' : 'bg-transparent text-white/60 hover:bg-white/10 hover:text-white'"
        (click)="store.setActiveTab('editor')">Editor</button>
      <button
        class="border-0 px-4 py-1.5 rounded-sm cursor-pointer text-sm transition-all"
        [ngClass]="store.activeTab() === 'preview' ? 'bg-white/15 text-white' : 'bg-transparent text-white/60 hover:bg-white/10 hover:text-white'"
        (click)="store.setActiveTab('preview')">Preview</button>
      <button
        class="border-0 px-4 py-1.5 rounded-sm cursor-pointer text-sm transition-all"
        [ngClass]="store.activeTab() === 'json' ? 'bg-white/15 text-white' : 'bg-transparent text-white/60 hover:bg-white/10 hover:text-white'"
        (click)="store.setActiveTab('json')">Import / Export</button>
      <button
        class="border-0 px-4 py-1.5 rounded-sm cursor-pointer text-sm transition-all"
        [ngClass]="store.activeTab() === 'settings' ? 'bg-white/15 text-white' : 'bg-transparent text-white/60 hover:bg-white/10 hover:text-white'"
        (click)="store.setActiveTab('settings')">Settings</button>
    </nav>
    <div class="flex gap-2">
      <button hlmBtn variant="outline" size="sm" class="text-foreground px-2" [disabled]="!store.canUndo()" (click)="store.undo()" title="Undo (Ctrl/Cmd+Z)">
        <ng-icon name="lucideUndo2" size="16" />
      </button>
      <button hlmBtn variant="outline" size="sm" class="text-foreground px-2" [disabled]="!store.canRedo()" (click)="store.redo()" title="Redo (Ctrl/Cmd+Shift+Z)">
        <ng-icon name="lucideRedo2" size="16" />
      </button>
      <button hlmBtn size="sm" (click)="openSendDialog()">Send</button>
    </div>
  </header>

  @if (importError()) {
    <div class="flex items-center justify-between gap-4 px-4 py-2 bg-red-50 border-b border-red-200">
      <p class="text-red-600 text-xs m-0">{{ importError() }}</p>
      <button class="text-red-600 text-xs underline shrink-0" (click)="importError.set(null)">Dismiss</button>
    </div>
  }

  @if (sendDialogOpen()) {
    <app-send-dialog
      [status]="sendStatus()"
      [errorMessage]="sendError()"
      [variables]="store.doc().variables"
      (closed)="closeSendDialog()"
      (submitted)="onSendSubmit($event)"
    />
  }

  <!-- Main workspace -->
  <div class="flex flex-1 overflow-hidden">
    @if (store.activeTab() === 'editor') {
      <aside class="w-48 shrink-0 overflow-y-auto border-r border-gray-200">
        <app-palette />
      </aside>
      <main class="flex-1 overflow-y-auto min-w-0">
