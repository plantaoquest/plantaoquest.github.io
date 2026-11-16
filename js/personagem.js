/*
 * Plantão Quest — criação de personagens.
 * Cada personagem tem aparência própria, especialidade com habilidade de jogo,
 * personalidade que muda as falas e um bordão.
 */
(function personagem() {
  'use strict';
  const { state, byId, icon, esc } = PQ;
  const S = PQSprites;

  const CLASSES = {
    familia: { name: 'Medicina de Família', perk: 'Mão na terra', desc: 'Cada rega faz a planta crescer dois estágios de uma vez.', icon: 'leaf', stats: [3, 5, 3, 3] },
    emergencia: { name: 'Emergência', perk: 'Sangue frio', desc: 'Começa as batalhas da gruta com +10 de vida.', icon: 'bolt', stats: [3, 2, 5, 4] },
    clinica: { name: 'Clínica Médica', perk: 'Olho clínico', desc: 'Uma vez por pergunta na horta, no lago e na gruta, elimina uma alternativa errada.', icon: 'search', stats: [5, 3, 2, 4] },
    cirurgia: { name: 'Cirurgia', perk: 'Mão firme', desc: 'Na gruta, acertos seguidos viram golpes críticos com dano dobrado.', icon: 'sword', stats: [3, 2, 4, 5] },
  };
  const STAT_NAMES = ['Raciocínio', 'Empatia', 'Resistência', 'Foco'];
  const TRAITS = {
    calmo: { name: 'Calma', desc: 'Acolhe sem pressa.', call: 'Pode entrar com calma. Estou aqui para ajudar.', battle: 'Respira fundo… uma questão de cada vez.', win: 'Viu? Com calma a gente resolve.', wrong: 'Tudo bem errar. Vou revisar isso com atenção.' },
    curioso: { name: 'Curiosidade', desc: 'Quer entender cada detalhe.', call: 'Entre! Me conte tudo, quero entender direitinho o que aconteceu.', battle: 'Que criatura estranha… vou estudar você de perto!', win: 'Aprendi mais uma coisa hoje!', wrong: 'Hum… por que será que errei? Vou descobrir.' },
    determinado: { name: 'Determinação', desc: 'Não desiste fácil.', call: 'Vamos resolver isso juntos. Pode entrar!', battle: 'Não vou recuar. Pode vir!', win: 'Mais uma vencida. Próxima!', wrong: 'Anotado. Da próxima vez eu acerto.' },
    brincalhao: { name: 'Bom humor', desc: 'Alivia a tensão com piadas.', call: 'Entre, entre! Prometo que a consulta é mais animada que a fila.', battle: 'Olha o tamanho desse bicho… cadê o repelente?', win: 'Ganhei! Alguém filmou isso?', wrong: 'Ops… essa doeu no orgulho.' },
  };
  const TITLES = [['Dr.', 'Dr.'], ['Dra.', 'Dra.']];
  PQ.CLASSES = CLASSES; PQ.TRAITS = TRAITS; PQ.STAT_NAMES = STAT_NAMES;

  const DEFAULT = { id: 'padrao', name: 'Plantonista', title: 'Dr.', cls: 'clinica', trait: 'calmo', motto: '', look: { skin: S.SKINS[2], hairStyle: 'curto', hairColor: S.HAIR_COLORS[1], eyes: S.EYES[0], outfit: 'jaleco', outfitColor: '#3f8a6a', inner: '#7fb6ea', pants: '#3a3f4a', acc: ['estetoscopio'] } };
  PQ.player = () => state.chars.find((c) => c.id === state.activeChar) || state.chars[0] || DEFAULT;
  PQ.docName = () => { const p = PQ.player(); return `${p.title} ${p.name}`; };
  PQ.hasPerk = (cls) => PQ.player().cls === cls;
  PQ.trait = () => TRAITS[PQ.player().trait] || TRAITS.calmo;
  PQ.level = () => Math.floor(PQ.totalXP() / 100) + 1;
  PQ.stats = (char = PQ.player()) => CLASSES[char.cls].stats.map((v) => Math.min(10, v + Math.floor((PQ.level() - 1) / 1)));
  PQ.fill = (text) => text.replace(/\{doc\}/g, PQ.docName()).replace(/\{nome\}/g, PQ.player().name);

  /* ---------- criador ---------- */
  let draft = null;
  let editingId = null;
  let first = false;
  let anim = null;
  let frame = 0;

  function newDraft() {
    return { name: '', title: 'Dra.', cls: 'clinica', trait: 'curioso', motto: '', look: S.randomLook() };
  }

  const swatches = (key, list, current) => `<div class="swatches" role="group">${list.map((c) => `<button type="button" class="swatch${c === current ? ' on' : ''}" style="--c:${c}" data-look="${key}" data-value="${c}" aria-pressed="${c === current}" aria-label="${key} ${c}"></button>`).join('')}</div>`;
  const options = (key, list, current, attr = 'data-look') => `<div class="opt-row" role="group">${list.map(([v, label]) => `<button type="button" class="opt${v === current ? ' on' : ''}" ${attr}="${key}" data-value="${v}" aria-pressed="${v === current}">${esc(label)}</button>`).join('')}</div>`;

  function roster() {
    const chars = state.chars;
    return `<div class="roster" aria-label="Seus personagens">${chars.map((c) => `
      <div class="roster-card${c.id === state.activeChar ? ' active' : ''}${c.id === editingId ? ' editing' : ''}">
        <canvas width="34" height="34" data-roster="${c.id}"></canvas>
        <div><strong>${esc(c.title)} ${esc(c.name)}</strong><small>${esc(CLASSES[c.cls].name)}${c.id === state.activeChar ? ' · em plantão' : ''}</small>
        <div class="roster-actions">${c.id === state.activeChar ? '' : `<button type="button" class="link-button" data-char="use" data-id="${c.id}">Jogar com</button>`}<button type="button" class="link-button" data-char="edit" data-id="${c.id}">Editar</button></div></div>
      </div>`).join('')}
      ${chars.length < 4 ? `<button type="button" class="roster-new" data-char="new">${icon('cross')} Novo personagem</button>` : ''}</div>`;
  }

  function presets() {
    const list = window.PLANTAO_PERSONAGENS || [];
    if (!list.length) return '';
    return `<section class="presets" aria-label="Personagens prontos"><h2 class="list-heading">${icon('trophy')} Personagens prontos</h2><div class="preset-grid">${list.map((pr) => {
      const mine = state.chars.find((c) => c.id === `preset-${pr.id}`);
      const activeNow = state.activeChar === `preset-${pr.id}`;
      const cl = CLASSES[pr.cls];
      return `<article class="preset-card${activeNow ? ' active' : ''}">
        <img src="${pr.body}" alt="Ficha de ${esc(pr.name)} em corpo inteiro" loading="lazy">
        <div class="preset-info">
          <canvas width="34" height="34" data-preset-portrait="${pr.id}"></canvas>
          <strong>${esc(pr.title)} ${esc(pr.name)}</strong>
          <small>${esc(cl.name)} · ${esc(TRAITS[pr.trait].name)}</small>
          <p>${esc(pr.bio)}</p>
          <p class="perk-line"><b>${esc(cl.perk)}:</b> ${esc(cl.desc)}</p>
          <em>“${esc(pr.motto)}”</em>
          ${activeNow ? '<span class="status-pill">EM PLANTÃO</span>' : `<button type="button" class="primary" data-preset="${pr.id}">${mine ? 'Voltar a jogar' : 'Jogar'} como ${esc(pr.name)} ${icon('arrow')}</button>`}
        </div></article>`;
    }).join('')}</div></section>`;
  }

  function preview() {
    const cls = CLASSES[draft.cls];
    const tr = TRAITS[draft.trait];
    const stats = cls.stats.map((v) => Math.min(10, v + (PQ.level() - 1)));
    return `
      <div class="stage">
        <canvas id="cr-portrait" width="34" height="34"></canvas>
        <canvas id="cr-body" width="18" height="26"></canvas>
      </div>
      <div class="nameplate"><strong>${esc(draft.title)} ${esc(draft.name || 'Sem nome')}</strong><small>${esc(cls.name)} · ${esc(tr.name)}</small></div>
      <div class="perk-card">${icon(cls.icon)}<div><b>Habilidade: ${esc(cls.perk)}</b><small>${esc(cls.desc)}</small></div></div>
      <div class="stat-bars">${STAT_NAMES.map((n, i) => `<div><span>${n}</span><div class="sbar" role="img" aria-label="${n} ${stats[i]} de 10"><i style="width:${stats[i] * 10}%"></i></div><b>${stats[i]}</b></div>`).join('')}</div>
      <p class="motto">“${esc(draft.motto || tr.call)}”</p>`;
  }

  function form() {
    const L = draft.look;
    return `
      <fieldset><legend>Identidade</legend>
        <label class="field-label" for="cr-name">Nome</label>
        <input id="cr-name" class="text-input" maxlength="18" value="${esc(draft.name)}" placeholder="Ex.: Ana, Kauã, Iara" autocomplete="off">
        <span class="field-label">Tratamento</span>${options('title', TITLES, draft.title, 'data-field')}
      </fieldset>
      <fieldset><legend>Aparência</legend>
        <span class="field-label">Tom de pele</span>${swatches('skin', S.SKINS, L.skin)}
        <span class="field-label">Cabelo</span>${options('hairStyle', S.HAIR_STYLES, L.hairStyle)}
        <span class="field-label">Cor do cabelo</span>${swatches('hairColor', S.HAIR_COLORS, L.hairColor)}
        <span class="field-label">Olhos</span>${swatches('eyes', S.EYES, L.eyes)}
        <span class="field-label">Roupa</span>${options('outfit', S.OUTFITS.slice(0, 2), L.outfit)}
        <span class="field-label">Cor ${L.outfit === 'jaleco' ? 'da camisa' : 'do pijama'}</span>${swatches('outfitColor', S.OUTFIT_COLORS, L.outfitColor)}
        <span class="field-label">Acessórios <small>(até 3)</small></span>
        <div class="opt-row" role="group">${S.ACCESSORIES.filter(([id]) => !['bone', 'chapeu'].includes(id)).map(([id, label]) => `<button type="button" class="opt${L.acc.includes(id) ? ' on' : ''}" data-acc="${id}" aria-pressed="${L.acc.includes(id)}">${esc(label)}</button>`).join('')}</div>
      </fieldset>
      <fieldset><legend>Especialidade</legend>
        <div class="class-grid">${Object.entries(CLASSES).map(([id, c]) => `<button type="button" class="class-card${draft.cls === id ? ' on' : ''}" data-field="cls" data-value="${id}" aria-pressed="${draft.cls === id}">
          ${icon(c.icon)}<strong>${esc(c.name)}</strong><b>${esc(c.perk)}</b><small>${esc(c.desc)}</small></button>`).join('')}</div>
      </fieldset>
      <fieldset><legend>Personalidade</legend>
        <div class="class-grid">${Object.entries(TRAITS).map(([id, t]) => `<button type="button" class="class-card trait${draft.trait === id ? ' on' : ''}" data-field="trait" data-value="${id}" aria-pressed="${draft.trait === id}">
          <strong>${esc(t.name)}</strong><small>${esc(t.desc)}</small><em>“${esc(t.call)}”</em></button>`).join('')}</div>
        <label class="field-label" for="cr-motto">Bordão <small>(aparece quando você chama o paciente)</small></label>
        <input id="cr-motto" class="text-input" maxlength="60" value="${esc(draft.motto)}" placeholder="${esc(TRAITS[draft.trait].call)}" autocomplete="off">
      </fieldset>
      <p class="form-error" id="cr-error" role="alert"></p>
      <div class="lesson-end">
        <button type="button" class="secondary" data-char="random">🎲 Aleatório</button>
        <button type="button" class="primary" data-char="save">${editingId ? 'Salvar alterações' : first ? 'Começar o plantão' : 'Criar personagem'} ${icon('arrow')}</button>
        ${editingId && state.chars.length > 1 ? '<button type="button" class="link-button danger" data-char="delete">Excluir personagem</button>' : ''}
      </div>`;
  }

  function drawPreview() {
    S.drawPortrait(byId('cr-portrait'), draft.look, 'happy');
    S.drawChar(byId('cr-body'), draft.look, { frame });
  }
  function refreshPreview() {
    const box = byId('cr-preview');
    if (!box) return;
    box.innerHTML = preview();
    drawPreview();
  }

  function render() {
    const back = !first && state.theme;
    byId('view-personagem').innerHTML = `
      <div class="view-head">
        ${back ? `<button type="button" class="toolbar-button back-button" data-go="vila">${icon('back')} Vila</button>` : ''}
        <div class="kicker"><span class="kicker-mark"></span> CRIAÇÃO DE PERSONAGEM</div>
        <h1 class="view-title" tabindex="-1">Quem está de <span>plantão</span>?<i aria-hidden="true"></i></h1>
        ${first ? '<p class="lede">Monte quem vai atender na Vila Murici. Cada especialidade tem uma habilidade própria e cada personalidade fala do seu jeito.</p>' : ''}
      </div>
      ${presets()}
      ${state.chars.length ? roster() : ''}
      <h2 class="list-heading">${icon('cross')} ${editingId ? 'Editar personagem' : 'Criar do zero'}</h2>
      <div class="split creator">
        <section class="creator-preview" id="cr-preview" aria-label="Prévia do personagem" aria-live="polite">${preview()}</section>
        <section class="side-card creator-form" aria-label="Opções do personagem">${form()}</section>
      </div>`;
    drawPreview();
    byId('view-personagem').querySelectorAll('[data-roster]').forEach((cv) => S.drawPortrait(cv, state.chars.find((c) => c.id === cv.dataset.roster).look, 'neutral'));
    byId('view-personagem').querySelectorAll('[data-preset-portrait]').forEach((cv) => S.drawPortrait(cv, (window.PLANTAO_PERSONAGENS || []).find((p) => p.id === cv.dataset.presetPortrait).look, 'smile'));
  }

  function rerenderKeepFocus(sel) {
    render();
    if (sel) byId('view-personagem').querySelector(sel)?.focus({ preventScroll: true });
  }

  PQ.views.personagem = {
    render(opts = {}) {
      first = !!opts.first || !state.chars.length;
      if (opts.edit) { const c = state.chars.find((x) => x.id === opts.edit); editingId = c ? c.id : null; draft = c ? JSON.parse(JSON.stringify(c)) : newDraft(); }
      else if (opts.refresh && draft) { /* mantém o rascunho */ }
      else if (state.chars.length && !opts.new) { const c = PQ.player(); editingId = c.id; draft = JSON.parse(JSON.stringify(c)); }
      else { editingId = null; draft = newDraft(); }
      render();
      clearInterval(anim);
      if (!PQ.reducedMotion.matches) anim = setInterval(() => { frame = (frame + 1) % 4; const cv = byId('cr-body'); if (cv) S.drawChar(cv, draft.look, { frame: [0, 1, 0, 2][frame] }); }, 220);
    },
    leave() { clearInterval(anim); },
  };

  PQ.bindPersonagem = () => {
    const root = byId('view-personagem');
    root.addEventListener('input', (e) => {
      if (e.target.id === 'cr-name') { draft.name = e.target.value.slice(0, 18); refreshPreview(); }
      if (e.target.id === 'cr-motto') { draft.motto = e.target.value.slice(0, 60); refreshPreview(); }
    });
    root.addEventListener('click', (e) => {
      const look = e.target.closest('[data-look]');
      if (look) { draft.look[look.dataset.look] = look.dataset.value; rerenderKeepFocus(`[data-look="${look.dataset.look}"][data-value="${look.dataset.value}"]`); return; }
      const field = e.target.closest('[data-field]');
      if (field) { draft[field.dataset.field] = field.dataset.value; rerenderKeepFocus(`[data-field="${field.dataset.field}"][data-value="${field.dataset.value}"]`); return; }
      const acc = e.target.closest('[data-acc]');
      if (acc) {
        const id = acc.dataset.acc; const list = draft.look.acc;
        if (list.includes(id)) draft.look.acc = list.filter((x) => x !== id);
        else if (list.length < 3) list.push(id);
        else { PQ.toast('Escolha no máximo 3 acessórios.'); return; }
        rerenderKeepFocus(`[data-acc="${id}"]`); return;
      }
      const pre = e.target.closest('[data-preset]');
      if (pre) {
        const pr = (window.PLANTAO_PERSONAGENS || []).find((p) => p.id === pre.dataset.preset);
        const id = `preset-${pr.id}`;
        if (!state.chars.some((c) => c.id === id)) {
          if (state.chars.length >= 4) { PQ.toast('Você já tem 4 personagens. Exclua um para jogar com este.'); return; }
          state.chars.push({ id, preset: pr.id, name: pr.name, title: pr.title, cls: pr.cls, trait: pr.trait, motto: pr.motto, look: JSON.parse(JSON.stringify(pr.look)), createdAt: Date.now() });
        }
        state.activeChar = id;
        PQ.save(); PQ.renderHeader(); PQ.play('win');
        PQ.toast(`${PQ.docName()} assumiu o plantão!`, 'reward');
        if (first || !state.theme) PQ.go(state.theme ? 'vila' : 'start'); else PQ.views.personagem.render({ edit: id });
        return;
      }
      const ch = e.target.closest('[data-char]');
      if (!ch) return;
      const action = ch.dataset.char;
      if (action === 'random') { draft.look = S.randomLook(); draft.cls = Object.keys(CLASSES)[Math.floor(Math.random() * 4)]; draft.trait = Object.keys(TRAITS)[Math.floor(Math.random() * 4)]; rerenderKeepFocus('[data-char="random"]'); }
      else if (action === 'new') { PQ.views.personagem.render({ new: true }); byId('cr-name')?.focus(); }
      else if (action === 'edit') { PQ.views.personagem.render({ edit: ch.dataset.id }); byId('cr-name')?.focus(); }
      else if (action === 'use') { state.activeChar = ch.dataset.id; PQ.save(); PQ.renderHeader(); PQ.toast(`${PQ.docName()} assumiu o plantão.`); PQ.views.personagem.render({ edit: ch.dataset.id }); }
      else if (action === 'delete') {
        if (ch.dataset.armed !== 'true') { ch.dataset.armed = 'true'; ch.textContent = 'Toque de novo para excluir'; return; }
        state.chars = state.chars.filter((c) => c.id !== editingId);
        if (state.activeChar === editingId) state.activeChar = state.chars[0]?.id || null;
        PQ.save(); PQ.renderHeader(); PQ.views.personagem.render({});
      } else if (action === 'save') {
        const name = draft.name.trim();
        if (!name) { byId('cr-error').textContent = 'Dê um nome ao seu personagem.'; byId('cr-name').focus(); return; }
        draft.name = name;
        if (editingId) {
          const i = state.chars.findIndex((c) => c.id === editingId);
          state.chars[i] = { ...draft, id: editingId };
        } else {
          const id = `c${Date.now().toString(36)}`;
          state.chars.push({ ...draft, id, createdAt: Date.now() });
          state.activeChar = id;
          editingId = id;
        }
        PQ.save(); PQ.renderHeader(); PQ.play('win');
        PQ.toast(`${PQ.docName()} entrou para a equipe da Vila Murici!`, 'reward');
        if (first) PQ.go(state.theme ? 'vila' : 'start'); else PQ.views.personagem.render({ edit: editingId });
      }
    });
  };
})();
