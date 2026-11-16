/*
 * Plantão Quest — núcleo: estado, salvamento, recompensas, questões, revisão, navegação e diário.
 */
(function core() {
  'use strict';

  const THEMES = window.PLANTAO_ACERVO || [];
  const CASES = window.PLANTAO_CASES || [];
  const FONTES = window.PLANTAO_FONTES || {};
  const KEY = 'plantao-quest:v3';
  const KEY_V2 = 'plantao-quest:v2';
  const KEY_V1 = 'game-med:plantao-murici:v1';
  const MAX_CASE = 100;
  const UPGRADES = [
    { id: 'fachada', name: 'Fachada reformada', price: 60, desc: 'Pintura nova, faixa verde e letreiro dourado no posto da praça.' },
    { id: 'floreiras', name: 'Floreiras e postes', price: 100, desc: 'Flores nas janelas e dois postes de luz na entrada do posto.' },
  ];
  const REWARDS = {
    caseFirst: { coins: 30, label: 'Primeira conclusão de um caso' },
    lesson: { xp: 20, coins: 15, label: 'Aula concluída na biblioteca' },
    question: { xp: 5, coins: 3, label: 'Primeiro acerto de uma questão' },
    review: { coins: 2, label: 'Dúvida da fila resolvida' },
    battle: { xp: 25, coins: 20, label: 'Primeira vitória na gruta' },
  };

  const byId = (id) => document.getElementById(id);
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const int = (v, min = 0, max = Infinity, fallback = 0) => (Number.isInteger(v) && v >= min && v <= max ? v : fallback);

  /* ---------- Estado ---------- */
  function newRun() {
    return { phase: 0, history: [], exam: [], classify: { last: null, attempts: 0 }, treatment: { last: null, attempts: 0 } };
  }
  const isIndexList = (list, size) => Array.isArray(list) && list.every((i) => Number.isInteger(i) && i >= 0 && i < size) && new Set(list).size === list.length;
  const isDecision = (d, decision) => isObj(d) && Number.isInteger(d.attempts) && d.attempts >= 0 &&
    (d.last === null || (Number.isInteger(d.last) && d.last >= 0 && d.last < decision.choices.length));
  function isRun(run, data) {
    return isObj(run) && Number.isInteger(run.phase) && run.phase >= 0 && run.phase <= 4 &&
      isIndexList(run.history, data.history.clues.length) && isIndexList(run.exam, data.exam.clues.length) &&
      isDecision(run.classify, data.classify) && isDecision(run.treatment, data.treatment);
  }
  function normalizeCase(saved, data) {
    const result = { best: 0, completions: 0, run: newRun() };
    if (!isObj(saved)) return result;
    if (Number.isFinite(saved.best)) result.best = Math.min(MAX_CASE, Math.max(0, Math.round(saved.best)));
    result.completions = int(saved.completions);
    if (isRun(saved.run, data)) result.run = saved.run;
    return result;
  }
  function defaults() {
    const cases = {};
    CASES.forEach((data) => { cases[data.id] = normalizeCase(null, data); });
    return {
      version: 3, sound: false, theme: null, view: 'start', current: null,
      cases, ledger: {}, purchases: {}, answers: {}, log: [], review: {}, counts: {},
      lessons: {}, notebook: {}, inventory: {}, garden: { plots: [0, 0, 0, 0].map(() => ({ stage: 0 })) },
      activity: null, cave: null, wins: {}, schedule: null,
      pomodoro: { focus: 25, rest: 5, mode: 'focus', running: false, endsAt: null, remaining: 25 * 60, sessions: 0 },
      days: {}, daily: null, migratedFrom: null, chars: [], activeChar: null, lastLevel: null,
      audio: { music: 0.55, sfx: 0.8, amb: 0.5 },
      world: { map: 'vila', x: null, y: null, dir: 'down', ret: null, visited: {}, zoom: 'medio', talked: {} },
    };
  }
  let canSave = true;
  let saveWarned = false;
  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      if (!(error instanceof SyntaxError)) canSave = false;
      return null;
    }
  }
  const themeIds = new Set(THEMES.map((t) => t.id));
  const questionIds = new Set(THEMES.flatMap((t) => t.questoes.map((q) => q.id)));
  const VIEWS = ['start', 'personagem', 'vila', 'ubs', 'case', 'biblioteca', 'horta', 'gruta', 'mural'];
  const CLASS_IDS = ['familia', 'emergencia', 'clinica', 'cirurgia'];
  const TRAIT_IDS = ['calmo', 'curioso', 'determinado', 'brincalhao'];
  const hex = (v, d) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
  function normalizeChar(c) {
    if (!isObj(c) || typeof c.id !== 'string' || !isObj(c.look)) return null;
    const L = c.look;
    return {
      id: c.id.slice(0, 24), name: String(c.name || 'Plantonista').slice(0, 18), title: ['Dr.', 'Dra.'].includes(c.title) ? c.title : 'Dr.',
      cls: CLASS_IDS.includes(c.cls) ? c.cls : 'clinica', trait: TRAIT_IDS.includes(c.trait) ? c.trait : 'calmo', motto: String(c.motto || '').slice(0, 60), createdAt: Number(c.createdAt) || 0,
      look: { skin: hex(L.skin, '#c98e63'), hairStyle: String(L.hairStyle || 'curto'), hairColor: hex(L.hairColor, '#1d1a18'), eyes: hex(L.eyes, '#2b1d14'), outfit: ['jaleco', 'scrub', 'camiseta', 'avental', 'colete'].includes(L.outfit) ? L.outfit : 'jaleco', outfitColor: hex(L.outfitColor, '#3f8a6a'), inner: hex(L.inner, '#7fb6ea'), pants: hex(L.pants, '#3a3f4a'), acc: Array.isArray(L.acc) ? L.acc.filter((a) => typeof a === 'string').slice(0, 4) : [], ...(typeof L.portraits === 'string' && /^assets\/personagens\/[a-z]+-$/.test(L.portraits) ? { portraits: L.portraits } : {}) },
      ...(typeof c.preset === 'string' ? { preset: c.preset.slice(0, 20) } : {}),
    };
  }

  function normalize(saved) {
    const s = defaults();
    if (!isObj(saved)) return s;
    s.sound = saved.sound === true;
    s.theme = themeIds.has(saved.theme) ? saved.theme : null;
    s.view = VIEWS.includes(saved.view) ? saved.view : 'start';
    s.current = CASES.some((c) => c.id === saved.current) ? saved.current : null;
    CASES.forEach((data) => { s.cases[data.id] = normalizeCase(saved.cases?.[data.id], data); });
    if (isObj(saved.ledger)) for (const [id, tx] of Object.entries(saved.ledger)) if (isObj(tx)) s.ledger[id] = { xp: int(tx.xp), coins: int(tx.coins), label: String(tx.label || ''), at: Number(tx.at) || 0 };
    if (isObj(saved.purchases)) UPGRADES.forEach((u) => { if (saved.purchases[u.id]) s.purchases[u.id] = true; });
    if (isObj(saved.answers)) for (const [id, a] of Object.entries(saved.answers)) if (questionIds.has(id) && isObj(a)) s.answers[id] = { seen: int(a.seen), correct: int(a.correct), wrong: int(a.wrong), lastAt: Number(a.lastAt) || 0 };
    if (Array.isArray(saved.log)) s.log = saved.log.filter((e) => isObj(e) && questionIds.has(e.q)).slice(-400);
    if (isObj(saved.review)) for (const [id, r] of Object.entries(saved.review)) if (questionIds.has(id) && isObj(r)) s.review[id] = { theme: String(r.theme), objetivo: String(r.objetivo), misses: int(r.misses, 1, Infinity, 1), open: r.open === true, at: Number(r.at) || 0, resolvedAt: Number(r.resolvedAt) || 0 };
    if (isObj(saved.counts)) for (const [id, c] of Object.entries(saved.counts)) if (themeIds.has(id) && isObj(c)) s.counts[id] = { harvest: int(c.harvest), fish: int(c.fish), resolved: int(c.resolved) };
    if (isObj(saved.lessons)) for (const [id, l] of Object.entries(saved.lessons)) {
      const theme = THEMES.find((t) => t.id === id);
      if (theme && isObj(l)) s.lessons[id] = { step: int(l.step, 0, theme.aula.passos.length, 0), q: isObj(l.q) ? { last: Number.isInteger(l.q.last) && l.q.last < theme.aula.pergunta.alternativas.length ? l.q.last : null, attempts: int(l.q.attempts) } : { last: null, attempts: 0 }, done: l.done === true, completions: int(l.completions) };
    }
    if (isObj(saved.notebook)) for (const id of Object.keys(saved.notebook)) if (themeIds.has(id)) s.notebook[id] = Number(saved.notebook[id]) || Date.now();
    if (isObj(saved.inventory)) for (const [name, n] of Object.entries(saved.inventory)) if (Number.isInteger(n) && n > 0) s.inventory[String(name).slice(0, 40)] = n;
    if (Array.isArray(saved.garden?.plots) && saved.garden.plots.length === 4) s.garden.plots = saved.garden.plots.map((p) => ({ stage: int(p?.stage, 0, 3, 0) }));
    if (isObj(saved.activity) && ['harvest', 'fish'].includes(saved.activity.kind) && questionIds.has(saved.activity.qid)) s.activity = saved.activity;
    if (isObj(saved.cave) && themeIds.has(saved.cave.theme) && Array.isArray(saved.cave.queue) && saved.cave.queue.every((q) => questionIds.has(q))) s.cave = saved.cave;
    if (isObj(saved.wins)) for (const [id, n] of Object.entries(saved.wins)) if (themeIds.has(id)) s.wins[id] = int(n);
    if (isObj(saved.schedule) && Array.isArray(saved.schedule.tasks)) s.schedule = saved.schedule;
    if (isObj(saved.pomodoro)) {
      const p = saved.pomodoro;
      s.pomodoro = { focus: [25, 50].includes(p.focus) ? p.focus : 25, rest: [5, 10].includes(p.rest) ? p.rest : 5, mode: p.mode === 'rest' ? 'rest' : 'focus', running: p.running === true && Number.isFinite(p.endsAt), endsAt: Number.isFinite(p.endsAt) ? p.endsAt : null, remaining: int(p.remaining, 0, 3600, 25 * 60), sessions: int(p.sessions) };
    }
    if (isObj(saved.days)) for (const d of Object.keys(saved.days)) if (/^\d{4}-\d{2}-\d{2}$/.test(d)) s.days[d] = 1;
    if (isObj(saved.daily) && Array.isArray(saved.daily.missions)) s.daily = { date: String(saved.daily.date || ''), missions: saved.daily.missions.filter(isObj).map((m) => ({ id: String(m.id), progress: int(m.progress) })), streak: int(saved.daily.streak), lastFull: typeof saved.daily.lastFull === 'string' ? saved.daily.lastFull : null };
    s.migratedFrom = saved.migratedFrom || null;
    s.migrationNoticeShown = saved.migrationNoticeShown === true;
    if (Array.isArray(saved.chars)) s.chars = saved.chars.map(normalizeChar).filter(Boolean).slice(0, 4);
    s.activeChar = s.chars.some((c) => c.id === saved.activeChar) ? saved.activeChar : s.chars[0]?.id || null;
    s.lastLevel = Number.isInteger(saved.lastLevel) ? saved.lastLevel : null;
    const vol01 = (v, d) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
    if (isObj(saved.audio)) s.audio = { music: vol01(saved.audio.music, 0.55), sfx: vol01(saved.audio.sfx, 0.8), amb: vol01(saved.audio.amb, 0.5) };
    if (isObj(saved.world)) {
      const w = saved.world; const maps = window.PLANTAO_MAPAS || {};
      const okMap = typeof w.map === 'string' && maps[w.map];
      const num = (v) => (Number.isFinite(v) ? v : null);
      s.world.map = okMap ? w.map : 'vila';
      s.world.x = okMap ? num(w.x) : null; s.world.y = okMap ? num(w.y) : null;
      s.world.dir = ['down', 'up', 'left', 'right'].includes(w.dir) ? w.dir : 'down';
      if (isObj(w.ret) && maps[w.ret.map] && Number.isFinite(w.ret.x) && Number.isFinite(w.ret.y)) s.world.ret = { map: w.ret.map, x: w.ret.x, y: w.ret.y, dir: ['down', 'up', 'left', 'right'].includes(w.ret.dir) ? w.ret.dir : 'down' };
      if (s.world.map !== 'vila' && !s.world.ret) { s.world.map = 'vila'; s.world.x = null; s.world.y = null; }
      if (isObj(w.visited)) for (const k of Object.keys(w.visited)) if (/^[a-z-]{2,24}$/.test(k)) s.world.visited[k] = 1;
      if (isObj(w.talked)) for (const k of Object.keys(w.talked)) if (/^[a-z0-9-]{2,24}$/.test(k)) s.world.talked[k] = 1;
      s.world.zoom = ['perto', 'medio', 'longe'].includes(w.zoom) ? w.zoom : 'medio';
    }
    if (s.view === 'case' && !s.current) s.view = 'ubs';
    if (!['start', 'personagem'].includes(s.view) && !s.theme) s.view = 'start';
    return s;
  }

  function load() {
    const v3 = readJSON(KEY);
    if (v3 && v3.version === 3) return normalize(v3);
    const s = defaults();
    const v2 = readJSON(KEY_V2);
    if (v2 && v2.version === 2) {
      s.sound = v2.sound === true;
      CASES.forEach((data) => { s.cases[data.id] = normalizeCase(v2.cases?.[data.id], data); });
      s.migratedFrom = 'plantao-quest:v2';
    } else {
      const v1 = readJSON(KEY_V1);
      const bia = CASES.find((c) => c.id === 'bia');
      if (v1 && bia) {
        s.sound = v1.sound === true;
        const run = isObj(v1.run) ? { ...v1.run, classify: v1.run.hydration } : null;
        if (run) delete run.hydration;
        s.cases.bia = normalizeCase({ best: v1.best, completions: v1.completions, run }, bia);
        s.migratedFrom = KEY_V1;
      }
    }
    // Quem vinha no meio de um caso volta direto para ele, já com o tema do caso.
    const inProgress = CASES.find((c) => { const r = s.cases[c.id].run; return r.phase > 0 && r.phase < 4; });
    if (s.migratedFrom && inProgress) { s.theme = inProgress.theme; s.current = inProgress.id; s.view = 'ubs'; }
    return s;
  }

  const state = load();

  function save() {
    if (canSave) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch {
        canSave = false;
      }
    }
    const dot = byId('save-indicator');
    if (dot) {
      dot.classList.toggle('unavailable', !canSave);
      byId('save-label').textContent = canSave ? 'Progresso salvo neste navegador' : 'Falha ao salvar: o progresso vale só nesta sessão';
    }
    if (!canSave && !saveWarned) {
      saveWarned = true;
      toast('Não foi possível salvar neste navegador. Você pode continuar jogando, mas o progresso some ao fechar a página.', 'warn', 9000);
    }
  }

  /* ---------- Acervo ---------- */
  const themeOf = (id) => THEMES.find((t) => t.id === id) || null;
  const theme = () => themeOf(state.theme);
  const caseOf = (id) => CASES.find((c) => c.id === id) || null;
  const casesOfTheme = (id) => CASES.filter((c) => c.theme === id);
  // Paciente do dia: o caso em andamento do tema, senão o primeiro ainda não concluído, senão o primeiro.
  const caseOfDay = (id) => {
    const list = casesOfTheme(id);
    return list.find((c) => { const r = state.cases[c.id]?.run; return r && r.phase > 0 && r.phase < 4; })
      || list.find((c) => !state.cases[c.id]?.completions) || list[0] || null;
  };
  const question = (id) => { for (const t of THEMES) { const q = t.questoes.find((x) => x.id === id); if (q) return { ...q, theme: t }; } return null; };
  const fonte = (key) => FONTES[key] || { label: key, url: '#' };
  const fonteLink = (key) => { const f = fonte(key); return f.url ? `<a class="reference" href="${f.url}" target="_blank" rel="noopener">${esc(f.label)} ↗</a>` : `<span class="reference">${esc(f.label)}</span>`; };
  const counts = (id) => (state.counts[id] ||= { harvest: 0, fish: 0, resolved: 0 });

  function searchThemes(text) {
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const q = norm(text || '');
    if (!q) return THEMES.slice();
    return THEMES.filter((t) => [t.name, t.short, t.area, ...t.aliases].some((w) => norm(w).includes(q) || q.includes(norm(w))));
  }

  /* ---------- Recompensas ---------- */
  function grant(id, reward, quiet = false) {
    if (state.ledger[id]) return false;
    state.ledger[id] = { xp: reward.xp || 0, coins: reward.coins || 0, label: reward.label, at: Date.now() };
    if (!quiet) {
      const parts = [];
      if (reward.xp) parts.push(`+${reward.xp} XP`);
      if (reward.coins) parts.push(`+${reward.coins} moedas`);
      toast(`${reward.label}: ${parts.join(' · ')}`, 'reward');
      if (reward.xp) PQ.popChip?.('xp', `+${reward.xp}`);
      if (reward.coins) PQ.popChip?.('coin', `+${reward.coins}`);
    }
    return true;
  }
  const caseXP = () => CASES.reduce((sum, c) => sum + state.cases[c.id].best, 0);
  const ledgerXP = () => Object.values(state.ledger).reduce((sum, tx) => sum + tx.xp, 0);
  const totalXP = () => caseXP() + ledgerXP();
  const spent = () => UPGRADES.reduce((sum, u) => sum + (state.purchases[u.id] ? u.price : 0), 0);
  const coins = () => Object.values(state.ledger).reduce((sum, tx) => sum + tx.coins, 0) - spent();
  function addItem(name, n = 1) { state.inventory[name] = (state.inventory[name] || 0) + n; }
  function buy(id) {
    const upgrade = UPGRADES.find((u) => u.id === id);
    if (!upgrade || state.purchases[id] || coins() < upgrade.price) return false;
    state.purchases[id] = true;
    save();
    play('win');
    toast(`Reforma concluída: ${upgrade.name}. Veja o posto na praça!`, 'reward');
    return true;
  }
  // Conclusões migradas também recebem a moeda da primeira conclusão (uma única vez).
  CASES.forEach((c) => { if (state.cases[c.id].completions > 0) grant(`case:${c.id}`, { ...REWARDS.caseFirst, label: `Caso ${c.patient.name}` }, true); });

  /* ---------- Questões e fila de revisão ---------- */
  function openReviews(themeId) {
    return Object.entries(state.review).filter(([, r]) => r.open && (!themeId || r.theme === themeId)).map(([id]) => id);
  }
  let lastAsked = null;
  function pickQuestion(themeId, { exclude = [], preferReview = true, minLevel = 0 } = {}) {
    const all = themeOf(themeId).questoes.filter((q) => q.dificuldade >= minLevel).map((q) => q.id).filter((id) => !exclude.includes(id));
    if (!all.length) return null;
    const pool = all.length > 1 ? all.filter((id) => id !== lastAsked) : all;
    const open = pool.filter((id) => state.review[id]?.open);
    let chosen;
    if (preferReview && open.length) {
      chosen = open.sort((a, b) => (state.answers[a]?.lastAt || 0) - (state.answers[b]?.lastAt || 0))[0];
    } else {
      const seen = (id) => state.answers[id]?.seen || 0;
      const min = Math.min(...pool.map(seen));
      const least = pool.filter((id) => seen(id) === min);
      chosen = least[Math.floor(Math.random() * least.length)];
    }
    lastAsked = chosen;
    return chosen;
  }

  function recordAnswer(qid, ok, source) {
    const q = question(qid);
    const a = (state.answers[qid] ||= { seen: 0, correct: 0, wrong: 0, lastAt: 0 });
    a.seen += 1;
    a.lastAt = Date.now();
    if (ok) a.correct += 1; else a.wrong += 1;
    state.log.push({ q: qid, t: q.theme.id, ok, s: source, at: Date.now() });
    if (state.log.length > 400) state.log = state.log.slice(-400);
    state.days[today()] = 1;
    const reward = { xp: 0, coins: 0 };
    let resolved = false;
    if (!ok) {
      const r = state.review[qid] || { theme: q.theme.id, objetivo: q.objetivo, misses: 0, open: true, at: 0, resolvedAt: 0 };
      r.misses += 1; r.open = true; r.at = Date.now();
      state.review[qid] = r;
    } else {
      if (state.review[qid]?.open) {
        state.review[qid].open = false;
        state.review[qid].resolvedAt = Date.now();
        resolved = true;
        counts(q.theme.id).resolved += 1;
        if (grant(`review:${qid}`, REWARDS.review, true)) reward.coins += REWARDS.review.coins;
      }
      if (grant(`q:${qid}`, REWARDS.question, true)) { reward.xp += REWARDS.question.xp; reward.coins += REWARDS.question.coins; }
    }
    PQ.missionEvent?.('answer', { ok, source, level: q.dificuldade, resolved });
    save();
    if (reward.xp) PQ.popChip?.('xp', `+${reward.xp}`);
    if (reward.coins) PQ.popChip?.('coin', `+${reward.coins}`);
    return reward;
  }

  function rewardText(reward) {
    const parts = [];
    if (reward.xp) parts.push(`+${reward.xp} XP`);
    if (reward.coins) parts.push(`+${reward.coins} moedas`);
    return parts.length ? parts.join(' · ') : 'Sem moedas extras: o primeiro acerto desta questão já foi recompensado.';
  }

  /*
   * Bloco de questão reutilizado em horta, lago e gruta.
   * answered: índice escolhido ou null. Retorna HTML; os botões têm data-answer.
   */
  function questionBlock(qid, { answered = null, label = '', grid = false, reward = null, extra = '', elim = null } = {}) {
    const q = question(qid);
    const isReview = state.review[qid]?.open || (answered !== null && answered !== q.correta && state.review[qid]);
    const ok = answered === q.correta;
    const letters = grid ? ['1', '2', '3', '4'] : ['A', 'B', 'C', 'D'];
    return `
      <div class="q-meta">${esc(q.theme.name)} · ${esc(q.theme.objetivos[q.objetivo])} · nível ${q.dificuldade}${isReview ? ' · <b>revisão</b>' : ''}${label ? ` · ${esc(label)}` : ''}</div>
      <p class="q-stem" id="q-stem" tabindex="-1">${esc(q.enunciado)}</p>
      <div class="q-options${grid ? ' grid' : ''}" role="group" aria-labelledby="q-stem">
        ${q.alternativas.map((alt, i) => {
          if (answered === null && i === elim) return `<button type="button" class="q-option elim" disabled aria-label="Alternativa eliminada pelo olho clínico"><span class="choice-code" aria-hidden="true">${letters[i]}</span><span><s>${esc(alt)}</s></span></button>`;
          const cls = answered === null ? '' : i === q.correta ? ' right' : i === answered ? ' wrong' : ' dim';
          const mark = answered === null ? '' : i === q.correta ? '<span class="sr-mark">✓ correta</span>' : i === answered ? '<span class="sr-mark">✗ sua resposta</span>' : '';
          return `<button type="button" class="q-option${cls}" data-answer="${i}" ${answered === null ? '' : 'disabled'}><span class="choice-code" aria-hidden="true">${letters[i]}</span><span>${esc(alt)} ${mark}</span></button>`;
        }).join('')}
      </div>
      ${answered === null && elim === null && PQ.hasPerk?.('clinica') ? '<button type="button" class="perk-btn" data-elim>🔍 Olho clínico: eliminar uma alternativa errada</button>' : ''}
      ${answered === null ? '' : `
        <div class="feedback${ok ? '' : ' incorrect'}" id="q-feedback" tabindex="-1" role="status">
          <strong>${ok ? '✓ Resposta correta' : '✗ Precisa rever'}</strong> ${esc(q.explicacao)}
          ${reward ? `<span class="reward-line">${esc(rewardText(reward))}</span>` : ''}
          ${!ok ? '<span class="reward-line">A dúvida entrou na fila de revisão e volta em outra atividade.</span>' : ''}
          ${extra}
          <span class="q-source">Fonte: ${fonteLink(q.fonte)}</span>
        </div>`}`;
  }

  /* ---------- Som ---------- */
  // efeitos e trilhas vivem em js/audio.js (Web Audio sintetizado, arte sonora original)
  function play(name) {
    if (!state.sound) return;
    try { window.PQAudio?.sfx(name); } catch { /* sem áudio, o jogo segue */ }
  }

  /* ---------- Avisos ---------- */
  let toastTimer;
  function toast(text, kind = 'info', ms = 3800) {
    const el = byId('toast');
    if (!el) return;
    el.textContent = text;
    el.className = `toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, ms);
  }

  /* ---------- Navegação ---------- */
  const views = {};
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function go(view, opts = {}) {
    if (!['start', 'personagem'].includes(view) && !state.theme) view = 'start';
    PQ.closeDialog?.();
    const prev = state.view;
    if (views[prev]?.leave && prev !== view) views[prev].leave();
    state.view = view;
    document.querySelectorAll('.view').forEach((el) => { el.hidden = el.id !== `view-${view}`; });
    const section = byId(`view-${view}`);
    if (prev !== view && section && !reducedMotion.matches) { section.classList.remove('view-enter'); void section.offsetWidth; section.classList.add('view-enter'); }
    document.body.dataset.view = view;
    views[view]?.render(opts);
    renderHeader();
    save();
    PQ.onView?.(view);
    if (opts.scroll !== false) window.scrollTo({ top: 0 });
    if (opts.focus !== false) {
      const target = opts.focusId ? byId(opts.focusId) : document.querySelector(`#view-${view} h1, #view-${view} .view-title`);
      target?.focus({ preventScroll: true });
    }
  }
  function refresh() { views[state.view]?.render({ refresh: true }); renderHeader(); save(); }

  function setTheme(id, { from } = {}) {
    if (!themeIds.has(id)) return;
    const changed = state.theme !== id;
    state.theme = id;
    if (byId('theme-dialog').open) byId('theme-dialog').close();
    if (changed) toast(`Tema escolhido: ${themeOf(id).name}. A vila inteira agora gira em torno dele.`);
    const stay = ['biblioteca', 'horta', 'gruta', 'mural', 'ubs'].includes(state.view) && from !== 'start';
    if (state.view === 'case') state.current = null;
    if (!state.chars.length) { go('personagem', { first: true }); return; }
    go(stay ? state.view : 'vila');
  }

  /* ---------- Cabeçalho ---------- */
  function renderHeader() {
    const t = theme();
    byId('theme-chip').hidden = !t;
    if (t) byId('theme-chip-name').textContent = t.short;
    byId('total-xp').textContent = `${totalXP()} XP`;
    byId('coin-count').textContent = String(coins());
    const sound = byId('sound');
    sound.setAttribute('aria-pressed', String(state.sound));
    sound.querySelector('use').setAttribute('href', state.sound ? '#i-sound' : '#i-mute');
    PQ.pomodoroChip?.();
    const av = byId('avatar-btn');
    if (av && PQ.player) {
      av.hidden = !state.chars.length;
      if (state.chars.length) { PQSprites.drawPortrait(byId('avatar-canvas'), PQ.player().look, 'neutral'); byId('avatar-level').textContent = `Nv ${PQ.level()}`; av.setAttribute('aria-label', `${PQ.docName()}, nível ${PQ.level()}. Editar personagem`); }
    }
    if (PQ.level) {
      const lv = PQ.level();
      if (state.lastLevel === null) state.lastLevel = lv;
      else if (lv > state.lastLevel) { state.lastLevel = lv; save(); setTimeout(() => PQ.levelUp(lv), 400); }
    }
  }

  /* ---------- Escolha de tema (diálogo) ---------- */
  function themeList(text, attr = 'data-pick-theme') {
    const found = searchThemes(text);
    if (!found.length) {
      return `<div class="empty-state" role="status"><strong>“${esc(text)}” ainda não está no acervo.</strong>
        Os temas disponíveis são ${THEMES.map((t) => esc(t.name)).join(', ')}. Montar temas novos por IA é uma etapa futura do jogo.</div>`;
    }
    return found.map((t) => {
      const done = casesOfTheme(t.id).filter((c) => state.cases[c.id].completions).length;
      return `<button type="button" class="theme-option${t.id === state.theme ? ' current' : ''}" ${attr}="${t.id}">
        <span class="theme-dot" style="background:${t.color}" aria-hidden="true"></span>
        <span><strong>${esc(t.name)}</strong><small>${esc(t.area)} · ${t.questoes.length} questões · ${casesOfTheme(t.id).length} ${casesOfTheme(t.id).length === 1 ? 'caso' : 'casos'} · aula e ficha${done ? ` · ${done} ${done === 1 ? 'caso concluído' : 'casos concluídos'}` : ''}</small></span>
        <span class="theme-go">${t.id === state.theme ? 'Tema atual' : 'Escolher'} ${icon('arrow')}</span>
      </button>`;
    }).join('');
  }
  function openThemeDialog() {
    const dialog = byId('theme-dialog');
    byId('theme-search').value = '';
    byId('theme-results').innerHTML = themeList('');
    dialog.showModal();
    byId('theme-search').focus();
  }

  /* ---------- Diário ---------- */
  let journalTab = 'resumo';
  function accuracy(list) { return list.length ? Math.round((list.filter((e) => e.ok).length / list.length) * 100) : 0; }
  function journalBody() {
    const answered = state.log.length;
    const right = state.log.filter((e) => e.ok).length;
    const open = openReviews();
    const resolved = Object.values(state.review).filter((r) => !r.open).length;
    const tabs = [['resumo', 'Painel'], ['casos', 'Casos e insígnias'], ['duvidas', `Dúvidas (${open.length})`], ['caderneta', 'Caderneta'], ['cesto', 'Cesto e reformas']];
    let body = '';
    if (journalTab === 'resumo') {
      const first = state.log.slice(0, 10);
      const last = state.log.slice(-10);
      const compare = answered >= 20
        ? `<div class="compare"><div><small>Suas 10 primeiras respostas</small><div class="bar-row"><i style="width:${accuracy(first)}%"></i></div><b>${accuracy(first)}% de acerto</b></div>
           <div><small>Suas 10 respostas mais recentes</small><div class="bar-row now"><i style="width:${accuracy(last)}%"></i></div><b>${accuracy(last)}% de acerto</b></div></div>`
        : `<p class="muted">Responda ${20 - answered} questões a mais para ver a comparação entre o começo e o momento atual.</p>`;
      const next = PQ.nextTasks ? PQ.nextTasks(3) : [];
      const pl = PQ.player(); const cl = PQ.CLASSES[pl.cls]; const st = PQ.stats();
      body = `
        <div class="char-sheet"><canvas width="34" height="34" id="journal-portrait"></canvas>
          <div><strong>${esc(PQ.docName())} · Nível ${PQ.level()}</strong><small>${esc(cl.name)} · habilidade <b>${esc(cl.perk)}</b>: ${esc(cl.desc)}</small>
          <div class="mini-stats">${PQ.STAT_NAMES.map((n, i) => `<span>${n} <b>${st[i]}</b></span>`).join('')}</div></div></div>
        <div class="stat-grid">
          <div><b>${totalXP()}</b><small>XP total</small><em>${caseXP()} de consultas + ${ledgerXP()} de atividades</em></div>
          <div><b>${coins()}</b><small>moedas</small><em>${spent()} gastas em reformas</em></div>
          <div><b>${answered}</b><small>questões respondidas</small><em>${answered ? Math.round((right / answered) * 100) : 0}% de acerto</em></div>
          <div><b>${open.length}</b><small>dúvidas abertas</small><em>${resolved} resolvidas</em></div>
          <div><b>${state.pomodoro.sessions}</b><small>Pomodoros</small><em>${Object.keys(state.days).length} dias com estudo</em></div>
          <div><b>${CASES.filter((c) => state.cases[c.id].completions).length}/${CASES.length}</b><small>casos concluídos</small><em>${Object.values(state.lessons).filter((l) => l.done).length} aulas</em></div>
        </div>
        <h4>Antes e depois</h4>${compare}
        <p class="muted small">Números calculados só com as suas respostas neste navegador.</p>
        <h4>Agenda</h4>
        ${next.length ? `<ul class="mini-agenda">${next.map((t) => `<li><b>${esc(t.when)}</b> ${esc(t.label)}</li>`).join('')}</ul>` : '<p class="muted">Nenhum cronograma montado. Monte o seu no quadro de avisos da praça.</p>'}`;
    } else if (journalTab === 'casos') {
      body = `<ol class="journal-list">${CASES.map((c) => {
        const s = state.cases[c.id];
        return `<li class="journal-row${s.completions ? ' earned' : ''}"><span class="journal-badge" aria-hidden="true">${s.completions ? icon('trophy') : c.number}</span>
          <div><strong>${esc(c.patient.name)} · ${esc(c.title)}</strong><small>${s.completions ? `Insígnia: ${esc(c.outcome.badge)}` : 'Insígnia ainda bloqueada'}</small>
          <small>${s.completions} ${s.completions === 1 ? 'conclusão' : 'conclusões'} · melhor ${s.best}/${MAX_CASE} XP</small></div></li>`;
      }).join('')}
      ${THEMES.map((t) => (state.wins[t.id] ? `<li class="journal-row earned"><span class="journal-badge">${icon('bolt')}</span><div><strong>Gruta: ${esc(t.monster.name)} vencido</strong><small>${state.wins[t.id]} ${state.wins[t.id] === 1 ? 'vitória' : 'vitórias'}</small></div></li>` : '')).join('')}
      ${THEMES.map((t) => (state.lessons[t.id]?.done ? `<li class="journal-row earned"><span class="journal-badge">${icon('book')}</span><div><strong>Aula: ${esc(t.aula.titulo)}</strong><small>Concluída na biblioteca</small></div></li>` : '')).join('')}
      </ol><p class="muted small">O XP de consultas soma a melhor nota de cada caso. Rejogar pode melhorar a nota, mas não duplica XP.</p>`;
    } else if (journalTab === 'duvidas') {
      if (!open.length) body = `<div class="empty-state">Nenhuma dúvida aberta. ${resolved ? `Você já resolveu ${resolved}.` : 'Quando errar uma questão na horta, no lago ou na gruta, ela aparece aqui.'}</div>`;
      else {
        const groups = {};
        open.forEach((id) => { const q = question(id); const key = `${q.theme.id}|${q.objetivo}`; (groups[key] ||= { q, ids: [] }).ids.push(id); });
        body = Object.values(groups).map(({ q, ids }) => `
          <div class="doubt-group"><strong>${esc(q.theme.name)} · ${esc(q.theme.objetivos[q.objetivo])}</strong>
          <ul>${ids.map((id) => `<li>${esc(question(id).enunciado)} <small>(${state.review[id].misses} ${state.review[id].misses === 1 ? 'erro' : 'erros'})</small></li>`).join('')}</ul>
          <button type="button" class="secondary" data-practice="${q.theme.id}">Praticar no lago de ${esc(q.theme.short)}</button></div>`).join('');
      }
    } else if (journalTab === 'caderneta') {
      const saved = THEMES.filter((t) => state.notebook[t.id]);
      body = saved.length ? saved.map((t) => `<div class="notebook-card"><strong>${esc(t.aula.titulo)}</strong>
        <div class="mini-board">${t.aula.passos.map((p) => `<div><b>${esc(p.quadro[0])}</b>${p.quadro.slice(1).map((l) => `<span>${esc(l)}</span>`).join('')}</div>`).join('')}</div>
        <span class="q-source">Fonte: ${fonteLink(t.aula.fonte)}</span></div>`).join('')
        : '<div class="empty-state">A caderneta está vazia. Termine uma aula na biblioteca e guarde o esquema da lousa.</div>';
    } else {
      const items = Object.entries(state.inventory);
      body = `<h4>Cesto e mochila</h4>
        ${items.length ? `<ul class="inventory">${items.map(([n, k]) => `<li><b>${k}×</b> ${esc(n)}</li>`).join('')}</ul>` : '<p class="muted">Vazio. Colha na horta, pesque no lago ou vença na gruta.</p>'}
        <h4>Reformas do posto · ${coins()} moedas</h4>${upgradesHTML()}
        <h4>Como ganhar moedas</h4>
        <ul class="rules">
          <li>Primeira conclusão de cada caso: +${REWARDS.caseFirst.coins} moedas. O XP do caso é a sua melhor nota (até 100).</li>
          <li>Primeira aula concluída de cada tema: +${REWARDS.lesson.xp} XP e +${REWARDS.lesson.coins} moedas.</li>
          <li>Primeiro acerto de cada questão: +${REWARDS.question.xp} XP e +${REWARDS.question.coins} moedas. Acertos repetidos rendem só o item (colheita ou peixe).</li>
          <li>Resolver uma dúvida da fila: +${REWARDS.review.coins} moedas, uma vez por questão.</li>
          <li>Primeira vitória na gruta de cada tema: +${REWARDS.battle.xp} XP e +${REWARDS.battle.coins} moedas. Toda vitória rende um Cristal da gruta.</li>
        </ul>`;
    }
    return `
      <div class="tabs" role="tablist">${tabs.map(([id, name]) => `<button type="button" role="tab" aria-selected="${id === journalTab}" data-journal-tab="${id}">${name}</button>`).join('')}</div>
      <div class="tab-body" role="tabpanel">${body}</div>
      <form method="dialog"><button class="secondary" type="submit">Fechar diário</button></form>`;
  }
  function upgradesHTML() {
    return `<ul class="upgrades">${UPGRADES.map((u) => {
      const owned = state.purchases[u.id];
      const can = coins() >= u.price;
      return `<li class="${owned ? 'owned' : ''}"><div><strong>${esc(u.name)}</strong><small>${esc(u.desc)}</small></div>
        ${owned ? '<span class="status-pill">FEITA ✓</span>' : `<button type="button" class="secondary" data-buy="${u.id}" ${can ? '' : 'disabled'}>${can ? `Reformar · ${u.price} moedas` : `Faltam ${u.price - coins()} moedas`}</button>`}</li>`;
    }).join('')}</ul>`;
  }
  function showJournal(tab) {
    if (tab) journalTab = tab;
    byId('journal-body').innerHTML = journalBody();
    const jp = byId('journal-portrait'); if (jp) PQSprites.drawPortrait(jp, PQ.player().look, 'happy');
    if (!byId('journal').open) byId('journal').showModal();
  }

  /* ---------- Eventos globais ---------- */
  function bindGlobal() {
    byId('open-journal').addEventListener('click', () => showJournal());
    byId('theme-chip').addEventListener('click', openThemeDialog);
    byId('theme-search').addEventListener('input', (e) => { byId('theme-results').innerHTML = themeList(e.target.value); });
    byId('theme-search').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); const first = byId('theme-results').querySelector('[data-pick-theme]'); if (first) setTheme(first.dataset.pickTheme); }
    });
    byId('theme-results').addEventListener('click', (e) => { const b = e.target.closest('[data-pick-theme]'); if (b) setTheme(b.dataset.pickTheme); });
    byId('sound').addEventListener('click', () => { state.sound = !state.sound; renderHeader(); save(); window.PQAudio?.apply(); PQ.onSoundChange?.(); play('confirm'); });
    byId('journal-body').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-journal-tab]');
      if (tab) { journalTab = tab.dataset.journalTab; showJournal(); byId('journal-body').querySelector(`[data-journal-tab="${journalTab}"]`)?.focus(); return; }
      const buyBtn = e.target.closest('[data-buy]');
      if (buyBtn) { buy(buyBtn.dataset.buy); showJournal(); refresh(); return; }
      const practice = e.target.closest('[data-practice]');
      if (practice) { byId('journal').close(); state.theme = practice.dataset.practice; go('horta', { fishNow: true }); }
    });
    byId('brand').addEventListener('click', (e) => { e.preventDefault(); go(state.theme ? 'vila' : 'start'); });
    byId('avatar-btn').addEventListener('click', () => go('personagem', { edit: state.activeChar }));
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-go]');
      if (link) { e.preventDefault(); go(link.dataset.go); }
      const pick = e.target.closest('[data-open-theme]');
      if (pick) openThemeDialog();
    });
  }

  window.PQ = {
    THEMES, CASES, UPGRADES, REWARDS, MAX_CASE, state, views, save, go, refresh, setTheme, theme, themeOf, caseOf, casesOfTheme, caseOfDay,
    question, fonte, fonteLink, counts, searchThemes, themeList, grant, totalXP, caseXP, coins, addItem, buy, upgradesHTML,
    openReviews, pickQuestion, recordAnswer, questionBlock, rewardText, play, toast, byId, icon, esc, today, newRun,
    renderHeader, showJournal, openThemeDialog, bindGlobal, reducedMotion,
    get canSave() { return canSave; },
  };
})();
