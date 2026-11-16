/*
 * Plantão Quest — posto de saúde: quadro de plantões e consulta.
 */
(function ubs() {
  'use strict';
  const { state, byId, icon, esc, CASES, MAX_CASE } = PQ;
  const STEPS = ['Acolhimento', 'Anamnese', 'Exame', 'Conduta'];
  const POINTS = { clues: 40, classify: 20, treatment: 40 };
  const WAYPOINTS = [
    { label: 'Recepção', x: 33, y: 67, icon: 'chat' },
    { label: 'Anamnese', x: 49, y: 65, icon: 'chat' },
    { label: 'Exame', x: 71, y: 64, icon: 'search' },
    { label: 'Conduta', x: 71, y: 64, icon: 'book' },
  ];

  const active = () => PQ.caseOf(state.current);
  const record = () => state.cases[state.current];
  const run = () => record().run;

  function score(data = active(), current = run()) {
    const first = (key) => current[key].last === data[key].correct && current[key].attempts === 1;
    return POINTS.clues + (first('classify') ? POINTS.classify : 0) + (first('treatment') ? POINTS.treatment : 0);
  }

  function caseStatus(data) {
    const saved = state.cases[data.id];
    const { phase, history, exam } = saved.run;
    const started = phase > 0 || history.length || exam.length;
    if (phase === 4) return { key: 'done', label: 'CONCLUÍDO' };
    if (started) return { key: 'progress', label: saved.completions ? 'REJOGANDO' : 'EM ANDAMENTO' };
    if (saved.completions) return { key: 'done', label: 'CONCLUÍDO' };
    return { key: 'new', label: 'NOVO' };
  }
  PQ.caseStatus = caseStatus;

  /* ---------- Quadro de plantões ---------- */
  function caseCard(data) {
    const saved = state.cases[data.id];
    const status = caseStatus(data);
    const { phase } = saved.run;
    const t = PQ.themeOf(data.theme);
    const isTheme = data.theme === state.theme;
    let actions;
    if (status.key === 'new') actions = `<button type="button" class="primary" data-home="open" data-case="${data.id}">Começar plantão ${icon('arrow')}</button>`;
    else if (status.key === 'progress') actions = `<button type="button" class="primary" data-home="open" data-case="${data.id}">Continuar · etapa ${Math.min(phase + 1, 4)}/4 ${icon('arrow')}</button>
        <button type="button" class="secondary" data-home="reset" data-case="${data.id}">Recomeçar</button>`;
    else actions = `<button type="button" class="primary" data-home="replay" data-case="${data.id}">Rejogar plantão ${icon('arrow')}</button>
        ${phase === 4 ? `<button type="button" class="secondary" data-home="open" data-case="${data.id}">Ver desfecho</button>` : ''}`;
    return `
      <li class="case-card status-${status.key}${isTheme ? ' theme-match' : ''}" id="card-${data.id}">
        <div class="case-card-head">
          <div class="portrait" aria-hidden="true"><canvas data-portrait="${data.id}" width="34" height="34"></canvas></div>
          <div><div class="eyebrow">PLANTÃO ${data.number} · ${esc(t.name.toUpperCase())}${isTheme ? ' · TEMA ATUAL' : ''}</div><h3>${esc(data.title)}</h3><p>${esc(data.patient.card)}</p></div>
          <span class="status-pill">${status.label}</span>
        </div>
        <p class="case-summary">${esc(data.summary)}</p>
        <div class="case-progress" aria-label="${Math.min(phase, 4)} de 4 etapas concluídas">${STEPS.map((_, i) => `<i class="${i < phase ? 'on' : ''}"></i>`).join('')}</div>
        <div class="case-meta"><span>${icon('clock')} ${data.minutes} MIN</span><span>${icon('trophy')} MELHOR ${saved.best}/${MAX_CASE} XP</span><span>${saved.completions}× CONCLUÍDO</span></div>
        <div class="case-actions">${actions}</div>
      </li>`;
  }

  PQ.views.ubs = {
    render() {
      const t = PQ.theme();
      const sorted = CASES.slice().sort((a, b) => (b.theme === t.id) - (a.theme === t.id));
      byId('case-list').innerHTML = sorted.map(caseCard).join('');
      byId('case-list').querySelectorAll('[data-portrait]').forEach((cv) => PQSprites.drawPortrait(cv, PQ.caseOf(cv.dataset.portrait).look, state.cases[cv.dataset.portrait].completions ? 'happy' : 'sick'));
      byId('ubs-theme').textContent = t.name;
      byId('ubs-upgrades').innerHTML = `<h3 class="mini-heading">${icon('trophy')} Reforma do posto · ${PQ.coins()} moedas</h3>${PQ.upgradesHTML()}`;
      const owned = PQ.UPGRADES.filter((u) => state.purchases[u.id]).length;
      byId('ubs-banner').textContent = owned ? `${owned} reforma${owned > 1 ? 's' : ''} concluída${owned > 1 ? 's' : ''}` : 'Posto original';
    },
  };

  function bindBoard() {
    byId('case-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-home]');
      if (!b) return;
      const id = b.dataset.case;
      const action = b.dataset.home;
      if (action === 'open') openCase(id);
      else if (action === 'replay') openCase(id, { reset: true });
      else if (action === 'reset') {
        if (b.dataset.armed === 'true') openCase(id, { reset: true });
        else {
          b.dataset.armed = 'true';
          b.textContent = 'Toque de novo para recomeçar';
          setTimeout(() => { if (b.isConnected) { b.dataset.armed = 'false'; b.textContent = 'Recomeçar'; } }, 4000);
        }
      }
    });
    byId('ubs-upgrades').addEventListener('click', (e) => {
      const b = e.target.closest('[data-buy]');
      if (b && PQ.buy(b.dataset.buy)) PQ.refresh();
    });
  }

  /* ---------- Consulta ---------- */
  let walker = null;
  let patientActor = null;
  let companionActor = null;
  let arriving = false;
  const ENTRANCE = { x: 44, y: 101 };
  const WAIT = { x: 13, y: 80 };
  const SPOTS = [WAIT, { x: 49, y: 65 }, { x: 71, y: 64 }, { x: 71, y: 64 }, { x: 71, y: 64 }];
  const map = () => byId('map');

  function patientLook(data, phase) {
    const look = { ...data.look, acc: [...(data.look.acc || [])] };
    if (data.maskFromPhase !== undefined && phase >= data.maskFromPhase && !look.acc.includes('mascara')) look.acc.push('mascara');
    return look;
  }
  function patientMood(data, cur) {
    if (cur.phase >= 4) return 'happy';
    if (cur.phase === 3 && cur.treatment.last !== null) return cur.treatment.last === data.treatment.correct ? 'happy' : 'sick';
    return 'sick';
  }
  function setupActors(animate) {
    const data = active(); const cur = run();
    byId('patient').classList.toggle('child', !!data.look.child);
    if (!patientActor) patientActor = PQ.actor({ el: byId('patient'), canvas: byId('patient-sprite'), look: data.look, x: SPOTS[0].x, y: SPOTS[0].y });
    patientActor.look = patientLook(data, cur.phase);
    patientActor.mood = patientMood(data, cur);
    const comp = byId('companion');
    comp.hidden = !data.companion;
    if (data.companion) {
      if (!companionActor) companionActor = PQ.actor({ el: comp, canvas: byId('companion-sprite'), look: data.companion.look, x: SPOTS[0].x + 7, y: SPOTS[0].y });
      companionActor.look = data.companion.look;
      companionActor.mood = cur.phase >= 4 ? 'happy' : 'neutral';
    }
    const spot = SPOTS[cur.phase];
    const target = cur.phase === 0 && !cur.arrived ? ENTRANCE : spot;
    const compTarget = cur.phase === 0 ? { x: target.x + 7, y: target.y } : { x: spot.x - 7, y: spot.y + 3 };
    if (animate) {
      patientActor.moveTo(target.x, target.y);
      companionActor?.moveTo(compTarget.x, compTarget.y);
    } else {
      patientActor.stop(); patientActor.place(target.x, target.y); patientActor.draw();
      if (companionActor) { companionActor.stop(); companionActor.place(compTarget.x, compTarget.y); companionActor.draw(); }
    }
  }

  function arrivalLines(data) {
    const s = state.cases[data.id];
    const speaker = data.companion || { name: data.patient.name, look: data.look };
    const text = s.completions ? data.returnLine : data.arrival;
    return [{ who: speaker.name, role: data.companion ? data.companion.role : 'paciente', look: speaker.look, mood: s.completions ? 'happy' : 'sad', text: PQ.fill(text) }];
  }
  function playArrival() {
    const data = active(); const cur = run();
    arriving = true;
    patientActor.place(ENTRANCE.x, ENTRANCE.y);
    companionActor?.place(ENTRANCE.x + 4, ENTRANCE.y + 3);
    PQ.emote(byId('patient'), '!', 1400);
    const finish = () => {
      if (!arriving) return;
      arriving = false;
      cur.arrived = true; PQ.save();
      if (state.view === 'case' && active() === data && run().phase === 0) { renderCase(); PQ.say(map(), arrivalLines(data), { auto: 7000 }); }
    };
    patientActor.moveTo(WAIT.x, WAIT.y, { speed: 0.024, onDone: finish });
    companionActor?.moveTo(WAIT.x + 7, WAIT.y, { speed: 0.024 });
  }
  function skipArrival() {
    if (!arriving && run().arrived) return;
    arriving = false;
    run().arrived = true; PQ.save();
    setupActors(false);
  }

  function openCase(id, { reset = false, focus = true } = {}) {
    if (reset) state.cases[id].run = PQ.newRun();
    state.current = id;
    const data = PQ.caseOf(id);
    if (state.theme !== data.theme) state.theme = data.theme;
    arriving = false;
    PQ.go('case', { focus: false });
    const point = WAYPOINTS[run().phase];
    if (point && run().phase > 0) walker.setPosition(point.x - 8, point.y + 4); else walker.setPosition(50, 88);
    setupActors(false);
    if (run().phase === 0 && !run().arrived) playArrival();
    else if (run().phase === 0) PQ.say(map(), arrivalLines(data), { auto: 6000 });
    if (focus) focusPanel('phase-title');
  }
  PQ.openCase = openCase;

  function renderSteps() {
    byId('steps').innerHTML = STEPS.map((name, i) => {
      const cur = i === run().phase; const done = i < run().phase;
      return `<li ${cur ? 'aria-current="step"' : done ? 'class="done"' : ''}><span class="step-number" aria-hidden="true">${done ? icon('check') : String(i + 1).padStart(2, '0')}</span>${name}</li>`;
    }).join('');
  }
  function patientCard(eyebrow, title, subtitle) {
    return `<div class="patient-card"><div class="portrait" aria-hidden="true"><canvas id="portrait" width="34" height="34"></canvas></div>
      <div><div class="eyebrow">${eyebrow}</div><h3 class="case-title" id="phase-title" tabindex="-1">${title}</h3><p>${subtitle}</p></div></div>`;
  }
  const primary = (action, label, disabled = false) => `<button type="button" class="primary" data-action="${action}" ${disabled ? 'disabled' : ''}>${label} ${icon('arrow')}</button>`;
  function renderClues(group, clues) {
    const found = run()[group];
    return `<div class="choices">${clues.map(([title, desc], i) => {
      const open = found.includes(i);
      return `<button type="button" class="choice clue${open ? ' selected' : ''}" data-action="${group}" data-value="${i}" ${open ? `aria-disabled="true" aria-describedby="clue-${group}-${i}"` : `aria-controls="clue-${group}-${i}"`}>
        <span class="choice-code" aria-hidden="true">${open ? icon('check') : '+'}</span> ${title}</button>
        <p class="clue-text" id="clue-${group}-${i}"${open ? '' : ' hidden'}>${desc}</p>`;
    }).join('')}</div>`;
  }
  function findings(includeExam) {
    const data = active(); const cur = run();
    const items = [`<li><b>Queixa</b> ${data.intro.quote}</li>`];
    cur.history.slice().sort().forEach((i) => items.push(`<li><b>Anamnese</b> ${data.history.clues[i][1]}</li>`));
    if (includeExam) cur.exam.slice().sort().forEach((i) => items.push(`<li><b>Exame</b> ${data.exam.clues[i][1]}</li>`));
    return `<details class="findings" open><summary>${icon('list')} Achados reunidos (${items.length})</summary><ul>${items.join('')}</ul></details>`;
  }
  function reactionOf(key, right) {
    const data = active();
    const r = data.reactions?.[key]?.[right ? 'right' : 'wrong'];
    if (!r) return null;
    const [who, mood, text] = r;
    const isComp = data.companion && who === data.companion.name;
    return { who, mood, text: PQ.fill(text), look: isComp ? data.companion.look : patientLook(data, run().phase), role: isComp ? data.companion.role : 'paciente' };
  }
  function renderDecision(key) {
    const data = active();
    const decision = data[key];
    const result = run()[key];
    const chosen = result.last;
    const correct = chosen === decision.correct;
    const src = data.sources[0];
    const reaction = chosen === null ? null : reactionOf(key, correct);
    const feedback = chosen === null ? '' : `
      <div class="feedback${correct ? '' : ' incorrect'}" id="feedback" tabindex="-1" role="status">
        <strong>${correct ? (result.attempts === 1 ? '✓ Boa decisão!' : '✓ Agora sim!') : '✗ Revise sua decisão'}</strong> ${decision.choices[chosen][1]}
        ${reaction ? `<div class="reaction"><canvas width="34" height="34" data-reaction="${key}"></canvas><p><b>${esc(reaction.who)}</b> “${esc(reaction.text)}”</p></div>` : ''}
        <span class="q-source">Fonte: <a class="reference" href="${src.url}" target="_blank" rel="noopener">${esc(src.label)} ↗</a></span>
      </div>`;
    const next = chosen === null ? '' : correct ? primary('advance', decision.next) : primary('retry', 'Tentar outra resposta');
    return `<p class="prompt" id="decision-prompt" tabindex="-1">${decision.prompt}</p>
      <div class="choices" role="group" aria-labelledby="decision-prompt">${decision.choices.map(([label], i) => `
        <button type="button" class="choice${i === chosen ? ` selected${correct ? '' : ' incorrect'}` : ''}" data-action="answer" data-value="${i}" ${chosen === null ? '' : 'disabled'}>
          <span class="choice-code" aria-hidden="true">${String.fromCharCode(65 + i)}</span> ${label}${i === chosen ? (correct ? ' <span class="sr-mark">✓ correta</span>' : ' <span class="sr-mark">✗ incorreta</span>') : ''}</button>`).join('')}</div>
      ${feedback}${next}`;
  }
  function nextCase() {
    const i = CASES.indexOf(active());
    return CASES.slice(i + 1).concat(CASES.slice(0, i)).find((c) => caseStatus(c).key !== 'done') || null;
  }
  function renderCase() {
    const data = active();
    const cur = run();
    const saved = record();
    let html;
    if (cur.phase === 0) {
      const memory = saved.completions ? `<p class="memory">${icon('book')} Retorno: você já atendeu ${esc(data.patient.name)} ${saved.completions}× · melhor nota ${saved.best} XP</p>` : '';
      html = cur.arrived
        ? `${patientCard('01 / ACOLHIMENTO', data.intro.title, data.patient.card)}${memory}
          <blockquote>${data.intro.quote} <cite>${data.intro.cite}</cite></blockquote>
          <p class="case-hint">${data.intro.hint}</p>${primary('advance', 'Chamar e iniciar atendimento')}`
        : `${patientCard('01 / CHEGADA', `${data.patient.name} está chegando…`, data.patient.card)}${memory}
          <p class="case-hint arriving">${icon('clock')} ${data.companion ? `${esc(data.patient.name)} entra com ${esc(data.companion.name)} e` : `${esc(data.patient.name)} entra e`} vai para a sala de espera.</p>
          ${primary('advance', 'Chamar agora')}`;
    } else if (cur.phase === 1) {
      const total = data.history.clues.length; const ready = cur.history.length === total;
      html = `${patientCard('02 / ANAMNESE', data.history.title, data.patient.short)}
        <p class="prompt">${data.history.prompt}</p>${renderClues('history', data.history.clues)}
        <p class="case-hint">${ready ? 'Você já pode passar ao exame físico.' : `Abra as ${total} perguntas para reunir as pistas.`}</p>${primary('advance', data.history.next, !ready)}`;
    } else if (cur.phase === 2) {
      const ready = cur.exam.length === data.exam.clues.length;
      html = `${patientCard('03 / EXAME', data.exam.title, data.patient.short)}${renderClues('exam', data.exam.clues)}
        ${ready ? `${findings(false)}${renderDecision('classify')}` : `<p class="case-hint">${data.exam.hint}</p>`}`;
    } else if (cur.phase === 3) {
      html = `${patientCard('04 / CONDUTA', 'Hora de decidir', data.patient.short)}<p class="case-hint summary-hint">${data.treatment.summary}</p>${findings(true)}${renderDecision('treatment')}`;
    } else {
      const points = score(); const best = record().best; const following = nextCase();
      html = `${patientCard('PLANTÃO CONCLUÍDO', data.outcome.title, `Plantão ${data.number} · Vila Murici`)}
        <blockquote>${data.outcome.quote} <cite>${data.outcome.cite}</cite></blockquote>
        <p class="case-hint">${data.outcome.text}</p>
        <div class="reward">${icon('trophy')} <div><span class="reward-badge">INSÍGNIA CONQUISTADA</span><strong>${data.outcome.badge} · ${points} / ${MAX_CASE} XP</strong>
          ${best > points ? `<small class="best-note">Sua melhor marca neste caso continua ${best} XP.</small>` : ''}</div></div>
        <div class="references">${data.sources.map((s) => `<a class="reference" href="${s.url}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join('')}</div>
        ${following ? primary('next-case', `Próximo plantão: ${following.patient.name}`) : primary('vila', 'Voltar à vila')}
        <div class="outcome-actions"><button class="secondary" data-action="ubs" type="button">Quadro de plantões</button><button class="secondary" data-action="restart" type="button">Jogar de novo</button></div>`;
    }
    byId('case-panel').innerHTML = html;
    PQSprites.drawPortrait(byId('portrait'), patientLook(data, cur.phase), patientMood(data, cur));
    byId('case-panel').querySelectorAll('[data-reaction]').forEach((cv) => {
      const key = cv.dataset.reaction; const r = reactionOf(key, run()[key].last === data[key].correct);
      if (r) PQSprites.drawPortrait(cv, r.look, r.mood);
    });
  }
  function renderMap(animate = false) {
    const data = active(); const { phase } = run(); const p = WAYPOINTS[phase];
    const wp = byId('waypoint');
    wp.hidden = !p;
    if (p) {
      wp.style.left = `${p.x}%`; wp.style.top = `${p.y - 5}%`;
      wp.setAttribute('aria-label', data.actions[phase]);
      wp.querySelector('use').setAttribute('href', `#i-${p.icon}`);
      byId('waypoint-label').textContent = p.label;
      byId('objective').textContent = data.objectives[phase];
    } else byId('objective').textContent = 'Atendimento concluído. Escolha o próximo plantão ou volte à vila.';
    if (!arriving) setupActors(animate);
    byId('quest-count').textContent = `${phase}/4`;
  }
  function renderHeader() {
    const data = active(); const [a, b] = data.heading;
    byId('chapter-title').innerHTML = `${a} <span>${b}</span><i aria-hidden="true">.</i>`;
    byId('case-kicker').textContent = `PLANTÃO ${data.number}`;
    byId('case-lede').textContent = data.summary;
    byId('case-minutes').textContent = data.minutes;
    byId('case-specialty').textContent = data.specialty;
    byId('case-number').textContent = `#${data.number}`;
    byId('map-tag').innerHTML = `${data.number} <b>·</b> ${esc(data.patient.name.toUpperCase())}`;
  }
  function focusPanel(id, scroll = false) { byId(id)?.focus({ preventScroll: !scroll }); }

  PQ.views.case = {
    render() {
      if (!active()) { PQ.go('ubs'); return; }
      renderHeader(); renderSteps(); renderCase(); renderMap(false);
      walker?.redraw();
    },
    leave() { walker?.stop(); arriving = false; patientActor?.stop(); companionActor?.stop(); },
    onKey(e, down) {
      const key = e.key.toLowerCase();
      if (down && key === 'e' && !e.repeat && WAYPOINTS[run().phase]) { approach(); return true; }
      if (!walker.dirs[key]) return false;
      if (key.startsWith('arrow') && !map().contains(document.activeElement)) return false;
      if (down) walker.hold(key); else walker.release(key);
      return true;
    },
  };

  function rerender(animate = true) { renderSteps(); renderCase(); renderMap(animate); PQ.renderHeader(); PQ.save(); }

  function advance() {
    const data = active(); const cur = run(); const { phase } = cur;
    const ok = phase === 0 || (phase === 1 && cur.history.length === data.history.clues.length) ||
      (phase === 2 && cur.classify.last === data.classify.correct) || (phase === 3 && cur.treatment.last === data.treatment.correct);
    if (!ok) return;
    if (phase === 0) {
      skipArrival();
      const p = PQ.player();
      PQ.say(map(), [{ who: PQ.docName(), role: PQ.CLASSES[p.cls].name, look: p.look, mood: 'happy', text: p.motto || PQ.trait().call }], { auto: 3200 });
      PQ.emote(byId('patient'), '?', 1600);
    }
    cur.phase += 1;
    if (cur.phase === 4) {
      record().best = Math.max(record().best, score());
      record().completions += 1;
      PQ.missionEvent?.('case');
      state.days[PQ.today()] = 1;
      PQ.grant(`case:${data.id}`, { ...PQ.REWARDS.caseFirst, label: `Primeira conclusão: ${data.patient.name}` });
      PQ.emote(byId('patient'), '♥', 2400, 'love');
      PQ.closeDialog();
    }
    PQ.play(cur.phase === 4 ? 'win' : 'step');
    rerender(true);
    focusPanel('phase-title', true);
  }
  function findClue(group, index, scroll = false) {
    const found = run()[group];
    if (!found.includes(index)) { found.push(index); PQ.play('step'); PQ.emote(byId('patient'), group === 'history' ? '…' : '✚', 1000); rerender(false); }
    byId('case-panel').querySelector(`[data-action="${group}"][data-value="${index}"]`)?.focus({ preventScroll: !scroll });
  }
  const decisionKey = () => (run().phase === 2 ? 'classify' : 'treatment');
  function answer(i) {
    const key = decisionKey(); const r = run()[key];
    if (r.last !== null) return;
    r.last = i; r.attempts += 1;
    const right = i === active()[key].correct;
    PQ.play(right ? 'step' : 'retry');
    rerender(false);
    const reaction = reactionOf(key, right);
    if (reaction) PQ.say(map(), [{ ...reaction }], { auto: 6500 });
    PQ.emote(byId('patient'), right ? '♥' : '💧', 2200, right ? 'love' : 'sweat');
    focusPanel('feedback', true);
  }
  function retry() { run()[decisionKey()].last = null; PQ.closeDialog(); rerender(false); focusPanel('decision-prompt'); }
  function interact() {
    const data = active(); const { phase } = run();
    if (phase === 0) { advance(); return; }
    if (phase === 1 || phase === 2) {
      const group = phase === 1 ? 'history' : 'exam';
      const missing = data[group].clues.findIndex((_, i) => !run()[group].includes(i));
      if (missing !== -1) { findClue(group, missing, true); return; }
    }
    focusPanel(phase >= 2 ? 'decision-prompt' : 'phase-title', true);
  }
  function approach() {
    const p = WAYPOINTS[run().phase];
    if (run().phase === 0) skipArrival();
    if (p) walker.walkTo(p.x + (p.x > 60 ? -8 : 8), p.y + 4, interact);
  }

  function bindCase() {
    walker = PQ.createWalker({
      area: map(), player: byId('player'), canvas: byId('player-sprite'),
      floor: { left: 27, right: 76, top: 60, bottom: 93 }, start: { x: 50, y: 88 },
      zOf: (pos) => (pos.y >= Number.parseFloat(byId('patient').style.top || '0') ? '3' : '1'),
    });
    byId('case-panel').addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (!b || b.disabled) return;
      const { action, value } = b.dataset;
      if (action === 'advance') { if (run().phase === 0) approach(); else advance(); }
      else if (action === 'history' || action === 'exam') findClue(action, Number(value));
      else if (action === 'answer') answer(Number(value));
      else if (action === 'retry') retry();
      else if (action === 'ubs') { state.current = null; PQ.go('ubs'); }
      else if (action === 'vila') { state.current = null; PQ.go('vila'); }
      else if (action === 'next-case') { const n = nextCase(); if (n) openCase(n.id, { reset: state.cases[n.id].run.phase === 4 }); }
      else if (action === 'restart') openCase(state.current, { reset: true });
    });
    byId('waypoint').addEventListener('click', (e) => { e.stopPropagation(); approach(); });
    map().addEventListener('click', (e) => {
      if (e.target.closest('.dlg')) return;
      const r = map().getBoundingClientRect();
      map().focus({ preventScroll: true });
      walker.walkTo(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    });
    byId('back-ubs').addEventListener('click', () => { state.current = null; PQ.go('ubs'); });
  }

  PQ.bindUbs = () => { bindBoard(); bindCase(); };
})();
