/* Plantão Quest — inicialização e teclado. */
(function main() {
  'use strict';
  const { state } = PQ;
  PQ.bindGlobal();
  PQ.bindVila();
  PQ.bindUbs();
  PQ.bindAtividades();
  PQ.bindPersonagem();

  const typing = (el) => el?.matches?.('input, textarea, select, [contenteditable]');
  window.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || typing(e.target)) return;
    if (PQ.dialogKey(e)) { e.preventDefault(); return; }
    if (document.querySelector('dialog[open]')) return;
    const view = PQ.views[state.view];
    if (view?.onKey && view.onKey(e, true)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { PQ.views[state.view]?.onKey?.(e, false); });
  window.addEventListener('blur', () => { ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].forEach((k) => PQ.views[state.view]?.onKey?.({ key: k }, false)); });

  if (state.view === 'case' && state.current) PQ.openCase(state.current, { focus: false });
  else PQ.go(state.view, { focus: false, scroll: false });
  if (state.migratedFrom && !state.migrationNoticeShown) {
    state.migrationNoticeShown = true;
    PQ.toast('Seu progresso anterior foi importado: casos, melhor nota e preferência de som.', 'info', 7000);
    PQ.save();
  }
})();
