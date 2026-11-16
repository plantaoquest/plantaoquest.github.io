/*
 * Plantão Quest — diálogos de RPG, atores animados e efeitos.
 * Os diálogos não bloqueiam o jogo: o prontuário e os botões continuam funcionando.
 */
(function dialogo() {
  'use strict';
  const { byId, esc } = PQ;
  const S = PQSprites;
  const reduced = () => PQ.reducedMotion.matches;

  /* ---------- caixa de diálogo ---------- */
  let current = null;
  function close(silent) {
    if (!current) return;
    clearInterval(current.timer);
    clearTimeout(current.auto);
    current.box.remove();
    const done = current.onDone;
    current = null;
    if (!silent) done?.();
  }
  function renderLine() {
    const cur = current;
    const line = cur.lines[cur.i];
    const last = cur.i === cur.lines.length - 1;
    const choices = Array.isArray(line.choices) && line.choices.length ? line.choices : null;
    cur.box.classList.toggle('has-choices', !!choices);
    cur.box.innerHTML = `
      <div class="dlg-portrait${line.portraitFrame ? ' framed' : ''}"><canvas width="34" height="34"></canvas></div>
      <div class="dlg-main">
        <div class="dlg-name">${esc(line.who)}${line.role ? `<small>${esc(line.role)}</small>` : ''}</div>
        <p class="dlg-text" aria-hidden="true"></p>
        <p class="sr-only" aria-live="polite">${esc(line.who)}: ${esc(line.text)}</p>
        ${choices ? `<div class="dlg-choices" role="group" aria-label="Escolha uma resposta" hidden>${choices.map((ch, i) => `<button type="button" class="dlg-choice" data-choice="${i}"><span class="choice-code" aria-hidden="true">${i + 1}</span>${esc(ch.label)}</button>`).join('')}</div>` : ''}
      </div>
      <div class="dlg-actions">
        ${choices ? '<button type="button" class="dlg-next dlg-close" data-dlg="close" aria-label="Fechar diálogo">✕</button>' : `<button type="button" class="dlg-next" data-dlg="next" aria-label="${last ? 'Fechar diálogo' : 'Próxima fala'}">${last ? '✕' : '▼'}</button>`}
        ${cur.lines.length > 1 && !last && !choices ? '<button type="button" class="dlg-skip" data-dlg="skip">Pular ▸▸</button>' : ''}
      </div>`;
    if (line.monster) PQArt.drawMonster(cur.box.querySelector('canvas'), line.monster.kind, line.monster.colors, 0);
    else S.drawPortrait(cur.box.querySelector('canvas'), line.look, line.mood || 'neutral');
    const out = cur.box.querySelector('.dlg-text');
    cur.typing = true;
    let n = 0;
    const full = line.text;
    clearInterval(cur.timer);
    const finish = () => {
      cur.typing = false;
      const ch = cur.box.querySelector('.dlg-choices');
      if (ch) { ch.hidden = false; if (cur.focusChoices !== false) ch.querySelector('.dlg-choice')?.focus({ preventScroll: true }); }
      if (cur.autoMs && last && !choices) cur.auto = setTimeout(() => close(), cur.autoMs);
    };
    if (reduced()) { out.textContent = full; finish(); }
    else {
      cur.timer = setInterval(() => {
        n += 2; out.textContent = full.slice(0, n);
        if (n >= full.length) { clearInterval(cur.timer); finish(); }
        if (n % 6 === 0) PQ.play('blip');
      }, 22);
    }
  }
  function pick(i) {
    const line = current?.lines[current.i];
    const ch = line?.choices?.[i];
    if (!ch) return;
    PQ.play(ch.cancel ? 'cancel' : 'confirm');
    const container = current.container;
    const onDone = current.onDone;
    close(true);
    const next = ch.onPick?.();
    if (Array.isArray(next) && next.length) PQ.say(container, next, { onDone, focus: true });
    else if (!ch.keepDone) onDone?.();
  }
  function advance() {
    if (!current) return;
    if (current.typing) {
      clearInterval(current.timer); current.box.querySelector('.dlg-text').textContent = current.lines[current.i].text; current.typing = false;
      const ch = current.box.querySelector('.dlg-choices'); if (ch) { ch.hidden = false; ch.querySelector('.dlg-choice')?.focus({ preventScroll: true }); }
      return;
    }
    if (current.lines[current.i].choices?.length) return;
    if (current.i < current.lines.length - 1) { current.i += 1; renderLine(); current.box.querySelector('.dlg-next')?.focus({ preventScroll: true }); }
    else close();
  }
  PQ.say = function say(container, lines, { onDone, auto = 0, focus = false, focusChoices = true } = {}) {
    close(true);
    if (!container || !lines.length) { onDone?.(); return; }
    const box = document.createElement('div');
    box.className = 'dlg';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Diálogo');
    container.appendChild(box);
    current = { box, lines, i: 0, onDone, autoMs: auto, container, focusChoices };
    PQ.play('talk');
    box.addEventListener('click', (e) => {
      e.stopPropagation();
      const choice = e.target.closest('[data-choice]');
      if (choice) { pick(Number(choice.dataset.choice)); return; }
      const b = e.target.closest('[data-dlg]');
      if (b?.dataset.dlg === 'close') { PQ.play('cancel'); close(); return; }
      if (b?.dataset.dlg === 'skip') close(); else advance();
    });
    renderLine();
    if (focus) box.querySelector('.dlg-next')?.focus({ preventScroll: true });
  };
  PQ.dialogOpen = () => !!current;
  PQ.dialogKey = (e) => {
    if (!current) return false;
    if (e.key === 'Escape') { PQ.play('cancel'); close(); return true; }
    const line = current.lines[current.i];
    if (line.choices?.length && /^[1-9]$/.test(e.key) && Number(e.key) <= line.choices.length) { pick(Number(e.key) - 1); return true; }
    if (line.choices?.length && !current.typing) {
      const btns = [...current.box.querySelectorAll('.dlg-choice')];
      const at = btns.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp', 's', 'w', 'S', 'W'].includes(e.key)) {
        const d = ['ArrowDown', 's', 'S'].includes(e.key) ? 1 : -1;
        btns[(Math.max(0, at) + d + btns.length) % btns.length].focus({ preventScroll: true }); PQ.play('select'); return true;
      }
      if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'e') { pick(at >= 0 ? at : 0); return true; }
      return false;
    }
    if ((e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'e') && (!document.activeElement || document.activeElement === document.body || current.box.contains(document.activeElement) || current.container.contains(document.activeElement))) { advance(); return true; }
    return false;
  };
  PQ.closeDialog = () => close(true);

  /* ---------- atores animados ---------- */
  PQ.actor = function actor({ el, canvas, look, x, y, mood = 'neutral', item = null }) {
    const a = { el, canvas, look, x, y, mood, item, flip: false, frame: 0, raf: null };
    a.draw = () => S.drawChar(a.canvas, a.look, { frame: a.frame, flip: a.flip, mood: a.mood, item: a.item });
    a.place = (nx, ny) => { a.x = nx; a.y = ny; a.el.style.left = `${nx}%`; a.el.style.top = `${ny}%`; };
    a.moveTo = (tx, ty, { speed = 0.028, onDone } = {}) => {
      cancelAnimationFrame(a.raf);
      if (reduced()) { a.place(tx, ty); a.frame = 0; a.draw(); onDone?.(); return; }
      let prev = null;
      const step = (t) => {
        const dt = prev === null ? 16 : Math.min(40, t - prev); prev = t;
        const dx = tx - a.x; const dy = ty - a.y; const len = Math.hypot(dx, dy); const s = dt * speed;
        if (len <= s) { a.place(tx, ty); a.frame = 0; a.draw(); a.raf = null; onDone?.(); return; }
        if (Math.abs(dx) > 0.1) a.flip = dx < 0;
        a.place(a.x + (dx / len) * s, a.y + (dy / len) * s);
        a.frame = Math.floor(t / 140) % 2 ? 1 : 2; a.draw();
        a.raf = requestAnimationFrame(step);
      };
      a.raf = requestAnimationFrame(step);
    };
    a.stop = () => { cancelAnimationFrame(a.raf); a.raf = null; a.frame = 0; a.draw(); };
    a.place(x, y); a.draw();
    return a;
  };

  PQ.emote = function emote(el, symbol, ms = 1800, cls = '') {
    if (!el) return;
    el.querySelector('.emote')?.remove();
    const s = document.createElement('span');
    s.className = `emote ${cls}`;
    s.setAttribute('aria-hidden', 'true');
    s.textContent = symbol;
    el.appendChild(s);
    if (ms) setTimeout(() => s.remove(), ms);
  };

  /* ---------- números e avisos flutuantes ---------- */
  PQ.floatText = function floatText(container, text, x, y, cls = '') {
    if (!container) return;
    const s = document.createElement('span');
    s.className = `float-text ${cls}`;
    s.style.left = `${x}%`; s.style.top = `${y}%`;
    s.textContent = text;
    s.setAttribute('aria-hidden', 'true');
    container.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  };
  PQ.popChip = function popChip(kind, text) {
    const chip = byId(kind === 'coin' ? 'coin-count' : 'total-xp')?.closest('.xp-chip');
    if (!chip) return;
    const s = document.createElement('span');
    s.className = `chip-pop ${kind}`;
    s.textContent = text;
    s.setAttribute('aria-hidden', 'true');
    chip.appendChild(s);
    chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
    setTimeout(() => s.remove(), 1300);
  };

  /* ---------- subir de nível ---------- */
  PQ.levelUp = function levelUp(level) {
    const o = document.createElement('div');
    o.className = 'levelup';
    o.setAttribute('role', 'status');
    const p = PQ.player();
    o.innerHTML = `<div class="levelup-card"><div class="burst" aria-hidden="true"></div><canvas width="34" height="34"></canvas>
      <strong>SUBIU DE NÍVEL!</strong><b>Nível ${level}</b><small>${esc(PQ.docName())} ficou mais experiente. Atributos +1.</small>
      <button type="button" class="primary">Continuar</button></div>`;
    document.body.appendChild(o);
    S.drawPortrait(o.querySelector('canvas'), p.look, 'happy');
    PQ.play('levelup');
    const btn = o.querySelector('button');
    const done = () => o.remove();
    btn.addEventListener('click', done);
    o.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); done(); } });
    btn.focus();
    setTimeout(() => { if (o.isConnected && !o.contains(document.activeElement)) done(); }, 6000);
  };
})();
