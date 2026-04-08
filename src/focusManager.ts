export const focusManager = {
  lastFocusedElement: null as any,
  saveFocus() {
    this.lastFocusedElement = typeof document !== 'undefined' ? document.activeElement : null;
  },
  restoreFocus() {
    if (this.lastFocusedElement?.focus) this.lastFocusedElement.focus();
  },
};
