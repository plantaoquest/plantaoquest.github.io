/*
 * Plantão Quest — contas de jogador (login local) e código de transferência.
 *
 * Cada conta (nome + PIN) tem o seu próprio progresso guardado neste navegador.
 * Sem conta, o jogo roda como "Convidado". Não há servidor: para levar o progresso
 * a outro aparelho, o jogador copia o "código de progresso" e cola lá.
 *
 * Como funciona: o jogo sempre lê e grava em `plantao-quest:v3`. Este arquivo roda ANTES
 * de core.js, copia o progresso da conta ativa para essa chave e, a cada salvamento,
 * espelha de volta para a gaveta da conta (`pq-conta:<id>`).
 */
(function contas() {
  'use strict';
  const KEY = 'plantao-quest:v3';
  const INDEX = 'pq-contas';
  const GUEST = 'convidado';
  const slot = (id) => `pq-conta:${id}`;
  let ok = true;
  let trocando = false;
  const get = (k) => { try { return localStorage.getItem(k); } catch { ok = false; return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { ok = false; return false; } };

  function readIndex() {
    try {
      const i = JSON.parse(get(INDEX) || 'null');
      if (i && Array.isArray(i.list)) return { list: i.list.filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string'), active: typeof i.active === 'string' ? i.active : null };
    } catch { /* índice ilegível: recomeça vazio, sem apagar progresso */ }
    return null;
  }
  let index = readIndex();
  const primeiraVez = !index;
  if (!index) index = { list: [], active: null };
  if (index.active && !index.list.some((c) => c.id === index.active)) index.active = null;
  const ativo = () => index.active || GUEST;
  const conta = () => index.list.find((c) => c.id === index.active) || null;
  const writeIndex = () => set(INDEX, JSON.stringify(index));

  // Antes de o jogo carregar: traz o progresso da conta ativa para a chave que o jogo lê.
  (function preparar() {
    if (primeiraVez) { const atual = get(KEY); if (atual) set(slot(GUEST), atual); writeIndex(); return; }
    const salvo = get(slot(ativo()));
    if (salvo) set(KEY, salvo); else set(KEY, '{}');
  })();

  async function hashPin(pin, salt) {
    const txt = `${salt}:${pin}`;
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      let h = 5381; for (const ch of txt) h = (Math.imul(h, 33) ^ ch.charCodeAt(0)) >>> 0;
      return `f${h.toString(16)}`;
    }
  }
  const novoId = () => `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
  const unb64 = (s) => decodeURIComponent(escape(atob(s)));

  function trocarPara(id) { trocando = true; index.active = id; writeIndex(); location.reload(); }

  const api = {
    espelhar(json) { if (!trocando) set(slot(ativo()), json); },
    conta, lista: () => index.list.map((c) => ({ id: c.id, name: c.name })),
    async criar(name, pin, levarProgresso) {
      name = String(name || '').trim().slice(0, 18);
      if (name.length < 2) return 'Escolha um nome com pelo menos 2 letras.';
      if (!/^\d{4,8}$/.test(pin)) return 'O PIN precisa ter de 4 a 8 números.';
      if (index.list.some((c) => c.name.toLowerCase() === name.toLowerCase())) return 'Já existe uma conta com esse nome neste aparelho.';
      if (index.list.length >= 12) return 'Limite de 12 contas neste aparelho.';
      const id = novoId(); const salt = novoId();
      index.list.push({ id, name, salt, pin: await hashPin(pin, salt), at: Date.now() });
      const atual = get(KEY);
      if (!set(slot(id), levarProgresso && atual ? atual : '{}')) return 'Não foi possível salvar neste navegador.';
      trocarPara(id); return null;
    },
    async entrar(id, pin) {
      const c = index.list.find((x) => x.id === id);
      if (!c) return 'Conta não encontrada.';
      if ((await hashPin(pin, c.salt)) !== c.pin) return 'PIN incorreto.';
      trocarPara(id); return null;
    },
    sair() { trocarPara(null); },
    codigo() { return `PQ1.${b64(get(KEY) || '{}')}`; },
    importar(code) {
      code = String(code || '').trim().replace(/\s+/g, '');
      if (!code.startsWith('PQ1.')) return 'Código inválido: ele começa com PQ1.';
      let json;
      try { json = unb64(code.slice(4)); const o = JSON.parse(json); if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('formato'); } catch { return 'Código inválido ou incompleto. Copie o código inteiro.'; }
      trocando = true;
      if (!set(slot(ativo()), json)) { trocando = false; return 'Não foi possível salvar neste navegador.'; }
      location.reload(); return null;
    },
  };
  window.PQContas = api;

  /* ---------- Interface ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  let dlg; let aba = 'principal'; let aviso = '';

  function corpo() {
    const c = conta();
    const msg = aviso ? `<p class="conta-aviso" role="alert">${esc(aviso)}</p>` : '';
    if (aba === 'criar') return `${msg}
      <form data-conta-form="criar" class="conta-form">
        <label class="field-label" for="conta-nome">Nome da conta</label><input id="conta-nome" maxlength="18" autocomplete="off" required>
        <label class="field-label" for="conta-pin">PIN (4 a 8 números)</label><input id="conta-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password" required>
        <label class="conta-check"><input type="checkbox" id="conta-levar" checked> Levar o progresso atual para esta conta</label>
        <button class="primary" type="submit">Criar conta</button>
        <button class="secondary" type="button" data-conta-aba="principal">Voltar</button>
      </form>`;
    if (aba.startsWith('entrar:')) { const alvo = index.list.find((x) => x.id === aba.slice(7)); return `${msg}
      <form data-conta-form="entrar" data-id="${esc(alvo.id)}" class="conta-form">
        <p>Entrar como <b>${esc(alvo.name)}</b></p>
        <label class="field-label" for="conta-pin">PIN</label><input id="conta-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" required>
        <button class="primary" type="submit">Entrar</button>
        <button class="secondary" type="button" data-conta-aba="principal">Voltar</button>
      </form>`; }
    if (aba === 'codigo') return `${msg}
      <div class="conta-form">
        <p><b>Levar o progresso para outro aparelho:</b> copie o código abaixo, abra o jogo no outro aparelho, entre na sua conta e cole em "Colar código".</p>
        <textarea id="conta-codigo" readonly rows="4">${esc(api.codigo())}</textarea>
        <button class="primary" type="button" data-conta-acao="copiar">Copiar código</button>
        <p><b>Colar código</b> (substitui o progresso de ${c ? esc(c.name) : 'Convidado'} neste aparelho):</p>
        <textarea id="conta-colar" rows="3" placeholder="PQ1...."></textarea>
        <button class="secondary" type="button" data-conta-acao="importar">Carregar este progresso</button>
        <button class="secondary" type="button" data-conta-aba="principal">Voltar</button>
      </div>`;
    const outras = index.list.filter((x) => x.id !== index.active);
    return `${msg}
      <p class="conta-atual">${c ? `Você está jogando como <b>${esc(c.name)}</b>.` : 'Você está jogando como <b>Convidado</b>. Crie uma conta para separar o seu progresso com nome e PIN.'}</p>
      ${outras.length ? `<div class="eyebrow">CONTAS NESTE APARELHO</div><div class="conta-lista">${outras.map((x) => `<button type="button" class="secondary" data-conta-aba="entrar:${esc(x.id)}">Entrar como ${esc(x.name)}</button>`).join('')}</div>` : ''}
      <div class="conta-lista">
        <button type="button" class="primary" data-conta-aba="criar">Criar conta nova</button>
        <button type="button" class="secondary" data-conta-aba="codigo">Código de progresso (trocar de aparelho)</button>
        ${c ? '<button type="button" class="secondary" data-conta-acao="sair">Sair da conta (voltar a Convidado)</button>' : ''}
      </div>
      <p class="conta-nota">As contas ficam guardadas neste navegador. O PIN separa os jogadores do mesmo aparelho; para jogar em outro aparelho, use o código de progresso.${ok ? '' : ' Atenção: este navegador está bloqueando o salvamento.'}</p>`;
  }
  function render() { dlg.querySelector('#conta-body').innerHTML = corpo(); }
  function abrir() { aba = 'principal'; aviso = ''; render(); if (!dlg.open) dlg.showModal(); }

  function montar() {
    const diario = document.getElementById('open-journal');
    if (!diario || document.getElementById('open-conta')) return;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'toolbar-button'; btn.id = 'open-conta';
    btn.setAttribute('aria-label', 'Conta do jogador');
    btn.textContent = conta() ? conta().name : 'Entrar';
    diario.before(btn);
    dlg = document.createElement('dialog');
    dlg.className = 'journal conta-dialog'; dlg.id = 'conta-dialog'; dlg.setAttribute('aria-labelledby', 'conta-heading');
    dlg.innerHTML = `<header class="panel-header chart-header"><h2 id="conta-heading">Conta do jogador</h2>
      <form method="dialog"><button class="toolbar-button" type="submit" aria-label="Fechar">✕</button></form></header>
      <div class="journal-body" id="conta-body"></div>`;
    document.body.append(dlg);
    btn.addEventListener('click', abrir);
    dlg.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-conta-aba],[data-conta-acao]'); if (!t) return;
      aviso = '';
      if (t.dataset.contaAba) { aba = t.dataset.contaAba; render(); return; }
      const acao = t.dataset.contaAcao;
      if (acao === 'sair') api.sair();
      if (acao === 'copiar') {
        const ta = dlg.querySelector('#conta-codigo'); ta.select();
        try { await navigator.clipboard.writeText(ta.value); t.textContent = 'Código copiado ✓'; } catch { t.textContent = 'Selecione e copie o texto acima'; }
      }
      if (acao === 'importar') { const erro = api.importar(dlg.querySelector('#conta-colar').value); if (erro) { aviso = erro; render(); } }
    });
    dlg.addEventListener('submit', async (e) => {
      const f = e.target.closest('[data-conta-form]'); if (!f) return;
      e.preventDefault();
      const pin = dlg.querySelector('#conta-pin').value;
      const erro = f.dataset.contaForm === 'criar'
        ? await api.criar(dlg.querySelector('#conta-nome').value, pin, dlg.querySelector('#conta-levar').checked)
        : await api.entrar(f.dataset.id, pin);
      if (erro) { aviso = erro; render(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
