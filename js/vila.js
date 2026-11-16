/*
 * Plantão Quest — tela inicial (escolha do tema) e praça da Vila Murici.
 */
(function vila() {
  'use strict';
  const { state, byId, icon, esc } = PQ;
  const doctorColors = ['#182521', '#41372d', '#251d1a', '#b67856', '#e3ad7e', '#f7d3a4', '#e8efda', '#f9f5dd', '#81af9b', '#3b796e'];
  PQ.doctorColors = doctorColors;

  /* ---------- Movimento reaproveitável (praça e consultório) ---------- */
  PQ.createWalker = function createWalker({ area, player, canvas, floor, start, zOf, extra }) {
    const held = new Set();
    const position = { ...start };
    let target = null; let arrived = null; let frame = null; let prev = null; let facingLeft = false;
    const dirs = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0], arrowup: [0, -1], arrowleft: [-1, 0], arrowdown: [0, 1], arrowright: [1, 0] };
    const clamp = (x, y) => ({ x: Math.min(floor.right, Math.max(floor.left, x)), y: Math.min(floor.bottom, Math.max(floor.top, y)) });
    function setPosition(x, y, frame = 0) {
      Object.assign(position, clamp(x, y));
      player.style.left = `${position.x}%`;
      player.style.top = `${position.y}%`;
      if (zOf) player.style.zIndex = zOf(position);
      PQSprites.drawChar(canvas, PQ.player().look, { frame, flip: facingLeft, item: extra });
      api.onMove?.(position);
    }
    function queue() { if (frame === null) frame = requestAnimationFrame(step); }
    function step(time) {
      const elapsed = prev === null ? 16 : Math.min(35, time - prev);
      prev = time; frame = null;
      let dx = 0; let dy = 0;
      if (held.size) for (const k of held) { dx += dirs[k][0]; dy += dirs[k][1]; }
      else if (target) { dx = target.x - position.x; dy = target.y - position.y; }
      const len = Math.hypot(dx, dy);
      const speed = elapsed * 0.031;
      if (target && (len <= speed || PQ.reducedMotion.matches)) {
        setPosition(target.x, target.y);
        target = null;
        const cb = arrived; arrived = null; cb?.();
      } else if (len) {
        if (dx) facingLeft = dx < 0;
        setPosition(position.x + (dx / len) * speed, position.y + (dy / len) * speed, PQ.reducedMotion.matches ? 0 : 1 + (Math.floor(time / 140) % 2));
      } else setPosition(position.x, position.y);
      if (held.size || target) queue(); else prev = null;
    }
    const api = {
      position, setPosition, dirs, redraw() { setPosition(position.x, position.y); },
      walkTo(x, y, cb = null) { held.clear(); target = clamp(x, y); arrived = cb; queue(); },
      stop() { held.clear(); target = null; arrived = null; },
      hold(key) { target = null; arrived = null; held.add(key); queue(); },
      release(key) { held.delete(key); },
      onMove: null,
    };
    setPosition(start.x, start.y);
    return api;
  };

  /* ---------- Tela inicial ---------- */
  const upgradesOpt = () => ({ fachada: !!state.purchases.fachada, floreiras: !!state.purchases.floreiras });
  function drawPracaInto(canvas) { PQArt.drawVila(canvas, upgradesOpt()); }

  function startResume() {
    const parts = [];
    const t = PQ.theme();
    const inProgress = PQ.CASES.find((c) => { const r = state.cases[c.id].run; return r.phase > 0 && r.phase < 4; });
    if (inProgress) parts.push(`<button type="button" class="primary" data-resume-case="${inProgress.id}">Retomar plantão de ${esc(inProgress.patient.name)} · etapa ${state.cases[inProgress.id].run.phase + 1}/4 ${icon('arrow')}</button>`);
    if (t) parts.push(`<button type="button" class="secondary on-dark" data-start-theme="${t.id}">Voltar à vila de ${esc(t.name)}</button>`);
    return parts.join('');
  }

  // tela inicial: as ilustrações da Vila Murici (cenários enviados) passam em sequência
  const SCENES = ['vila', 'praca', 'saude', 'natureza'];
  const sceneImgs = {};
  let sceneIdx = 0; let sceneTimer = null;
  function sceneImg(k) { if (!sceneImgs[k]) { const im = new Image(); im.src = `assets/cenarios/${k}.jpg`; sceneImgs[k] = im; } return sceneImgs[k]; }
  function paintScene(k, alpha = 1) {
    const canvas = byId('start-canvas'); const im = sceneImg(k);
    const go = () => {
      if (canvas.width !== 1600) { canvas.width = 1600; canvas.height = 900; }
      const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; c.globalAlpha = alpha;
      const sw = im.naturalWidth; const sh = Math.min(im.naturalHeight, sw * 9 / 16);
      c.drawImage(im, 0, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, 1600, 900); c.globalAlpha = 1;
    };
    if (im.complete && im.naturalWidth) go(); else { if (alpha === 1) drawPracaInto(canvas); im.addEventListener('load', go, { once: true }); }
  }
  function cycleScenes() {
    clearInterval(sceneTimer);
    if (PQ.reducedMotion.matches) return;
    sceneTimer = setInterval(() => {
      if (state.view !== 'start') { clearInterval(sceneTimer); return; }
      const next = SCENES[(sceneIdx + 1) % SCENES.length]; sceneImg(next);
      let a = 0; const step = () => { a = Math.min(1, a + 0.08); paintScene(next, a); if (a < 1) requestAnimationFrame(step); else sceneIdx = (sceneIdx + 1) % SCENES.length; };
      if (sceneImg(next).complete) requestAnimationFrame(step);
    }, 7000);
  }

  PQ.views.start = {
    render() {
      paintScene(SCENES[sceneIdx]);
      const fx = byId('start-fx'); fx.getContext('2d').clearRect(0, 0, fx.width, fx.height);
      cycleScenes();
      byId('start-chips').innerHTML = PQ.THEMES.map((t) => `<button type="button" class="chip" data-start-theme="${t.id}"><span class="theme-dot" style="background:${t.color}" aria-hidden="true"></span>${esc(t.name)}</button>`).join('');
      byId('start-resume').innerHTML = startResume();
      byId('start-results').innerHTML = '';
      byId('start-search').value = '';
    },
    leave() { clearInterval(sceneTimer); },
  };

  function startSearch(text) {
    byId('start-results').innerHTML = text.trim() ? PQ.themeList(text, 'data-start-theme') : '';
  }
  function bindStart() {
    byId('start-search').addEventListener('input', (e) => startSearch(e.target.value));
    byId('start-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = byId('start-search').value;
      const found = PQ.searchThemes(text);
      if (text.trim() && found.length) PQ.setTheme(found[0].id, { from: 'start' });
      else if (!text.trim()) { startSearch(''); PQ.toast('Escolha um dos temas do acervo abaixo ou digite um assunto.'); byId('start-chips').querySelector('button')?.focus(); }
      else startSearch(text);
    });
    byId('view-start').addEventListener('click', (e) => {
      const pick = e.target.closest('[data-start-theme]');
      if (pick) { PQ.setTheme(pick.dataset.startTheme, { from: 'start' }); return; }
      const resume = e.target.closest('[data-resume-case]');
      if (resume) { const c = PQ.caseOf(resume.dataset.resumeCase); state.theme = c.theme; PQ.openCase(c.id); }
    });
  }

  /* ---------- Vila: painel lateral (o mundo jogável está em js/mundo.js) ---------- */
  const PLACES = [
    { id: 'ubs', name: 'UBS Murici', icon: 'cross' },
    { id: 'biblioteca', name: 'Biblioteca', icon: 'book' },
    { id: 'horta', name: 'Horta e lago', icon: 'leaf' },
    { id: 'gruta', name: 'Gruta Velha', icon: 'sword' },
    { id: 'mural', name: 'Quadro de avisos', icon: 'clock' },
    { id: 'hospital', name: 'Hospital Comunitário Antonella', icon: 'cross' },
    { id: 'escola', name: 'Escola da Saúde', icon: 'book' },
  ];

  function placeStatus(id) {
    const t = PQ.theme();
    if (id === 'ubs') {
      const c = PQ.caseOfDay(t.id);
      if (!c) return { line: 'Plantões da vila', pill: '' };
      const s = state.cases[c.id];
      if (s.run.phase > 0 && s.run.phase < 4) return { line: `Consulta de ${c.patient.name} em andamento`, pill: `ETAPA ${s.run.phase + 1}/4`, tone: 'progress' };
      if (s.completions) return { line: `${c.patient.name}: melhor nota ${s.best} XP`, pill: 'CONCLUÍDO', tone: 'done' };
      return { line: `${c.patient.name} espera atendimento`, pill: 'NOVO', tone: 'new' };
    }
    if (id === 'biblioteca') {
      const l = state.lessons[t.id];
      if (l?.done) return { line: `Ficha e aula de ${t.short}`, pill: 'AULA ✓', tone: 'done' };
      if (l && (l.step > 0 || l.q.attempts)) return { line: `Aula de ${t.short} em andamento`, pill: `PARTE ${Math.min(l.step + 1, t.aula.passos.length)}/${t.aula.passos.length}`, tone: 'progress' };
      return { line: `Ficha e aula de ${t.short} na lousa`, pill: 'NOVO', tone: 'new' };
    }
    if (id === 'horta') {
      const open = PQ.openReviews(t.id).length;
      const c = PQ.counts(t.id);
      return { line: `Perguntas de ${t.short} na colheita e no anzol`, pill: open ? `${open} DÚVIDA${open > 1 ? 'S' : ''}` : `${c.harvest + c.fish} NO CESTO`, tone: open ? 'progress' : '' };
    }
    if (id === 'gruta') {
      if (state.cave && state.cave.theme === t.id && !state.cave.result) return { line: `Batalha contra ${t.monster.name}`, pill: 'EM COMBATE', tone: 'progress' };
      if (state.wins[t.id]) return { line: `${t.monster.name} vencido`, pill: `${state.wins[t.id]}× ✓`, tone: 'done' };
      return { line: `Enfrente ${t.monster.name}`, pill: 'NOVO', tone: 'new' };
    }
    if (id === 'mural') {
      const sch = state.schedule;
      const p = state.pomodoro.running ? ' · Pomodoro ativo' : '';
      if (sch) { const done = PQ.scheduleProgress ? PQ.scheduleProgress() : 0; return { line: `Cronograma de 4 semanas${p}`, pill: `${done}/${sch.tasks.length}`, tone: '' }; }
      return { line: `Cronograma e Pomodoro${p}`, pill: 'MONTAR', tone: 'new' };
    }
    if (id === 'hospital') return { line: `Ala de casos complexos · Desafio do Residente de ${t.short}`, pill: state.ledger[`residente:${t.id}`] ? 'GABARITADO' : 'DESAFIO', tone: state.ledger[`residente:${t.id}`] ? 'done' : 'new' };
    if (id === 'escola') return { line: `Simulado relâmpago de ${t.short} com o Prof. Otávio`, pill: 'SIMULADO', tone: '' };
    return { line: '', pill: '' };
  }

  function nextAction() {
    const t = PQ.theme();
    const c = PQ.caseOfDay(t.id);
    const s = c && state.cases[c.id];
    if (s && s.run.phase > 0 && s.run.phase < 4) return { text: `Continue a consulta de ${c.patient.name}.`, place: 'ubs', label: 'Ir à UBS' };
    if (s && !s.completions) return { text: `${c.patient.name} chegou à UBS Murici com um caso de ${t.short.toLowerCase()}.`, place: 'ubs', label: 'Atender na UBS' };
    if (!state.lessons[t.id]?.done) return { text: `Assista à aula de ${t.short} e leia a ficha.`, place: 'biblioteca', label: 'Ir à biblioteca' };
    if (PQ.openReviews(t.id).length) return { text: `Você tem dúvidas de ${t.short} na fila. Revise colhendo ou pescando.`, place: 'horta', label: 'Ir à horta e ao lago' };
    if (!state.wins[t.id]) return { text: `Enfrente ${t.monster.name} na Gruta Velha.`, place: 'gruta', label: 'Entrar na gruta' };
    if (!state.schedule) return { text: 'Monte o cronograma de 4 semanas para manter o ritmo.', place: 'mural', label: 'Ir ao quadro de avisos' };
    return { text: `Tudo feito em ${t.short}! Rejogue para melhorar a nota ou troque de tema.`, place: 'horta', label: 'Praticar mais' };
  }
  PQ.nextAction = nextAction;
  PQ.placeStatus = placeStatus;

  function enterPlace(id) {
    if (id === 'hospital' || id === 'escola') { if (state.view !== 'vila') PQ.go('vila'); PQ.Mundo.enterBuilding(id); byId('vila-scene').scrollIntoView({ block: 'nearest' }); return; }
    PQ.go(id);
  }

  // moradores listados no painel (atalho acessível para conversar)
  const PANEL_NPCS = ['celia', 'jussara', 'mauro', 'gabrielle', 'pedrinho', 'ze', 'rita', 'iracema', 'otavio', 'benedita', 'juca', 'cida', 'rafa', 'lourival'];
  const npcDef = (id) => (window.PLANTAO_NPCS || []).find((n) => n.id === id);

  PQ.views.vila = {
    render() {
      const t = PQ.theme();
      byId('vila-kicker').textContent = `VILA MURICI · ${t.area}`;
      byId('vila-title').innerHTML = `A vila de <span>${esc(t.short)}</span><i aria-hidden="true">.</i>`;
      PQ.Mundo.start();
      const next = nextAction();
      byId('vila-panel').innerHTML = `
        <div class="side-card">
          <div class="eyebrow">TEMA ATUAL</div>
          <h2 class="side-title"><span class="theme-dot" style="background:${t.color}" aria-hidden="true"></span>${esc(t.name)}</h2>
          <p class="muted">Pacientes, aula, horta, lago e gruta agora falam de ${esc(t.short.toLowerCase())}.</p>
          <button type="button" class="secondary" data-open-theme>Trocar tema</button>
          <div class="next-action"><small>PRÓXIMA AÇÃO</small><p>${esc(next.text)}</p>
            <button type="button" class="primary" data-guide>Mostrar o caminho ${icon('arrow')}</button>
            <button type="button" class="secondary" data-place="${next.place}">${esc(next.label)} direto</button></div>
        </div>
        ${PQ.missionsHTML ? PQ.missionsHTML() : ''}
        <ul class="place-list">${PLACES.map((p) => {
          const st = placeStatus(p.id);
          return `<li><button type="button" class="place-row tone-${st.tone || 'none'}" data-place="${p.id}">
            <span class="place-icon">${icon(p.icon)}</span><span><strong>${esc(p.name)}</strong><small>${esc(st.line)}</small></span>
            <span class="status-pill">${esc(st.pill)}</span></button></li>`;
        }).join('')}</ul>
        <div class="side-card villagers-card"><div class="eyebrow">MORADORES DA VILA</div>
          <ul class="villager-list">${PANEL_NPCS.map(npcDef).filter((v) => v && !(v.preset && state.activeChar === `preset-${v.id}`)).map((v) => `<li><button type="button" class="villager-row" data-talk="${v.id}"><canvas width="34" height="34" data-vportrait="${v.id}"></canvas><span><strong>${esc(v.name)}</strong><small>${esc(v.role)}</small></span><span class="talk">${icon('chat')} Conversar</span></button></li>`).join('')}</ul></div>
        <p class="future-note"><b>Próximas etapas:</b> casos complexos no hospital, estudo em turma, temas novos por IA e leitura de PDF. Elas dependem de servidor, contas e revisão clínica do conteúdo gerado.</p>`;
      byId('vila-panel').querySelectorAll('[data-vportrait]').forEach((cv) => { const v = npcDef(cv.dataset.vportrait); PQSprites.drawPortrait(cv, v.look, 'happy'); });
    },
    leave() { PQ.Mundo.stop(); },
    onKey(e, down) { return PQ.Mundo.onKey(e, down); },
  };

  function bindVila() {
    PQ.Mundo.bind();
    byId('vila-panel').addEventListener('click', (e) => {
      const t = e.target.closest('[data-talk]');
      if (t) { PQ.Mundo.talkTo(t.dataset.talk); byId('vila-scene').scrollIntoView({ block: 'nearest', behavior: PQ.reducedMotion.matches ? 'auto' : 'smooth' }); return; }
      if (e.target.closest('[data-guide]')) { PQ.Mundo.guideTo(); byId('vila-scene').scrollIntoView({ block: 'nearest' }); byId('vila-scene').focus({ preventScroll: true }); return; }
      const b = e.target.closest('[data-place]');
      if (b) enterPlace(b.dataset.place);
    });
  }

  PQ.bindVila = () => { bindStart(); bindVila(); };
})();
