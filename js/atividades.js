/*
 * Plantão Quest — atividades: biblioteca, horta e lago, gruta, cronograma e Pomodoro.
 * Todas usam o mesmo acervo (data/acervo.js) e a mesma fila de revisão.
 */
(function atividades() {
  'use strict';
  const { state, byId, icon, esc } = PQ;
  const PROF = { skin: '#c98e63', hairStyle: 'coque', hairColor: '#d9d9d9', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#6b4a8a', pants: '#3a3f4a', acc: ['oculos', 'brinco'] };
  const TAUNTS = { slime: 'Glub, glub… vou secar você até a última gota!', mosquito: 'Bzzzz… quem tem medo de uma picadinha?', bacilo: 'Hehe… eu me escondo bem fundo nos pulmões.', cristal: 'Hum, que doce… vou subir a sua glicemia até o osmômetro estourar!' };
  const wrongIndex = (q, avoid) => { const opts = q.alternativas.map((_, i) => i).filter((i) => i !== q.correta && i !== avoid); return opts[Math.floor(Math.random() * opts.length)]; };
  const FISH = ['Tambaqui', 'Pacu', 'Jaraqui', 'Tucunaré', 'Pirarucu'];
  const STAGES = ['Semente', 'Broto', 'Crescendo', 'Pronta para colher'];
  const focusEl = (id) => byId(id)?.focus({ preventScroll: false });
  const sceneHeader = (kicker, title, extra = '') => `
    <div class="view-head">
      <button type="button" class="toolbar-button back-button" data-go="vila">${icon('back')} Vila</button>
      <div class="kicker"><span class="kicker-mark"></span> ${kicker}</div>
      <h1 class="view-title" tabindex="-1">${title}</h1>
      <div class="theme-line">${extra}<button type="button" class="theme-switch" data-open-theme>${icon('list')} Tema: <b>${esc(PQ.theme().short)}</b> · trocar</button></div>
    </div>`;

  /* ================= Biblioteca ================= */
  let autoplay = null;
  let asking = false;
  const lesson = (id) => (state.lessons[id] ||= { step: 0, q: { last: null, attempts: 0 }, done: false, completions: 0 });

  function stopAutoplay() { clearInterval(autoplay); autoplay = null; }

  function renderLibrary() {
    const t = PQ.theme(); const a = t.aula; const L = lesson(t.id);
    const n = a.passos.length;
    const finished = L.step >= n;
    const k = a.pergunta.depoisDoPasso;
    const qCorrect = L.q.last === a.pergunta.correta;
    const showQ = !finished && L.step === k && (asking || (L.q.last !== null && !qCorrect));
    const boxes = a.passos.map((p, i) => {
      if (i > L.step && !finished) return `<div class="chalk-box future" aria-hidden="true"><span>parte ${i + 1}</span></div>`;
      return `<div class="chalk-box${i === L.step ? ' current' : ''}"><b>${esc(p.quadro[0])}</b>${p.quadro.slice(1).map((l) => `<span>${esc(l)}</span>`).join('')}</div>`;
    }).join('');
    let overlay = '';
    if (showQ) {
      const pq = a.pergunta; const ans = L.q.last; const ok = ans === pq.correta;
      overlay = `<div class="chalk-question" role="group" aria-labelledby="lesson-q">
        <small>PERGUNTA DA PROF.ª IRACEMA</small>
        <p id="lesson-q" tabindex="-1">${esc(pq.enunciado)}</p>
        <div class="q-options">${pq.alternativas.map((alt, i) => `<button type="button" class="q-option${ans === null ? '' : i === ans ? (ok ? ' right' : ' wrong') : ' dim'}" data-lesson-answer="${i}" ${ans === null ? '' : 'disabled'}>
          <span class="choice-code">${String.fromCharCode(65 + i)}</span><span>${esc(alt)}${i === ans ? (ok ? ' ✓' : ' ✗') : ''}</span></button>`).join('')}</div>
        ${ans === null ? '' : `<div class="feedback${ok ? '' : ' incorrect'}" id="lesson-feedback" tabindex="-1"><strong>${ok ? '✓ Isso mesmo!' : '✗ Ainda não'}</strong> ${ok ? esc(pq.explicacao) : 'Releia o quadro e tente outra alternativa.'}</div>
          ${ok ? `<button type="button" class="primary" data-lesson="next">Continuar a aula ${icon('arrow')}</button>` : `<button type="button" class="primary" data-lesson="retry-q">Tentar de novo ${icon('arrow')}</button>`}`}
      </div>`;
    }
    if (finished) {
      overlay = `<div class="chalk-question done" role="status">
        <small>AULA CONCLUÍDA</small><p id="lesson-q" tabindex="-1">${esc(a.titulo)}</p>
        <span class="q-source">Fonte: ${PQ.fonteLink(a.fonte)}</span>
        <div class="lesson-end">
          ${state.notebook[t.id] ? '<span class="status-pill">ESQUEMA NA CADERNETA ✓</span>' : `<button type="button" class="primary" data-lesson="save">Guardar esquema na caderneta ${icon('book')}</button>`}
          <button type="button" class="secondary" data-lesson="practice">Praticar no lago</button>
          <button type="button" class="secondary" data-lesson="restart">Rever a aula</button>
        </div></div>`;
    }
    const fala = finished ? 'Muito bem! Agora pratique na horta e no lago: as perguntas são sobre este mesmo tema.' : a.passos[Math.min(L.step, n - 1)].fala;
    byId('view-biblioteca').innerHTML = `
      ${sceneHeader('BIBLIOTECA · AULA', `Aula de <span>${esc(t.short)}</span><i aria-hidden="true">.</i>`)}
      <div class="split">
        <section class="lesson-panel" aria-label="Lousa da aula">
          <div class="lousa" id="lousa">
            <div class="lousa-title">${esc(a.titulo)}</div>
            <div class="lousa-grid">${boxes}</div>
            ${overlay}
          </div>
          <div class="prof-bar">
            <div class="prof"><canvas id="prof-sprite" width="18" height="26"></canvas><span>Prof.ª Iracema</span></div>
            <p class="prof-speech" aria-live="polite">${esc(fala)}</p>
            <div class="lesson-controls">
              <button type="button" class="ctrl" data-lesson="prev" aria-label="Voltar uma parte" ${L.step === 0 ? 'disabled' : ''}>${icon('back')}</button>
              <button type="button" class="ctrl" data-lesson="play" aria-label="${autoplay ? 'Pausar' : 'Reproduzir automaticamente'}" aria-pressed="${!!autoplay}" ${finished || showQ ? 'disabled' : ''}>${autoplay ? '❚❚' : '▶'}</button>
              <button type="button" class="ctrl" data-lesson="next" aria-label="Avançar" ${finished || (showQ && !qCorrect) ? 'disabled' : ''}>${icon('arrow')}</button>
            </div>
          </div>
          <p class="lesson-meta">Parte ${Math.min(L.step + 1, n)} de ${n} · ${finished ? 'concluída' : 'clique em avançar ou na seta'} · Fonte: ${PQ.fonteLink(a.fonte)}</p>
        </section>
        <aside class="side-card ficha">
          <div class="eyebrow">FICHA DO TEMA</div>
          <h2 class="side-title">${esc(t.name)}</h2>
          <p>${esc(t.ficha.resumo)}</p>
          <h3 class="mini-heading">Pontos-chave</h3>
          <ul class="key-points">${t.ficha.pontos.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          <h3 class="mini-heading">Fontes</h3>
          <div class="references">${t.ficha.fontes.map((f) => PQ.fonteLink(f)).join('')}</div>
          <p class="disclaimer"><b>Não substitui o professor.</b> A aula é um reforço para fixar e revisar o que você estuda, com personagens fictícios.</p>
        </aside>
      </div>`;
    PQSprites.drawChar(byId('prof-sprite'), PROF, { flip: true, mood: 'happy' });
  }

  function lessonAction(action, value) {
    const t = PQ.theme(); const a = t.aula; const L = lesson(t.id); const n = a.passos.length;
    const k = a.pergunta.depoisDoPasso;
    if (action === 'next') {
      if (L.step >= n) return;
      if (L.step === k && L.q.last !== a.pergunta.correta) { asking = true; stopAutoplay(); renderLibrary(); focusEl('lesson-q'); return; }
      L.step += 1;
      asking = false;
      if (L.step >= n) {
        stopAutoplay();
        L.done = true; L.completions += 1; PQ.missionEvent?.('lesson');
        state.days[PQ.today()] = 1;
        PQ.grant(`lesson:${t.id}`, { ...PQ.REWARDS.lesson, label: `Aula de ${t.short} concluída` });
        PQ.play('win');
      } else PQ.play('step');
      PQ.save(); renderLibrary(); PQ.renderHeader();
      if (L.step >= n) focusEl('lesson-q');
    } else if (action === 'prev') {
      if (L.step > 0) { L.step = Math.min(L.step, n) - 1; asking = false; PQ.save(); renderLibrary(); }
    } else if (action === 'play') {
      if (autoplay) stopAutoplay();
      else autoplay = setInterval(() => { if (state.view !== 'biblioteca') { stopAutoplay(); return; } lessonAction('next'); }, 6500);
      renderLibrary();
      byId('view-biblioteca').querySelector('[data-lesson="play"]')?.focus();
    } else if (action === 'answer') {
      if (L.q.last !== null) return;
      L.q.last = value; L.q.attempts += 1;
      PQ.play(value === a.pergunta.correta ? 'step' : 'retry');
      PQ.save(); renderLibrary(); focusEl('lesson-feedback');
    } else if (action === 'retry-q') { L.q.last = null; PQ.save(); renderLibrary(); focusEl('lesson-q'); }
    else if (action === 'save') { state.notebook[t.id] = Date.now(); PQ.save(); PQ.toast('Esquema guardado na caderneta do diário.'); renderLibrary(); }
    else if (action === 'practice') PQ.go('horta', { fishNow: true });
    else if (action === 'restart') { L.step = 0; L.q = { last: null, attempts: 0 }; asking = false; PQ.save(); renderLibrary(); focusEl('lousa'); }
  }

  PQ.views.biblioteca = { render() { asking = false; renderLibrary(); }, leave() { stopAutoplay(); } };

  /* ================= Horta e lago ================= */
  let selectedPlot = 0;
  let fishing = false;
  let effect = null;

  function activityTitle(act, t) {
    if (act.kind === 'harvest') return `Hora de colher: ${PQArt.CROPS[act.plot].name}!`;
    return `Fisgou um ${act.fish}! Responda para puxar.`;
  }

  function renderHorta(opts = {}) {
    const t = PQ.theme();
    const plots = state.garden.plots;
    const act = state.activity && PQ.question(state.activity.qid)?.theme.id === t.id ? state.activity : null;
    if (state.activity && !act) state.activity = null;
    const playerPos = act?.kind === 'fish' || fishing ? { x: 67, y: 74 } : [{ x: 15, y: 29 }, { x: 34, y: 29 }, { x: 15, y: 59 }, { x: 34, y: 59 }][selectedPlot];
    const open = PQ.openReviews(t.id).length;
    const c = PQ.counts(t.id);
    let panel;
    if (act) {
      const done = act.answered !== null;
      const q = PQ.question(act.qid);
      const ok = done && act.answered === q.correta;
      let result = '';
      if (done) {
        result = act.kind === 'harvest'
          ? (ok ? `<span class="reward-line">★ Colheita de ouro: ${PQArt.CROPS[act.plot].name} de ouro foi para o cesto.</span>` : `<span class="reward-line">Colheita simples: ${PQArt.CROPS[act.plot].name} foi para o cesto, e a pergunta volta na revisão.</span>`)
          : (ok ? `<span class="reward-line">🐟 ${act.fish} foi para o cesto.</span>` : `<span class="reward-line">O ${act.fish} escapou. Lance o anzol de novo.</span>`);
      }
      panel = `<div class="side-card activity-card">
        <div class="eyebrow">${act.kind === 'harvest' ? 'COLHEITA' : 'PESCARIA'} · ${esc(t.name.toUpperCase())}</div>
        <h2 class="side-title" id="act-title" tabindex="-1">${esc(activityTitle(act, t))}</h2>
        ${PQ.questionBlock(act.qid, { answered: act.answered, reward: done && ok ? act.reward : null, extra: result, elim: act.elim ?? null })}
        ${done ? `<button type="button" class="primary" data-horta="continue">${act.kind === 'fish' ? 'Lançar de novo' : 'Voltar à horta'} ${icon('arrow')}</button>
          <button type="button" class="secondary" data-horta="leave">Terminar e voltar</button>` : '<p class="muted small">Sem relógio: leia com calma.</p>'}
      </div>`;
    } else {
      const p = plots[selectedPlot];
      const crop = PQArt.CROPS[selectedPlot];
      panel = `<div class="side-card">
        <div class="eyebrow">HORTA E LAGO · ${esc(t.name.toUpperCase())}</div>
        <h2 class="side-title" id="act-title" tabindex="-1">Plante, regue, pesque</h2>
        <p class="muted">Cada rega faz a planta crescer. Na colheita, acertar rende colheita de ouro; errar rende colheita simples e a pergunta volta na revisão. No anzol aparece uma pergunta de ${esc(t.short.toLowerCase())}${open ? `, começando pelas ${open} dúvidas da sua fila` : ''}.</p>
        <div class="plot-card"><strong>Canteiro ${selectedPlot + 1}: ${esc(crop.name)}</strong>
          <div class="stage-bar" aria-label="Estágio ${p.stage + 1} de 4">${STAGES.map((_, i) => `<i class="${i <= p.stage ? 'on' : ''}"></i>`).join('')}</div>
          <small>${STAGES[p.stage]}</small>
          ${p.stage < 3 ? `<button type="button" class="primary" data-horta="water">💧 Regar o canteiro</button>` : `<button type="button" class="primary" data-horta="harvest">🧺 Colher e responder</button>`}
        </div>
        <div class="plot-card"><strong>Lago da vila</strong><small>${fishing ? 'Esperando o peixe morder…' : 'Lance o anzol e responda quando o peixe morder.'}</small>
          <button type="button" class="primary" data-horta="fish" ${fishing ? 'disabled' : ''}>🎣 ${fishing ? 'Aguardando…' : 'Lançar o anzol'}</button></div>
        <p class="basket-line">Cesto de ${esc(t.short)}: <b>${c.harvest}</b> colheitas · <b>${c.fish}</b> peixes · <b>${open}</b> ${open === 1 ? 'dúvida' : 'dúvidas'} na fila</p>
      </div>`;
    }
    byId('view-horta').innerHTML = `
      ${sceneHeader('HORTA E PESCARIA', `Revise <span>sem perceber</span><i aria-hidden="true">.</i>`)}
      <div class="split">
        <section class="scene-panel sunset" aria-label="Horta e lago">
          <div class="scene" id="horta-scene">
            <canvas id="horta-canvas" width="320" height="180"></canvas>
            ${PQArt.PLOTS.map((pl, i) => `<button type="button" class="plot-hit${i === selectedPlot ? ' selected' : ''}" data-plot="${i}" style="left:${(pl.x / 320) * 100}%;top:${(pl.y / 180) * 100}%;width:${(52 / 320) * 100}%;height:${(40 / 180) * 100}%" aria-label="Canteiro ${i + 1}, ${PQArt.CROPS[i].name}: ${STAGES[plots[i].stage]}" ${act ? 'disabled' : ''}><span>${STAGES[plots[i].stage]}</span></button>`).join('')}
            <button type="button" class="pier-hit" data-horta="fish" style="left:63%;top:62%" aria-label="Pescar no píer" ${act || fishing ? 'disabled' : ''}><span>🎣 Pescar</span></button>
            <div class="sprite scene-player" style="left:${playerPos.x}%;top:${playerPos.y}%"><canvas id="horta-player" width="18" height="26"></canvas></div>
            ${fishing || act?.kind === 'fish' ? `<span class="bobber${act?.kind === 'fish' && act.answered === null ? ' bite' : ''}" style="left:76%;top:52%" aria-hidden="true"></span>` : ''}
            ${effect?.type === 'water' ? `<span class="drops" style="left:${((PQArt.PLOTS[effect.plot].x + 26) / 320) * 100}%;top:${((PQArt.PLOTS[effect.plot].y + 8) / 180) * 100}%" aria-hidden="true"></span>` : ''}
            ${effect?.type === 'gain' ? `<span class="gain-pop" style="left:${effect.x}%;top:${effect.y}%" aria-hidden="true">${esc(effect.text)}</span>` : ''}
            <span class="map-tag">HORTA E LAGUINHO <b>·</b> FIM DE TARDE</span>
          </div>
        </section>
        <aside class="activity-side" id="horta-side">${panel}</aside>
      </div>`;
    PQArt.drawHorta(byId('horta-canvas'), plots);
    PQSprites.drawChar(byId('horta-player'), PQ.player().look, { item: act?.kind === 'fish' || fishing ? 'rod' : 'can' });
    effect = null;
    if (opts.focus) focusEl(opts.focus);
  }

  function startActivity(kind, extra) {
    const t = PQ.theme();
    const qid = PQ.pickQuestion(t.id);
    state.activity = { kind, qid, answered: null, ...extra };
    PQ.save();
    renderHorta({ focus: 'act-title' });
    if (matchMedia('(max-width: 900px)').matches) byId('horta-side')?.scrollIntoView({ behavior: PQ.reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  }

  function hortaAction(action, value) {
    const t = PQ.theme();
    if (action === 'plot') { selectedPlot = value; renderHorta({ focus: 'act-title' }); return; }
    if (action === 'water') {
      const p = state.garden.plots[selectedPlot];
      if (p.stage < 3) { p.stage = Math.min(3, p.stage + (PQ.hasPerk('familia') ? 2 : 1)); effect = { type: 'water', plot: selectedPlot }; PQ.play('step'); PQ.save(); }
      renderHorta();
      byId('horta-side').querySelector('[data-horta]')?.focus();
      return;
    }
    if (action === 'harvest') { if (state.garden.plots[selectedPlot].stage === 3) startActivity('harvest', { plot: selectedPlot }); return; }
    if (action === 'fish') {
      if (fishing || state.activity) return;
      fishing = true; PQ.play('splash'); renderHorta();
      setTimeout(() => { fishing = false; if (state.view === 'horta') startActivity('fish', { fish: FISH[Math.floor(Math.random() * (Math.random() < 0.15 ? 5 : 4))] }); }, PQ.reducedMotion.matches ? 0 : 1300);
      return;
    }
    if (action === 'answer') {
      const act = state.activity;
      if (!act || act.answered !== null || value === act.elim) return;
      const q = PQ.question(act.qid);
      const ok = value === q.correta;
      act.answered = value;
      act.reward = PQ.recordAnswer(act.qid, ok, act.kind);
      if (act.kind === 'harvest') {
        const crop = PQArt.CROPS[act.plot].name;
        PQ.addItem(ok ? `${crop} de ouro ★` : crop); PQ.counts(t.id).harvest += 1; state.garden.plots[act.plot].stage = 0;
        effect = { type: 'gain', text: ok ? `★ ${crop} de ouro` : `+1 ${crop}`, x: 25, y: 40 };
      } else if (ok) { PQ.addItem(act.fish); PQ.counts(t.id).fish += 1; effect = { type: 'gain', text: `+1 ${act.fish}`, x: 76, y: 40 }; }
      PQ.play(ok ? 'win' : 'retry');
      PQ.save(); PQ.renderHeader();
      renderHorta({ focus: 'q-feedback' });
      return;
    }
    if (action === 'elim') { const act = state.activity; if (act && act.answered === null && act.elim == null && PQ.hasPerk('clinica')) { act.elim = wrongIndex(PQ.question(act.qid)); PQ.play('step'); PQ.save(); renderHorta({ focus: 'q-stem' }); } return; }
    if (action === 'continue') { const kind = state.activity?.kind; state.activity = null; PQ.save(); if (kind === 'fish') hortaAction('fish'); else renderHorta({ focus: 'act-title' }); return; }
    if (action === 'leave') { state.activity = null; PQ.go('vila'); }
  }

  PQ.views.horta = {
    render(opts = {}) {
      renderHorta();
      if (opts.fishNow && !state.activity) hortaAction('fish');
    },
    leave() { fishing = false; },
  };

  /* ================= Gruta Velha ================= */
  let caveFx = null;
  let caveFxText = '';
  const ENEMY_HP = 36;
  const playerMax = () => 30 + 2 * (PQ.level() - 1) + (PQ.hasPerk('emergencia') ? 10 : 0);
  const hitDamage = (q) => 6 * q.dificuldade;
  const hurtDamage = (q) => 4 + 2 * q.dificuldade;
  function newCave(t) {
    const queue = [];
    for (let i = 0; i < 5; i++) { const q = PQ.pickQuestion(t.id, { exclude: queue }); if (q) queue.push(q); }
    const maxHp = playerMax();
    return { theme: t.id, queue, enemyHp: ENEMY_HP, enemyMax: ENEMY_HP, playerHp: maxHp, maxHp, streak: 0, turn: 0, elim: null, currentQ: queue[0], answered: null, result: null, msg: '' };
  }

  function renderGruta(opts = {}) {
    const t = PQ.theme();
    const cave = state.cave && state.cave.theme === t.id && state.cave.enemyMax ? state.cave : null;
    const m = t.monster;
    const battle = cave && !cave.result;
    const hpE = cave ? cave.enemyHp : ENEMY_HP; const maxE = cave ? cave.enemyMax : ENEMY_HP;
    const maxP = cave?.maxHp || playerMax();
    const hpP = cave ? cave.playerHp : maxP;
    let below;
    if (!cave) {
      below = `<div class="side-card cave-card"><h2 class="side-title" id="cave-title" tabindex="-1">${esc(m.name)} bloqueia a passagem</h2>
        <p>Cada questão de ${esc(t.short.toLowerCase())} é um golpe. Acertou, bateu. Errou, ele revida e a dúvida volta mais adiante na expedição, até virar acerto.</p>
        <ul class="rules"><li>${esc(m.name)}: ${ENEMY_HP} de vida · você: ${maxP} de vida</li><li>Questões mais difíceis causam mais dano (nível 1: 6 · nível 2: 12 · nível 3: 18)</li>${PQ.hasPerk('cirurgia') ? '<li>Mão firme: acertos seguidos causam dano crítico</li>' : ''}${PQ.hasPerk('clinica') ? '<li>Olho clínico: elimine uma alternativa errada por turno</li>' : ''}<li>Sem relógio: leia com calma</li><li>Dúvidas da sua fila entram primeiro</li></ul>
        <button type="button" class="primary" data-cave="start">⚔ Começar a batalha ${icon('arrow')}</button></div>`;
    } else if (cave.result) {
      const win = cave.result === 'win';
      below = `<div class="side-card cave-card"><h2 class="side-title" id="cave-title" tabindex="-1">${win ? `Vitória! ${esc(m.name)} recuou.` : 'Você recuou da gruta.'}</h2>
        <p>${win ? `Você ganhou um Cristal da gruta${cave.firstWin ? ` e o bônus da primeira vitória (+${PQ.REWARDS.battle.xp} XP, +${PQ.REWARDS.battle.coins} moedas)` : ''}.` : 'As dúvidas desta expedição ficaram na fila de revisão. Revise na horta e no lago e volte mais forte.'}</p>
        <div class="lesson-end"><button type="button" class="primary" data-cave="start">${win ? 'Nova expedição' : 'Tentar de novo'} ${icon('arrow')}</button>
        <button type="button" class="secondary" data-go="horta">Revisar na horta</button><button type="button" class="secondary" data-go="vila">Voltar à vila</button></div></div>`;
    } else {
      const q = PQ.question(cave.currentQ);
      const done = cave.answered !== null;
      const ok = done && cave.answered === q.correta;
      const ends = done && (cave.enemyHp === 0 || cave.playerHp === 0);
      below = `<div class="side-card cave-card">
        <div class="turn-line"><span>Turno ${cave.turn + (done ? 0 : 1)} · dano deste golpe: ${hitDamage(q)}</span><span>Sem relógio: leia com calma</span></div>
        ${PQ.questionBlock(cave.currentQ, { answered: cave.answered, grid: true, elim: cave.elim ?? null, reward: ok ? cave.reward : null, extra: done ? `<span class="reward-line">${esc(cave.msg)}</span>` : '' })}
        ${done ? `<button type="button" class="primary" data-cave="next">${ends ? 'Ver resultado' : 'Próximo turno'} ${icon('arrow')}</button>` : '<p class="muted small">Dica: no teclado, use as teclas 1 a 4.</p>'}
      </div>`;
    }
    byId('view-gruta').innerHTML = `
      ${sceneHeader('GRUTA VELHA · RPG', `Cada questão <span>é um golpe</span><i aria-hidden="true">.</i>`)}
      <div class="cave-layout">
        <section class="arena" aria-label="Arena da gruta">
          <canvas id="cave-bg" width="320" height="150"></canvas>
          <span class="torch" style="left:12.8%"></span><span class="torch" style="left:87.8%"></span>
          <div class="hp-box left"><b>${esc(PQ.docName())} · Nv ${PQ.level()}</b><div class="hp"><i style="width:${(hpP / maxP) * 100}%"></i></div><small>${hpP}/${maxP}</small></div>
          <div class="hp-box right"><b>${esc(m.name)}</b><div class="hp enemy"><i style="width:${(hpE / maxE) * 100}%"></i></div><small>${hpE}/${maxE}</small></div>
          <div class="sprite arena-player${caveFx === 'hurt' ? ' hurt' : ''}${caveFx === 'hit' || caveFx === 'crit' ? ' lunge' : ''}"><canvas id="cave-player" width="18" height="26"></canvas></div>
          <div class="monster${caveFx === 'hit' || caveFx === 'crit' ? ' hit' : ''}${caveFx === 'hurt' ? ' attack' : ''}${cave?.result === 'win' ? ' gone' : ''}"><canvas id="cave-monster" width="32" height="32"></canvas></div>
          ${battle ? `<span class="bubble${cave.answered === null ? '' : cave.answered === PQ.question(cave.currentQ).correta ? ' good' : ' bad'}">${cave.answered === null ? 'Sua vez: responda para atacar!' : esc(cave.msg.split('.')[0])}</span>` : ''}
          ${caveFx === 'hit' || caveFx === 'crit' ? `<span class="slash${caveFx === 'crit' ? ' crit' : ''}" aria-hidden="true"></span>` : ''}
        </section>
        ${below}
      </div>`;
    PQArt.drawGruta(byId('cave-bg'));
    PQSprites.drawChar(byId('cave-player'), PQ.player().look, { item: 'sword', mood: caveFx === 'hurt' ? 'sad' : 'neutral' });
    PQArt.drawMonster(byId('cave-monster'), m.kind, m.colors, 0);
    const arena = byId('view-gruta').querySelector('.arena');
    if (caveFx === 'crit') { PQ.floatText(arena, `-${caveFxText} CRÍTICO!`, 70, 38, 'crit'); arena.classList.add('shake'); }
    else if (caveFx === 'hit') PQ.floatText(arena, `-${caveFxText}`, 70, 40, 'dmg');
    else if (caveFx === 'hurt') { PQ.floatText(arena, `-${caveFxText}`, 24, 44, 'hurt'); arena.classList.add('shake'); }
    caveFx = null;
    if (opts.focus) focusEl(opts.focus);
  }

  function caveAction(action, value) {
    const t = PQ.theme();
    if (action === 'start') {
      state.cave = newCave(t); PQ.save(); renderGruta({ focus: 'q-stem' });
      const p = PQ.player();
      PQ.say(byId('view-gruta').querySelector('.arena'), [
        { who: t.monster.name, role: 'chefe da Gruta Velha', monster: t.monster, text: TAUNTS[t.monster.kind] || 'Grrr…' },
        { who: PQ.docName(), role: PQ.CLASSES[p.cls].name, look: p.look, mood: 'neutral', text: PQ.trait().battle },
      ], { auto: 5000 });
      return;
    }
    if (action === 'elim') { const cv = state.cave; if (cv && cv.answered === null && cv.elim == null && PQ.hasPerk('clinica')) { cv.elim = wrongIndex(PQ.question(cv.currentQ)); PQ.play('step'); PQ.save(); renderGruta({ focus: 'q-stem' }); } return; }
    const cave = state.cave;
    if (!cave || cave.theme !== t.id) return;
    if (action === 'answer') {
      if (cave.answered !== null || cave.result || value === cave.elim) return;
      const q = PQ.question(cave.currentQ);
      const ok = value === q.correta;
      cave.answered = value;
      cave.reward = PQ.recordAnswer(cave.currentQ, ok, 'cave');
      cave.turn = (cave.turn || 0) + 1;
      if (ok) {
        cave.streak = (cave.streak || 0) + 1;
        const crit = PQ.hasPerk('cirurgia') && cave.streak >= 2;
        const d = hitDamage(q) * (crit ? 2 : 1);
        cave.enemyHp = Math.max(0, cave.enemyHp - d); cave.queue.shift();
        if (crit) cave.crits = (cave.crits || 0) + 1;
        cave.msg = `${crit ? 'Golpe crítico' : 'Golpe certeiro'}! -${d} em ${t.monster.name}.`;
        caveFx = crit ? 'crit' : 'hit'; caveFxText = d; PQ.play(crit ? 'crit' : 'hit');
      } else {
        const d = hurtDamage(q);
        cave.streak = 0; cave.playerHp = Math.max(0, cave.playerHp - d); cave.queue.push(cave.queue.shift());
        cave.msg = `Errou: essa dúvida volta mais adiante. ${t.monster.name} revidou: -${d} de vida.`;
        caveFx = 'hurt'; caveFxText = d; PQ.play('hurt');
      }
      PQ.save(); PQ.renderHeader(); renderGruta({ focus: 'q-feedback' });
      return;
    }
    if (action === 'next') {
      if (cave.answered === null) return;
      cave.answered = null; cave.reward = null; cave.elim = null;
      if (cave.enemyHp > 0 && cave.playerHp > 0 && !cave.queue.length) {
        const extra = PQ.pickQuestion(t.id, { exclude: [cave.currentQ] });
        if (extra) cave.queue.push(extra);
      }
      if (cave.enemyHp <= 0) {
        cave.result = 'win';
        state.wins[t.id] = (state.wins[t.id] || 0) + 1;
        PQ.missionEvent?.('cave');
        PQ.addItem('Cristal da gruta');
        cave.firstWin = PQ.grant(`battle:${t.id}`, { ...PQ.REWARDS.battle, label: `Primeira vitória contra ${t.monster.name}` });
        PQ.play('win');
        setTimeout(() => { const ar = byId('view-gruta').querySelector('.arena'); const p = PQ.player(); if (ar) PQ.say(ar, [{ who: PQ.docName(), role: PQ.CLASSES[p.cls].name, look: p.look, mood: 'happy', text: PQ.trait().win }], { auto: 4000 }); }, 50);
      } else if (cave.playerHp <= 0) {
        cave.result = 'lose';
      } else cave.currentQ = cave.queue[0];
      PQ.save(); PQ.renderHeader(); renderGruta({ focus: cave.result ? 'cave-title' : 'q-stem' });
    }
  }

  PQ.views.gruta = {
    render() { renderGruta(); },
    onKey(e, down) {
      if (!down) return false;
      const cave = state.cave;
      if (cave && !cave.result && cave.answered === null && ['1', '2', '3', '4'].includes(e.key)) { caveAction('answer', Number(e.key) - 1); return true; }
      return false;
    },
  };

  /* ================= Pomodoro ================= */
  const pomo = () => state.pomodoro;
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  function remaining() { const p = pomo(); return p.running ? Math.max(0, Math.ceil((p.endsAt - Date.now()) / 1000)) : p.remaining; }
  function pomoComplete() {
    const p = pomo();
    p.running = false; p.endsAt = null;
    if (p.mode === 'focus') {
      p.sessions += 1; state.days[PQ.today()] = 1;
      p.mode = 'rest'; p.remaining = p.rest * 60;
      PQ.toast(`Pomodoro concluído! Faça uma pausa de ${p.rest} minutos.`, 'reward', 6000);
    } else {
      p.mode = 'focus'; p.remaining = p.focus * 60;
      PQ.toast('Pausa encerrada. Pronto para outro Pomodoro?', 'info', 6000);
    }
    PQ.play('win'); PQ.save();
    if (state.view === 'mural') renderMural();
  }
  function pomoAction(action, value) {
    const p = pomo();
    if (action === 'toggle') {
      if (p.running) { p.remaining = remaining(); p.running = false; p.endsAt = null; }
      else { p.running = true; p.endsAt = Date.now() + p.remaining * 1000; }
    } else if (action === 'reset') { p.running = false; p.endsAt = null; p.remaining = (p.mode === 'focus' ? p.focus : p.rest) * 60; }
    else if (action === 'preset') { const [f, r] = value.split('/').map(Number); p.focus = f; p.rest = r; p.running = false; p.endsAt = null; p.mode = 'focus'; p.remaining = f * 60; }
    PQ.save(); renderMural(); PQ.renderHeader();
    byId('view-mural').querySelector(`[data-pomo="${action}"]`)?.focus();
  }
  PQ.pomodoroChip = () => {
    const chip = byId('pomo-chip');
    if (!chip) return;
    const p = pomo();
    chip.hidden = !p.running;
    if (p.running) chip.querySelector('b').textContent = `${p.mode === 'focus' ? 'Foco' : 'Pausa'} ${fmt(remaining())}`;
  };
  setInterval(() => {
    const p = pomo();
    if (!p.running) return;
    if (remaining() <= 0) { pomoComplete(); PQ.renderHeader(); return; }
    PQ.pomodoroChip();
    const t = byId('pomo-time');
    if (t) t.textContent = fmt(remaining());
  }, 1000);

  /* ================= Cronograma ================= */
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const TEMPLATE = [
    ['aula', 'Assistir à aula e ler a ficha na biblioteca'], ['caso', 'Atender o caso do tema no posto'], ['horta', 'Colher na horta respondendo uma pergunta'],
    ['pesca', 'Pescar 2 peixes no lago'], ['gruta', 'Vencer a batalha na Gruta Velha'], ['revisao', 'Resolver uma dúvida da fila'],
    ['caso100', 'Rejogar o caso até tirar 100 XP'], ['todas', 'Responder todas as questões do tema'], ['pomo2', 'Concluir 2 Pomodoros'],
    ['acertar', 'Acertar cada questão do tema ao menos uma vez'], ['gruta2', 'Vencer a gruta pela segunda vez'], ['final', 'Revisão final: zerar a fila de dúvidas'],
  ];
  const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const label = (s) => { const d = parseDate(s); return `${WEEKDAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };

  function autoDone(task) {
    const th = PQ.themeOf(task.theme); if (!th) return false;
    const qs = th.questoes.map((q) => q.id);
    const c = PQ.counts(th.id);
    const cases = PQ.casesOfTheme(th.id).map((x) => state.cases[x.id]);
    switch (task.type) {
      case 'aula': return !!state.lessons[th.id]?.done;
      case 'caso': return cases.some((x) => x.completions > 0);
      case 'horta': return c.harvest >= 1;
      case 'pesca': return c.fish >= 2;
      case 'gruta': return (state.wins[th.id] || 0) >= 1;
      case 'revisao': return c.resolved >= 1;
      case 'caso100': return cases.some((x) => x.best >= 100);
      case 'todas': return qs.every((id) => state.answers[id]?.seen);
      case 'pomo2': return state.pomodoro.sessions >= 2;
      case 'acertar': return qs.every((id) => state.answers[id]?.correct);
      case 'gruta2': return (state.wins[th.id] || 0) >= 2;
      case 'final': return qs.every((id) => state.answers[id]?.correct) && PQ.openReviews(th.id).length === 0;
      default: return false;
    }
  }
  const isDone = (task) => task.manual || autoDone(task);
  PQ.scheduleProgress = () => (state.schedule ? state.schedule.tasks.filter(isDone).length : 0);
  PQ.nextTasks = (n) => {
    if (!state.schedule) return [];
    return state.schedule.tasks.filter((t) => !isDone(t)).slice(0, n).map((t) => ({ when: `${label(t.date)} · ${state.schedule.time}`, label: t.label }));
  };

  function buildSchedule(themeId, startIso, days, time) {
    const start = parseDate(startIso);
    const tasks = [];
    for (let w = 0; w < 4; w++) {
      const dates = [];
      for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + w * 7 + i); if (days.includes(d.getDay())) dates.push(iso(d)); }
      for (let k = 0; k < 3; k++) {
        const [type, text] = TEMPLATE[w * 3 + k];
        tasks.push({ id: `w${w + 1}-${k + 1}`, week: w + 1, type, label: text, theme: themeId, date: dates[k % dates.length], manual: false });
      }
    }
    return { theme: themeId, start: startIso, days, time, tasks, createdAt: Date.now() };
  }

  let editing = false;
  function renderMural() {
    const p = pomo();
    const sch = state.schedule;
    const t = PQ.theme();
    let right;
    if (!sch || editing) {
      const days = sch?.days || [1, 3, 5];
      right = `<form class="side-card schedule-form" id="schedule-form">
        <div class="eyebrow">CRONOGRAMA DE 4 SEMANAS</div>
        <h2 class="side-title" id="sch-title" tabindex="-1">Monte o seu ritmo</h2>
        <label>Tema<select name="theme">${PQ.THEMES.map((x) => `<option value="${x.id}" ${x.id === (sch?.theme || t.id) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        <label>Começa em<input type="date" name="start" value="${sch?.start || PQ.today()}" required></label>
        <fieldset><legend>Dias de estudo</legend><div class="day-picks">${WEEKDAYS.map((d, i) => `<label class="day"><input type="checkbox" name="day" value="${i}" ${days.includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div></fieldset>
        <label>Horário<input type="time" name="time" value="${sch?.time || '19:00'}" required></label>
        <p class="form-error" id="sch-error" role="alert"></p>
        <button type="submit" class="primary">Montar cronograma ${icon('arrow')}</button>
        ${sch ? '<button type="button" class="secondary" data-sch="cancel">Cancelar</button>' : ''}
      </form>`;
    } else {
      const th = PQ.themeOf(sch.theme);
      const todayIso = PQ.today();
      const weeks = [1, 2, 3, 4].map((w) => {
        const list = sch.tasks.filter((x) => x.week === w);
        return `<div class="week"><h3 class="mini-heading">Semana ${w}</h3><ul class="tasks">${list.map((task) => {
          const done = isDone(task);
          const status = done ? ['done', 'Concluída'] : task.date < todayIso ? ['late', 'Atrasada'] : task.date === todayIso ? ['today', 'Hoje'] : ['planned', 'Prevista'];
          const auto = autoDone(task);
          return `<li class="task ${status[0]}"><span class="task-when">${label(task.date)}<b>${sch.time}</b></span><span class="task-label">${esc(task.label)}</span>
            <span class="status-pill">${status[1]}</span>
            ${auto ? '' : `<button type="button" class="link-button" data-sch="toggle" data-task="${task.id}">${task.manual ? 'Desmarcar' : 'Marcar feita'}</button>`}</li>`;
        }).join('')}</ul></div>`;
      }).join('');
      right = `<div class="side-card schedule">
        <div class="eyebrow">CRONOGRAMA · ${esc(th.name.toUpperCase())}</div>
        <h2 class="side-title" id="sch-title" tabindex="-1">${PQ.scheduleProgress()} de ${sch.tasks.length} tarefas feitas</h2>
        <p class="muted small">As tarefas se marcam sozinhas quando você conclui a atividade no jogo. Dias: ${sch.days.map((d) => WEEKDAYS[d]).join(', ')} às ${sch.time}.</p>
        ${weeks}
        <button type="button" class="secondary" data-sch="edit">Refazer cronograma</button>
      </div>`;
    }
    byId('view-mural').innerHTML = `
      ${sceneHeader('QUADRO DE AVISOS', `Cronograma <span>e foco</span><i aria-hidden="true">.</i>`)}
      <div class="split mural">
        <section class="side-card pomodoro" aria-label="Pomodoro">
          <div class="eyebrow">POMODORO INDIVIDUAL</div>
          <div class="pomo-mode ${p.mode}">${p.mode === 'focus' ? 'FOCO' : 'PAUSA'}</div>
          <div class="pomo-time" id="pomo-time" role="timer" aria-live="off">${fmt(remaining())}</div>
          <div class="pomo-controls">
            <button type="button" class="primary" data-pomo="toggle">${p.running ? '❚❚ Pausar' : '▶ Iniciar'}</button>
            <button type="button" class="secondary" data-pomo="reset">Reiniciar</button>
          </div>
          <div class="pomo-presets" role="group" aria-label="Duração">${['25/5', '50/10'].map((v) => `<button type="button" class="chip${`${p.focus}/${p.rest}` === v ? ' on' : ''}" data-pomo="preset" data-value="${v}" aria-pressed="${`${p.focus}/${p.rest}` === v}">${v.replace('/', ' min + ')} min</button>`).join('')}</div>
          <p class="muted small">${p.sessions} ${p.sessions === 1 ? 'Pomodoro concluído' : 'Pomodoros concluídos'}. O tempo continua correndo enquanto você joga em outras partes da vila.</p>
        </section>
        <div>${right}</div>
      </div>`;
  }

  PQ.views.mural = { render() { editing = false; renderMural(); } };

  /* ================= Eventos ================= */
  PQ.bindAtividades = () => {
    byId('view-biblioteca').addEventListener('click', (e) => {
      const b = e.target.closest('[data-lesson],[data-lesson-answer]');
      if (b && !b.disabled) {
        if (b.dataset.lessonAnswer !== undefined) lessonAction('answer', Number(b.dataset.lessonAnswer));
        else lessonAction(b.dataset.lesson);
        return;
      }
      if (e.target.closest('.lousa') && !e.target.closest('button,a') && !byId('lousa').querySelector('.chalk-question')) lessonAction('next');
    });
    byId('view-horta').addEventListener('click', (e) => {
      const plot = e.target.closest('[data-plot]');
      if (plot && !plot.disabled) { hortaAction('plot', Number(plot.dataset.plot)); return; }
      const ans = e.target.closest('[data-answer]');
      if (ans && !ans.disabled) { hortaAction('answer', Number(ans.dataset.answer)); return; }
      if (e.target.closest('[data-elim]')) { hortaAction('elim'); return; }
      const b = e.target.closest('[data-horta]');
      if (b && !b.disabled) hortaAction(b.dataset.horta);
    });
    byId('view-gruta').addEventListener('click', (e) => {
      const ans = e.target.closest('[data-answer]');
      if (ans && !ans.disabled) { caveAction('answer', Number(ans.dataset.answer)); return; }
      if (e.target.closest('[data-elim]')) { caveAction('elim'); return; }
      const b = e.target.closest('[data-cave]');
      if (b) caveAction(b.dataset.cave);
    });
    byId('view-mural').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pomo]');
      if (b) { pomoAction(b.dataset.pomo, b.dataset.value); return; }
      const s = e.target.closest('[data-sch]');
      if (!s) return;
      if (s.dataset.sch === 'edit') { editing = true; renderMural(); focusEl('sch-title'); }
      else if (s.dataset.sch === 'cancel') { editing = false; renderMural(); }
      else if (s.dataset.sch === 'toggle') { const task = state.schedule.tasks.find((x) => x.id === s.dataset.task); task.manual = !task.manual; PQ.save(); renderMural(); }
    });
    byId('view-mural').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const days = f.getAll('day').map(Number);
      if (!days.length) { byId('sch-error').textContent = 'Escolha pelo menos um dia de estudo.'; return; }
      state.schedule = buildSchedule(f.get('theme'), f.get('start'), days, f.get('time'));
      editing = false; PQ.save(); PQ.toast('Cronograma de 4 semanas montado.'); renderMural(); focusEl('sch-title');
    });
  };
})();
