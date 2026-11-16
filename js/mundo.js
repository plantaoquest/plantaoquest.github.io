/*
 * Plantão Quest — motor do mundo 2D da Vila Murici.
 * Mundo em tiles (data/mapas.js) separado da câmera: a câmera segue o personagem com suavização e limites,
 * em zoom inteiro (pixel perfeito). Colisão por eixo com a "pegada" do personagem, portas com animação,
 * interiores com retorno à porta de origem, NPCs com rotas, HUD, minimapa, mapa completo e controles de toque.
 */
(function mundo() {
  'use strict';
  const { state, byId, esc } = PQ;
  const T = 16;
  const MAPS = window.PLANTAO_MAPAS;
  const TL = window.PQTiles;
  const ZOOMS = { perto: 14, medio: 20, longe: 28 };
  const SPEED = 80; // px por segundo
  const FOOT = { w: 10, h: 5 };
  const reduced = () => PQ.reducedMotion.matches;

  let scene; let cv; let c; let W = 320; let H = 180; let scale = 3; let dpr = 1; let RES = 2;
  let map = null; const cam = { x: 0, y: 0 };
  const player = { x: 0, y: 0, dir: 'down', moving: false, walkT: 0, stepT: 0, stuck: 0, bump: 0 };
  const held = new Set();
  let path = null; let pathCb = null; let pathGoal = null;
  let npcs = []; let near = null; let regionId = null;
  let running = false; let raf = null; let last = 0; let time = 0; let saveT = 0;
  let fade = { a: 0, to: 0, speed: 4, cb: null }; let doorAnim = null; let busy = false;
  let particles = [];
  const pad = new Set();

  /* ---------------- utilidades ---------------- */
  const tileAt = (m, tx, ty) => (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h ? 19 : m.tiles[ty * m.w + tx]);
  const overlap = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
  function solids(m) {
    if (!m._solids) {
      m._solids = [];
      m.objects.forEach((o) => { [o.solid, ...(o.solids || [])].forEach((r) => { if (r) m._solids.push([o.x + r[0], o.y + r[1], r[2], r[3]]); }); });
    }
    return m._solids;
  }
  const footRect = (x, y) => [x - FOOT.w / 2, y - FOOT.h, FOOT.w, FOOT.h];
  function blockedRect(m, r, ignoreNpc = null, forNpc = false) {
    const x0 = Math.floor(r[0] / T); const x1 = Math.floor((r[0] + r[2] - 0.01) / T);
    const y0 = Math.floor(r[1] / T); const y1 = Math.floor((r[1] + r[3] - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (TL.SOLID.has(tileAt(m, tx, ty))) return true;
    for (const s of solids(m)) if (overlap(r, s)) return true;
    for (const n of npcs) if (n !== ignoreNpc && !n.hidden && overlap(r, footRect(n.x, n.y))) return true;
    if (forNpc && overlap(r, footRect(player.x, player.y))) return true;
    return false;
  }
  function walkGrid(m) {
    if (m._walk) return m._walk;
    const g = new Uint8Array(m.w * m.h);
    const saved = npcs; npcs = [];
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) g[ty * m.w + tx] = blockedRect(m, footRect(tx * T + 8, ty * T + 12)) ? 0 : 1;
    npcs = saved;
    m._walk = g;
    return g;
  }
  // caminho por BFS em tiles; se o destino não for caminhável, vai ao tile alcançável mais perto dele
  function findPath(m, fx, fy, gx, gy) {
    const g = walkGrid(m);
    const sx = Math.floor(fx / T); const sy = Math.floor(fy / T);
    const tx = Math.max(0, Math.min(m.w - 1, Math.floor(gx / T))); const ty = Math.max(0, Math.min(m.h - 1, Math.floor(gy / T)));
    const prev = new Int32Array(m.w * m.h).fill(-1);
    const start = sy * m.w + sx; prev[start] = start;
    const q = [start]; let best = start; let bestD = Infinity;
    for (let h = 0; h < q.length; h++) {
      const i = q[h]; const x = i % m.w; const y = (i / m.w) | 0;
      const d = Math.abs(x - tx) + Math.abs(y - ty);
      if (d < bestD) { bestD = d; best = i; if (!d) break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        const ni = ny * m.w + nx;
        if (prev[ni] !== -1 || !g[ni]) continue;
        prev[ni] = i; q.push(ni);
      }
    }
    const out = [];
    for (let i = best; i !== start; i = prev[i]) out.push({ x: (i % m.w) * T + 8, y: ((i / m.w) | 0) * T + 12 });
    out.reverse();
    // destino exato se for livre e o melhor tile for o próprio destino
    if (bestD === 0 && !blockedRect(m, footRect(gx, gy))) out.push({ x: gx, y: gy });
    // suaviza: remove pontos em linha reta
    return out.filter((p, i) => i === out.length - 1 || i === 0 || !((out[i - 1].x === p.x && out[i + 1].x === p.x) || (out[i - 1].y === p.y && out[i + 1].y === p.y)));
  }

  /* ---------------- câmera e tamanho ---------------- */
  function resize() {
    if (!scene || !cv) return;
    const r = scene.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const devW = r.width * dpr; const devH = r.height * dpr;
    const fit = (tiles) => Math.max(1, Math.round(Math.min(devW / (tiles * T), devH / (Math.max(9, tiles * 0.56) * T))));
    // cada nível de zoom precisa dar uma escala inteira diferente (pixel perfeito)
    const mid = fit(ZOOMS.medio);
    const z = state.world.zoom;
    scale = z === 'perto' ? Math.max(mid + 1, fit(ZOOMS.perto)) : z === 'longe' ? Math.max(1, Math.min(mid - 1, fit(ZOOMS.longe))) : mid;
    W = Math.ceil(devW / scale); H = Math.ceil(devH / scale);
    // a tela é desenhada na resolução real do aparelho: tiles e prédios em alta definição, sem borrão
    cv.width = W * scale; cv.height = H * scale;
    cv.style.width = `${(W * scale) / dpr}px`; cv.style.height = `${(H * scale) / dpr}px`;
    const res = scale >= 3 ? 4 : 2;
    if (res !== RES) { RES = res; Object.values(MAPS).forEach((m) => { m._chunks = {}; }); }
    c.imageSmoothingEnabled = false;
    snapCamera();
  }
  function camTarget() {
    let x = player.x - W / 2; let y = player.y - 12 - H / 2;
    const mw = map.w * T; const mh = map.h * T;
    x = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, x));
    y = mh <= H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, y));
    return { x, y };
  }
  function snapCamera() { if (!map) return; const t = camTarget(); cam.x = t.x; cam.y = t.y; }
  const camPx = (v) => Math.round(v * scale) / scale;
  const toScreen = (wx, wy) => ({ x: ((wx - camPx(cam.x)) * scale) / dpr, y: ((wy - camPx(cam.y)) * scale) / dpr });

  /* ---------------- chão em pedaços (só a área visível é desenhada) ---------------- */
  const CH = 16;
  function chunk(m, cx, cy) {
    m._chunks = m._chunks || {};
    const key = `${cx},${cy}`;
    if (m._chunks[key]) return m._chunks[key];
    const R = RES; const S = CH * T;
    const cnv = document.createElement('canvas'); cnv.width = S * R; cnv.height = S * R;
    const g = cnv.getContext('2d'); g.imageSmoothingEnabled = false;
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const wx = cx * CH + tx; const wy = cy * CH + ty;
      if (wx >= m.w || wy >= m.h) continue;
      const id = tileAt(m, wx, wy);
      g.drawImage(TL.tileRes(id, ((wx * 7 + wy * 13) % 8), R), tx * T * R, ty * T * R);
      const X = tx * T * R; const Y = ty * T * R; const u = R / 2;
      // bordas suaves: espuma na margem da água e franja de grama sobre caminhos
      const nearSmooth = (m.smooth || []).some((sm) => ((wx + 0.5 - sm.cx) / (sm.rx + 1.5)) ** 2 + ((wy + 0.5 - sm.cy) / (sm.ry + 1.5)) ** 2 <= 1);
      if ((id === 5 || id === 16) && !nearSmooth) {
        if (![5, 16, 8].includes(tileAt(m, wx, wy - 1))) { g.fillStyle = '#e4f7ff'; g.fillRect(X, Y, T * R, 3 * u); g.fillStyle = '#9fdcff'; g.fillRect(X, Y + 3 * u, T * R, 2 * u); g.fillStyle = '#2b7fc0'; g.fillRect(X, Y + 5 * u, T * R, u); }
        if (![5, 16, 8].includes(tileAt(m, wx - 1, wy))) { g.fillStyle = '#c8efff'; g.fillRect(X, Y, 2 * u, T * R); }
        if (![5, 16, 8].includes(tileAt(m, wx + 1, wy))) { g.fillStyle = '#c8efff'; g.fillRect(X + T * R - 2 * u, Y, 2 * u, T * R); }
      }
      if ([0, 1, 10].includes(id)) {
        const below = tileAt(m, wx, wy + 1);
        if ([2, 3, 4, 6].includes(below)) { for (let i = 0; i < T * R; i += 3 * u) { g.fillStyle = '#4f9a36'; g.fillRect(X + i, Y + T * R - 2 * u, 2 * u, 3 * u); g.fillStyle = '#86cf5a'; g.fillRect(X + i, Y + T * R - 2 * u, u, u); } }
        const above = tileAt(m, wx, wy - 1);
        if ([2, 3, 4, 6].includes(above)) { g.fillStyle = 'rgba(30,60,20,.18)'; g.fillRect(X, Y, T * R, 2 * u); }
      }
      if ([3, 4].includes(id) && [0, 1, 10].includes(tileAt(m, wx, wy - 1))) { g.fillStyle = 'rgba(40,60,20,.22)'; g.fillRect(X, Y, T * R, 2 * u); }
    }
    // contornos suaves: o lago e a areia seguem uma elipse, sem degraus de tile
    const smoothed = new Set();
    (m.smooth || []).forEach((sm) => {
      const inE = (x, y) => ((x - sm.cx) / sm.rx) ** 2 + ((y - sm.cy) / sm.ry) ** 2 <= 1;
      const ecx = (sm.cx * T - cx * S) * R; const ecy = (sm.cy * T - cy * S) * R;
      const UNDER = sm.under === 0 ? [0, 1, 10] : [sm.under];
      for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
        const wx = cx * CH + tx; const wy = cy * CH + ty;
        const id = tileAt(m, wx, wy);
        // só tiles na borda da elipse
        const corners = [[wx, wy], [wx + 1, wy], [wx, wy + 1], [wx + 1, wy + 1]].map(([x, y]) => inE(x, y));
        if (corners.every(Boolean) || !corners.some(Boolean)) continue;
        const X = tx * T * R; const Y = ty * T * R; const E = T * R; const v = ((wx * 7 + wy * 13) % 8);
        if (id === sm.tile) {
          smoothed.add(`${tx},${ty}`);
          g.save(); g.beginPath(); g.rect(X, Y, E, E); g.ellipse(ecx, ecy, sm.rx * T * R, sm.ry * T * R, 0, 0, Math.PI * 2); g.clip('evenodd');
          g.drawImage(TL.tileRes(sm.under, v, R), X, Y); g.restore();
        } else if (UNDER.includes(id)) {
          smoothed.add(`${tx},${ty}`);
          g.save(); g.beginPath(); g.rect(X, Y, E, E); g.clip(); g.beginPath(); g.ellipse(ecx, ecy, sm.rx * T * R, sm.ry * T * R, 0, 0, Math.PI * 2); g.clip();
          g.drawImage(TL.tileRes(sm.tile, v, R), X, Y); g.restore();
        }
      }
      if (sm.tile === 5) {
        g.save(); g.beginPath(); g.ellipse(ecx, ecy, sm.rx * T * R - R, sm.ry * T * R - R, 0, 0, Math.PI * 2);
        g.strokeStyle = '#e4f7ff'; g.lineWidth = 2 * R; g.stroke(); g.strokeStyle = 'rgba(159,220,255,.7)'; g.lineWidth = R; g.beginPath(); g.ellipse(ecx, ecy, sm.rx * T * R - 3 * R, sm.ry * T * R - 3 * R, 0, 0, Math.PI * 2); g.stroke(); g.restore();
      } else { g.save(); g.beginPath(); g.ellipse(ecx, ecy, sm.rx * T * R, sm.ry * T * R, 0, 0, Math.PI * 2); g.strokeStyle = 'rgba(150,120,60,.45)'; g.lineWidth = R; g.stroke(); g.restore(); }
    });
    // cantos arredondados: rio e demais águas sem degraus
    const GROUP = { 5: [5, 16, 8], 6: [6, 5, 16, 8] };
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const wx = cx * CH + tx; const wy = cy * CH + ty;
      const id = tileAt(m, wx, wy); const grp = GROUP[id];
      if (!grp || wx >= m.w || wy >= m.h || smoothed.has(`${tx},${ty}`)) continue;
      const X = tx * T * R; const Y = ty * T * R; const r = 7 * R; const E = T * R;
      [[-1, -1, X, Y], [1, -1, X + E, Y], [-1, 1, X, Y + E], [1, 1, X + E, Y + E]].forEach(([dx, dy, px, py]) => {
        const nv = tileAt(m, wx, wy + dy); const nh = tileAt(m, wx + dx, wy);
        if (grp.includes(nv) || grp.includes(nh) || nv !== nh) return;
        const ccx = px - dx * r; const ccy = py - dy * r;
        const aA = Math.atan2(py - ccy, 0); const aB = Math.atan2(0, px - ccx);
        const ccw = ((aB - aA + Math.PI * 2) % (Math.PI * 2)) > Math.PI;
        g.save(); g.beginPath(); g.moveTo(px, py); g.lineTo(ccx, py); g.arc(ccx, ccy, r, aA, aB, ccw); g.closePath(); g.clip();
        g.drawImage(TL.tileRes(nv, ((wx * 7 + wy * 13) % 8), R), X, Y);
        g.restore();
        if (id === 5) { g.strokeStyle = '#e4f7ff'; g.lineWidth = R; g.beginPath(); g.arc(ccx, ccy, r - R / 2, aA, aB, ccw); g.stroke(); }
      });
    }
    m.objects.filter((o) => o.flat).forEach((o) => { const ox = o.x - cx * S; const oy = o.y - cy * S; if (ox > -o.w && oy > -o.h && ox < S && oy < S) { const art = TL.objectCanvas(o, R); if (art) g.drawImage(art, ox * R, oy * R, o.w * R, o.h * R); } });
    (m.signs || []).forEach((sg) => {
      const ox = (sg.x - cx * S) * R; const oy = (sg.y - cy * S) * R;
      if (ox < -400 || oy < -80 || ox > S * R || oy > S * R) return;
      if (sg.strip) { sg.strip.forEach((col, i) => { g.fillStyle = '#1a1622'; g.fillRect(ox + (i * 9 - 1) * R, oy - R, 9 * R, 6 * R); g.fillStyle = col; g.fillRect(ox + i * 9 * R, oy, 7 * R, 4 * R); }); return; }
      const w = (TL.textWidth(sg.text, true) + 6) * R;
      g.fillStyle = '#1a1622'; g.fillRect(ox - R, oy - R, w + 2 * R, 13 * R); g.fillStyle = sg.color; g.fillRect(ox, oy, w, 11 * R);
      TL.drawText(g, sg.text, ox + 3 * R, oy + 3 * R, '#ffffff', { small: true, scale: R });
    });
    m._chunks[key] = cnv;
    return cnv;
  }
  function invalidate(m) { m._chunks = {}; m._mini = null; }

  /* ---------------- carregar mapa ---------------- */
  const NPC_DEFS = () => window.PLANTAO_NPCS || [];
  function npcHidden(def) {
    if (def.preset && state.activeChar === `preset-${def.id}`) return true;
    if (def.patient) { const ca = PQ.caseOfDay(PQ.theme().id); return !ca || state.cases[ca.id].completions > 0; }
    return false;
  }
  function spawnNpcs() {
    npcs = NPC_DEFS().filter((d) => d.map === map.id).map((def) => ({
      def, id: def.id, x: def.x * T, y: def.y * T, dir: def.dir || 'down', frame: 0, walkT: 0, route: def.route ? 1 : 0, wait: 1 + Math.random() * 2,
      hidden: npcHidden(def), talking: false, gesture: 0, blink: Math.random() * 4,
      look: def.patient ? PQ.caseOfDay(PQ.theme().id)?.look : def.look,
    }));
  }
  function loadMap(id, pos) {
    map = MAPS[id] || MAPS.vila;
    state.world.map = map.id;
    const p = pos || map.spawn;
    player.x = p.x; player.y = p.y; player.dir = p.dir || 'down';
    path = null; pathCb = null; held.clear(); pad.clear();
    spawnNpcs();
    // se o ponto salvo ficou dentro de algo sólido, volta ao início do mapa
    if (blockedRect(map, footRect(player.x, player.y))) { const s = map.spawn; player.x = s.x; player.y = s.y; }
    particles = [];
    regionId = null;
    snapCamera();
    updateRegion(true);
    persist(true);
    renderHudStatic();
  }
  function persist(now) {
    Object.assign(state.world, { map: map.id, x: Math.round(player.x), y: Math.round(player.y), dir: player.dir });
    if (now) PQ.save();
  }

  /* ---------------- regiões, descoberta e música ---------------- */
  function currentRegion() {
    if (map.interior) return { id: map.id.replace('int-', ''), name: map.region?.name || map.name, music: map.region?.music || map.music };
    const tx = player.x / T; const ty = player.y / T;
    return map.regions.find((r) => tx >= r.rect[0] && tx < r.rect[0] + r.rect[2] && ty >= r.rect[1] && ty < r.rect[1] + r.rect[3]) || map.regions[2];
  }
  function updateRegion(force) {
    const r = currentRegion();
    if (!force && r.id === regionId) return;
    regionId = r.id;
    const nm = byId('hud-region-name'); if (nm) nm.textContent = r.name;
    const mp = byId('hud-map'); if (mp) mp.textContent = map.interior ? 'INTERIOR' : 'VILA MURICI';
    if (!state.world.visited[r.id]) {
      state.world.visited[r.id] = 1;
      if (!force || map.interior) { worldToast(`Nova área descoberta: ${r.name}`); PQ.play('descoberta'); }
      PQ.save();
    } else if (!force) worldToast(r.name, 'quiet');
    PQ.views.vila && state.view === 'vila' && window.PQAudio?.music(r.music);
    ambientFor();
  }
  function ambientFor() {
    if (!window.PQAudio || !state.sound) return;
    if (map.interior) { PQAudio.ambient({ water: 0, wind: 0, birds: 0 }); return; }
    const dWater = Math.min(dist(player, { x: 35.5 * T, y: 54 * T }), dist(player, { x: 78 * T, y: 48 * T }), dist(player, { x: 46 * T, y: 31 * T }) * 1.6);
    PQAudio.ambient({ water: Math.max(0, 1 - dWater / 260), wind: 0.35, birds: player.y > 44 * T ? 0.9 : 0.4 });
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let toastTimer = null;
  function worldToast(text, kind = '') {
    const el = byId('world-toast'); if (!el) return;
    el.textContent = text; el.className = `world-toast show ${kind}`; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = 'world-toast'; el.hidden = true; }, kind === 'quiet' ? 1600 : 2800);
  }

  /* ---------------- interação ---------------- */
  function candidates() {
    const out = [];
    const p = { x: player.x, y: player.y };
    map.doors.forEach((d) => { const r = d.rect; if (p.x >= r[0] - 6 && p.x <= r[0] + r[2] + 6 && p.y >= r[1] - 4 && p.y <= r[1] + r[3] + 6) out.push({ kind: 'door', ref: d, d: dist(p, d), label: d.label, sub: d.sublabel, prompt: d.exit ? 'Pressione E para sair' : 'Pressione E para entrar', ax: d.x, ay: d.exit ? d.y - 34 : d.y + 16, below: !d.exit }); });
    map.objects.forEach((o) => {
      if (!o.interact) return;
      const hr = o.hit || o.solid;
      const r = hr ? [o.x + hr[0], o.y + hr[1], hr[2], hr[3]] : [o.x, o.y, o.w, o.h];
      const dx = Math.max(r[0] - p.x, 0, p.x - (r[0] + r[2])); const dy = Math.max(r[1] - p.y, 0, p.y - (r[1] + r[3]));
      const dd = Math.hypot(dx, dy);
      if (dd <= 16) out.push({ kind: 'obj', ref: o, d: dd + 4, label: o.label, prompt: o.interact.prompt, ax: o.x + o.w / 2, ay: o.y - 4 });
    });
    (map.spots || []).forEach((s) => { const r = s.rect; if (p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3] + 8) out.push({ kind: 'obj', ref: s, d: 10, label: s.label, prompt: s.interact.prompt, ax: s.x, ay: s.y - 20 }); });
    npcs.forEach((n) => { if (n.hidden) return; const dd = dist(p, n); if (dd <= (n.def.reach || 28)) out.push({ kind: 'npc', ref: n, d: dd - 6, label: n.def.patient ? PQ.caseOfDay(PQ.theme().id)?.patient.name : n.def.name, sub: n.def.role, prompt: 'Pressione E para conversar', ax: n.x, ay: n.y - 30 }); });
    return out.sort((a, b) => a.d - b.d);
  }
  function updateNear() {
    const cands = PQ.dialogOpen() || busy ? [] : candidates();
    const nn = cands[0] || null;
    const changed = (nn?.ref) !== (near?.ref);
    near = nn;
    const el = byId('world-prompt'); const act = byId('pad-act');
    if (!el) return;
    if (!near || overlayOpen()) { el.hidden = true; if (act) { act.classList.remove('ready'); act.setAttribute('aria-label', 'Interagir'); } if (changed) setHint(null); return; }
    const s = toScreen(near.ax, near.ay);
    el.hidden = false;
    if (changed) {
      el.innerHTML = `<b>${esc(near.label || '')}</b>${near.sub ? `<small>${esc(near.sub)}</small>` : ''}<span><i class="key" aria-hidden="true">E</i>${esc(near.prompt.replace('Pressione E para ', ''))}</span>`;
      setHint(near);
      if (act) { act.classList.add('ready'); act.setAttribute('aria-label', `${near.prompt.replace('Pressione E para ', '')}: ${near.label}`); }
    }
    el.classList.toggle('below', !!near.below);
    el.style.left = `${Math.max(70, Math.min(scene.clientWidth - 70, s.x))}px`;
    el.style.top = near.below ? `${Math.min(scene.clientHeight - 70, s.y)}px` : `${Math.max(46, s.y)}px`;
  }
  function setHint(n) {
    const h = byId('vila-hint'); if (!h) return;
    h.textContent = n ? `${n.prompt}: ${n.label}.` : 'Ande pela vila: WASD ou setas, E para interagir, M para o mapa e Esc para o menu.';
  }
  function interact(target = near) {
    if (!target || busy) return false;
    if (target.kind === 'door') { enterDoor(target.ref); return true; }
    if (target.kind === 'npc') { talk(target.ref); return true; }
    if (target.kind === 'obj') { runAction(target.ref.interact.action, target.ref); return true; }
    return false;
  }
  function runAction(action, o) {
    const [kind, arg] = action.split(':');
    if (kind === 'view') { PQ.play('confirm'); transitionTo(() => PQ.go(arg)); return; }
    if (kind === 'say') { const fn = window.PLANTAO_SAY?.[arg]; if (fn) sayLines(fn(ctx()).map((l) => ({ look: null, mood: 'neutral', ...l }))); return; }
    if (kind === 'book') { sayLines(bookLines(arg)); }
  }
  function bookLines(id) {
    const t = PQ.theme(); const who = 'Livro'; const sign = true;
    if (id === 'livro-ficha') return [{ who, role: `Ficha · ${t.name}`, text: t.ficha.resumo, sign }, ...t.ficha.pontos.slice(0, 4).map((pt, i) => ({ who, role: `Ponto ${i + 1}`, text: pt, sign }))];
    if (id === 'livro-fontes') { const fs = (t.ficha.fontes || []).slice(0, 4); return fs.length ? fs.map((f, i) => ({ who, role: `Fonte oficial ${i + 1} de ${fs.length}`, text: `${PQ.fonte(f).label}. O link fica na ficha do tema e no diário.`, sign })) : [{ who, role: 'Fontes', text: 'Este tema ainda não tem fontes cadastradas.', sign }]; }
    if (id === 'livro-revisao') { const open = PQ.openReviews(t.id); return [{ who, role: 'Dúvidas para revisar', text: open.length ? `Você tem ${open.length} dúvida${open.length > 1 ? 's' : ''} de ${t.short} na fila. Elas voltam primeiro na horta, no lago e na gruta.` : `Nenhuma dúvida aberta de ${t.short}. Continue assim!`, sign }]; }
    if (id === 'livro-caderneta') return [{ who, role: 'Caderneta', text: 'Os esquemas que você guarda na aula ficam na caderneta do diário.', sign, choices: [{ label: 'Abrir o diário', onPick: () => { PQ.showJournal?.('caderneta'); } }, { label: 'Fechar', cancel: true }] }];
    return [];
  }
  function sayLines(lines, onDone) { if (lines.length) PQ.say(scene, lines.map((l) => ({ ...l, look: l.look || PQ.player().look })), { focus: true, onDone }); }

  function ctx() {
    const t = PQ.theme();
    const self = {
      t, state, next: PQ.nextAction(), case: PQ.caseOfDay(t.id) || null,
      go: (v) => transitionTo(() => PQ.go(v)),
      openCase: (id) => transitionTo(() => PQ.openCase(id)),
      guide: (place) => guideTo(place),
      quiz: (n, count, opts = {}) => quizLines(n, count, 0, 0, [], opts),
    };
    return self;
  }
  function quizLines(n, count, i, score, used, opts = {}) {
    const t = PQ.theme();
    const qid = (opts.minLevel && (PQ.pickQuestion(t.id, { exclude: used, minLevel: opts.minLevel, preferReview: false }) || PQ.pickQuestion(t.id, { exclude: used, minLevel: opts.minLevel - 1, preferReview: false }))) || PQ.pickQuestion(t.id, { exclude: used });
    const line = (text, mood, extra = {}) => ({ who: n.name, role: n.role, look: n.look, mood, text, ...extra });
    if (!qid) return [line('Por hoje é só!', 'smile')];
    const q = PQ.question(qid);
    return [line(`${count > 1 ? `Pergunta ${i + 1} de ${count}. ` : ''}${q.enunciado}`, 'thinking', {
      choices: q.alternativas.map((alt, k) => ({ label: alt, onPick: () => {
        const ok = k === q.correta;
        const rw = PQ.recordAnswer(qid, ok, opts.source || 'npc');
        PQ.save(); PQ.renderHeader();
        PQ.play(ok ? 'win' : 'retry');
        if (rw && (rw.xp || rw.coins)) PQ.toast(PQ.rewardText(rw), 'reward');
        const fb = line(`${ok ? 'Isso mesmo!' : `Ainda não. A certa era: ${q.alternativas[q.correta]}.`} ${q.explicacao}`, ok ? 'happy' : 'serious');
        const total = score + (ok ? 1 : 0);
        if (i + 1 < count) return [fb, ...quizLines(n, count, i + 1, total, [...used, qid], opts)];
        if (opts.onEnd) { const extra = opts.onEnd(total, count); return [fb, ...(extra || [])]; }
        if (count > 1) { PQ.play(total === count ? 'conquista' : 'missao'); return [fb, line(`Resultado do simulado: ${total} de ${count}. ${total === count ? 'Gabaritou!' : 'As dúvidas foram para a fila de revisão.'}`, total === count ? 'happy' : 'smile')]; }
        return [fb];
      } })),
    })];
  }
  function talk(n) {
    if (!n || n.hidden) return;
    path = null; pathCb = null; held.clear();
    const lines = n.def.talk.call({ ...n.def, look: n.look }, ctx());
    if (!lines.length) return;
    n.talking = true; n.gesture = 0.7;
    const dx = player.x - n.x; const dy = player.y - n.y;
    n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    player.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'right' : 'left') : (dy < 0 ? 'down' : 'up');
    state.world.talked[n.id] = 1;
    PQ.say(scene, lines, { focus: true, onDone: () => { n.talking = false; } });
    setTimeout(() => { if (!PQ.dialogOpen()) n.talking = false; }, 20000);
  }
  // fala com um NPC de qualquer mapa (atalho do painel): anda até ele ou viaja até o mapa dele
  function talkTo(id) {
    const def = NPC_DEFS().find((d) => d.id === id);
    if (!def || !map) return;
    const go = () => {
      const n = npcs.find((x) => x.id === id);
      if (!n || n.hidden) return;
      const dd = dist(player, n);
      if (dd <= (def.reach || 28)) { talk(n); return; }
      if (dd > 200) { travel(map.id, spotNear(map, n.x, n.y, def), () => { const nn = npcs.find((x) => x.id === id); if (nn) talk(nn); }); return; }
      walkTo(n.x, n.y + 14, () => { const nn = npcs.find((x) => x.id === id); if (nn) talk(nn); }, n);
    };
    if (def.map === map.id) { go(); return; }
    const spot = spotNear(MAPS[def.map], def.x * T, def.y * T, def);
    travel(def.map, spot, () => { const n = npcs.find((x) => x.id === id); if (n) talk(n); });
  }
  // ponto livre logo à frente de um NPC (para chegar e conversar)
  function spotNear(m, x, y, def) {
    const saved = npcs; if (m !== map) npcs = [];
    let best = { x, y: y + 16, dir: 'up' };
    for (const [dx, dy] of [[0, def.reach ? 40 : 16], [0, 26], [16, 0], [-16, 0], [0, 34], [20, 16], [-20, 16], [0, -16]]) {
      if (!blockedRect(m, footRect(x + dx, y + dy))) { best = { x: x + dx, y: y + dy, dir: dy > 0 ? 'up' : dy < 0 ? 'down' : dx > 0 ? 'left' : 'right' }; break; }
    }
    npcs = saved;
    return best;
  }
  function travel(mapId, pos, after) {
    busy = true;
    fadeTo(1, () => {
      if (MAPS[mapId].interior && !map.interior) state.world.ret = { map: map.id, x: Math.round(player.x), y: Math.round(player.y), dir: 'down' };
      if (!MAPS[mapId].interior) state.world.ret = null;
      loadMap(mapId, pos);
      fadeTo(0, () => { busy = false; after?.(); });
    });
  }

  /* ---------------- portas e transições ---------------- */
  function fadeTo(a, cb) { if (reduced()) { fade.a = a; fade.to = a; cb?.(); return; } fade.to = a; fade.cb = cb; }
  function transitionTo(fn) {
    if (state.view !== 'vila' || reduced()) { fn(); return; }
    busy = true;
    fadeTo(1, () => { busy = false; fade.a = 0; fade.to = 0; persist(false); fn(); });
  }
  function enterDoor(d) {
    if (busy) return;
    path = null; pathCb = null; held.clear();
    if (d.exit) { exitInterior(); return; }
    const bld = map.objects.find((o) => o.id === d.building);
    busy = true;
    PQ.play('porta');
    doorAnim = { o: bld, t: 0 };
    const after = () => {
      if (d.action) {
        Object.assign(state.world, { x: Math.round(d.x), y: Math.round(d.y + 4), dir: 'down' });
        player.x = d.x; player.y = d.y + 4; player.dir = 'down';
        fadeTo(1, () => { busy = false; doorAnim = null; fade.a = 0; fade.to = 0; PQ.save(); PQ.go(d.action.split(':')[1]); });
        return;
      }
      fadeTo(1, () => {
        doorAnim = null;
        state.world.ret = { map: map.id, x: Math.round(d.x), y: Math.round(d.y + 4), dir: 'down' };
        loadMap(d.to);
        PQ.play('portaFecha');
        fadeTo(0, () => { busy = false; });
      });
    };
    if (reduced()) after(); else setTimeout(after, 320);
  }
  function exitInterior() {
    const ret = state.world.ret || { map: 'vila', ...MAPS.vila.spawn };
    busy = true;
    PQ.play('porta');
    fadeTo(1, () => {
      state.world.ret = null;
      loadMap(ret.map, { x: ret.x, y: ret.y, dir: ret.dir || 'down' });
      PQ.play('portaFecha');
      fadeTo(0, () => { busy = false; });
    });
  }
  // entra direto num prédio (atalho do painel lateral)
  function enterBuilding(id) {
    if (!map) return false;
    const vila = MAPS.vila;
    const d = vila.doors.find((x) => x.id === `${id}-porta`);
    if (!d || !d.to) return false;
    busy = true;
    fadeTo(1, () => {
      state.world.ret = { map: 'vila', x: Math.round(d.x), y: Math.round(d.y + 4), dir: 'down' };
      loadMap(d.to);
      fadeTo(0, () => { busy = false; });
    });
    return true;
  }

  /* ---------------- missão e guia ---------------- */
  function missionTarget() {
    const nx = PQ.nextAction();
    const inside = { ubs: ['int-ubs', 'celia'], biblioteca: ['int-biblioteca', 'iracema'] }[nx.place];
    if (map.interior) {
      if (inside && inside[0] === map.id) { const n = npcs.find((x) => x.id === (nx.place === 'ubs' && !npcs.find((p) => p.id === 'paciente')?.hidden ? 'paciente' : inside[1])); if (n && !n.hidden) return { x: n.x, y: n.y - 30, approach: { x: n.x, y: n.y + 16 }, npc: n }; }
      const ex = map.doors.find((d) => d.exit); return ex ? { x: ex.x, y: ex.y - 20, approach: { x: ex.x, y: ex.y - 4 }, exit: ex } : null;
    }
    const ref = MAPS.vila.places[nx.place];
    const d = map.doors.find((x) => x.id === ref);
    if (d) return { x: d.x, y: d.y - 40, approach: { x: d.x, y: d.y }, door: d };
    const o = map.objects.find((x) => x.id === ref);
    if (o) return { x: o.x + o.w / 2, y: o.y - 6, approach: { x: o.x + o.w / 2, y: o.y + (o.solid ? o.solid[1] + o.solid[3] : o.h) + 8 }, obj: o };
    return null;
  }
  function guideTo(place) {
    const tgt = missionTarget(); if (!tgt) return;
    walkTo(tgt.approach.x, tgt.approach.y, () => {
      const cands = candidates();
      const hit = cands.find((k) => k.ref === tgt.door || k.ref === tgt.obj || k.ref === tgt.npc || k.ref === tgt.exit) || cands[0];
      if (hit) interact(hit);
    });
  }
  function walkTo(x, y, cb, ignoreNpc) {
    if (!map) return;
    const saved = ignoreNpc;
    path = findPath(map, player.x, player.y, x, y);
    pathCb = cb || null; pathGoal = { x, y, npc: saved };
    player.stuck = 0;
    if (!path.length) { const f = pathCb; path = null; pathCb = null; f?.(); }
  }

  /* ---------------- atualização ---------------- */
  const DIRS = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0], up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function tryMove(dx, dy) {
    let moved = false; let blockedUp = false;
    if (dx) {
      const nx = player.x + dx;
      if (!blockedRect(map, footRect(nx, player.y))) { player.x = nx; moved = true; }
      else for (const off of [1, -1, 2, -2, 3, -3, 4, -4]) { if (!blockedRect(map, footRect(nx, player.y + off)) && !blockedRect(map, footRect(player.x, player.y + off))) { player.y += Math.sign(off) * Math.min(1, Math.abs(off)); moved = true; break; } }
    }
    if (dy) {
      const ny = player.y + dy;
      if (!blockedRect(map, footRect(player.x, ny))) { player.y = ny; moved = true; }
      else {
        if (dy < 0) blockedUp = true;
        for (const off of [1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) { if (!blockedRect(map, footRect(player.x + off, ny)) && !blockedRect(map, footRect(player.x + off, player.y))) { player.x += Math.sign(off) * Math.min(1, Math.abs(off)); moved = true; break; } }
      }
    }
    return { moved, blockedUp };
  }
  function update(dt) {
    time += dt;
    // esmaecimento
    if (fade.a !== fade.to) {
      const s = dt * 4.5;
      fade.a = fade.a < fade.to ? Math.min(fade.to, fade.a + s) : Math.max(fade.to, fade.a - s);
      if (fade.a === fade.to && fade.cb) { const cb = fade.cb; fade.cb = null; cb(); }
    }
    if (doorAnim) doorAnim.t = Math.min(1, doorAnim.t + dt * 3.4);
    const frozen = busy || PQ.dialogOpen() || overlayOpen();
    // entrada
    let ix = 0; let iy = 0;
    if (!frozen) {
      for (const k of held) { ix += DIRS[k][0]; iy += DIRS[k][1]; }
      for (const k of pad) { ix += DIRS[k][0]; iy += DIRS[k][1]; }
      if (ix || iy) { path = null; pathCb = null; }
    }
    let moving = false;
    if (!frozen && (ix || iy)) {
      const len = Math.hypot(ix, iy); const sp = SPEED * dt;
      const r = tryMove((ix / len) * sp, (iy / len) * sp);
      player.dir = Math.abs(ix) > Math.abs(iy) ? (ix < 0 ? 'left' : 'right') : (iy < 0 ? 'up' : 'down');
      moving = r.moved;
      // empurrar contra a porta também entra
      if (r.blockedUp && iy < 0) {
        player.bump += dt;
        const d = map.doors.find((x) => !x.exit && Math.abs(player.x - x.x) < 12 && player.y - (x.y - 6) < 10 && player.y >= x.y - 16);
        if (d && player.bump > 0.25) { player.bump = 0; enterDoor(d); }
      } else player.bump = 0;
      if (map.interior && iy > 0) { const ex = map.doors.find((x) => x.exit); if (ex && player.x >= ex.rect[0] && player.x <= ex.rect[0] + ex.rect[2] && player.y >= (map.h - 1) * T - 3) exitInterior(); }
    } else if (!frozen && path && path.length) {
      const p = path[0];
      const dx = p.x - player.x; const dy = p.y - player.y; const len = Math.hypot(dx, dy); const sp = SPEED * dt;
      if (len <= sp + 0.01) {
        if (!blockedRect(map, footRect(p.x, p.y), pathGoal?.npc)) { player.x = p.x; player.y = p.y; }
        path.shift(); moving = true;
      } else {
        const bx = player.x; const by = player.y;
        tryMove((dx / len) * sp, (dy / len) * sp);
        moving = Math.abs(bx - player.x) + Math.abs(by - player.y) > 0.01;
        if (!moving) { player.stuck += dt; if (player.stuck > 0.6) { path.shift(); player.stuck = 0; } } else player.stuck = 0;
        player.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      }
      if (!path.length) { path = null; const cb = pathCb; pathCb = null; cb?.(); }
    }
    player.moving = moving;
    if (moving) {
      player.walkT += dt;
      player.stepT += dt;
      if (player.stepT > 0.3) { player.stepT = 0; PQ.play('passo'); }
      saveT += dt;
      if (saveT > 1.5) { saveT = 0; persist(true); updateRegion(); if (Math.random() < 0.3) ambientFor(); }
    }
    // NPCs com rota
    for (const n of npcs) {
      if (n.hidden) continue;
      n.blink -= dt; if (n.blink < -0.15) n.blink = 2 + Math.random() * 4;
      if (n.gesture > 0) n.gesture -= dt;
      if (!n.def.route || n.talking || reduced()) { n.moving = false; continue; }
      if (n.wait > 0) { n.wait -= dt; n.moving = false; continue; }
      const wp = n.def.route[n.route]; const tx = wp[0] * T; const ty = wp[1] * T;
      const dx = tx - n.x; const dy = ty - n.y; const len = Math.hypot(dx, dy); const sp = (n.def.speed || 28) * dt;
      if (len <= sp) { n.x = tx; n.y = ty; n.route = (n.route + 1) % n.def.route.length; n.wait = 0.8 + Math.random() * 2.2; n.moving = false; continue; }
      const nx = n.x + (dx / len) * sp; const ny = n.y + (dy / len) * sp;
      if (overlap(footRect(nx, ny), footRect(player.x, player.y))) { n.moving = false; n.wait = 0.4; continue; } // espera o jogador passar
      n.x = nx; n.y = ny; n.moving = true; n.walkT += dt;
      n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    }
    // câmera suave
    const t = camTarget();
    const k = reduced() ? 1 : 1 - Math.exp(-dt * 8);
    cam.x += (t.x - cam.x) * k; cam.y += (t.y - cam.y) * k;
    updateRegionLight();
    updateParticles(dt);
  }
  let regionCheck = 0;
  function updateRegionLight() { regionCheck += 1; if (regionCheck % 20 === 0) updateRegion(); }

  /* ---------------- partículas e cenário animado ---------------- */
  function updateParticles(dt) {
    if (reduced() || map.interior) { particles.length = 0; return; }
    const vx = cam.x; const vy = cam.y;
    if (particles.length < 26 && Math.random() < dt * 6) {
      const x = vx + Math.random() * W; const y = vy + Math.random() * H;
      const tx = Math.floor(x / T); const ty = Math.floor(y / T); const id = tileAt(map, tx, ty);
      if (id === 5 && Math.random() < 0.5) particles.push({ k: 'ripple', x, y, t: 0, life: 1.4 });
      else if ((id === 1 || id === 7 || id === 4) && Math.random() < 0.25) particles.push({ k: 'butterfly', x, y, t: 0, life: 6, vx: (Math.random() - 0.5) * 18, col: ['#f2c94c', '#f08bb4', '#ffffff', '#9fd0f2'][Math.floor(Math.random() * 4)] });
      else if (y > 46 * T && Math.random() < 0.2) particles.push({ k: 'firefly', x, y, t: 0, life: 3 });
      else if ([0, 10].includes(id) && Math.random() < 0.08) particles.push({ k: 'leaf', x, y: y - 40, t: 0, life: 4, vx: 6 + Math.random() * 8 });
    }
    // fumaça das chaminés e respingos da cachoeira
    if (Math.random() < dt * 2) map.objects.forEach((o) => { if (o.opts?.chimney && Math.random() < 0.3) particles.push({ k: 'smoke', x: o.x + o.w - 17, y: o.y - 4, t: 0, life: 2.6 }); });
    if (Math.random() < dt * 8) particles.push({ k: 'spray', x: 77 * T + Math.random() * 32, y: 49 * T + Math.random() * 6, t: 0, life: 0.7, vy: -10 - Math.random() * 14, vx: (Math.random() - 0.5) * 16 });
    particles.forEach((p) => {
      p.t += dt;
      if (p.k === 'butterfly') { p.x += p.vx * dt + Math.sin(p.t * 3) * 0.3; p.y += Math.sin(p.t * 5) * 0.4 - dt * 2; }
      if (p.k === 'leaf') { p.x += p.vx * dt + Math.sin(p.t * 2) * 0.4; p.y += 9 * dt; }
      if (p.k === 'smoke') { p.y -= 9 * dt; p.x += Math.sin(p.t * 2) * 0.2; }
      if (p.k === 'spray') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 50 * dt; }
    });
    particles = particles.filter((p) => p.t < p.life);
  }
  function drawWaterAnim() {
    const x0 = Math.max(0, Math.floor(cam.x / T)); const y0 = Math.max(0, Math.floor(cam.y / T));
    const x1 = Math.min(map.w - 1, Math.floor((cam.x + W) / T)); const y1 = Math.min(map.h - 1, Math.floor((cam.y + H) / T));
    const ox = -camPx(cam.x); const oy = -camPx(cam.y);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const id = tileAt(map, tx, ty);
      if (id === 5) {
        const h = TL.hash(tx, ty, 9);
        const ph = (time * 0.6 + h) % 1;
        c.fillStyle = '#7fb6ea';
        const sx = tx * T + ox + Math.floor(((time * 6 + h * 16) % 20) - 4); const sy = ty * T + oy + 4 + Math.floor(h * 8);
        c.fillRect(Math.max(tx * T + ox, sx), sy, 4, 0.5);
        if (ph < 0.5) { c.fillStyle = '#d8f4ff'; c.fillRect(tx * T + ox + Math.floor(h * 12), ty * T + oy + 11, 2, 0.5); }
        // correnteza do rio
        if (ty >= 52 && ty <= 53 && tx >= 44) { c.fillStyle = '#b8ecff'; c.fillRect(tx * T + ox + ((Math.floor(-time * 22 + h * 16) % 16) + 16) % 16, ty * T + oy + 7, 3, 0.5); }
      } else if (id === 16) {
        for (let i = 0; i < T; i += 3) {
          const off = (time * 70 + TL.hash(tx * 16 + i, 3) * 16) % 16;
          c.fillStyle = '#ffffff'; c.fillRect(tx * T + ox + i, ty * T + oy + Math.floor(off), 1, 4);
          c.fillStyle = '#7fb6ea'; c.fillRect(tx * T + ox + i + 1, ty * T + oy + Math.floor((off + 8) % 16), 1, 3);
        }
        if (tileAt(map, tx, ty + 1) === 5) { const f = Math.floor(time * 6) % 2; c.fillStyle = '#ffffff'; c.fillRect(tx * T + ox, (ty + 1) * T + oy, T, 2 + f); c.fillRect(tx * T + ox + 2 + f * 3, (ty + 1) * T + oy + 3, 5, 2); }
      }
    }
  }
  function drawParticles() {
    const ox = -camPx(cam.x); const oy = -camPx(cam.y);
    particles.forEach((p) => {
      const x = Math.round(p.x + ox); const y = Math.round(p.y + oy);
      if (p.k === 'ripple') { const r = Math.floor(p.t * 4); c.fillStyle = `rgba(220,240,255,${0.7 - p.t / 2})`; c.fillRect(x - r, y, r * 2 + 1, 1); }
      if (p.k === 'butterfly') { const f = Math.floor(p.t * 10) % 2; c.fillStyle = p.col; c.fillRect(x - 1 - f, y, 1 + f, 2 - f); c.fillRect(x + 1, y, 1 + f, 2 - f); c.fillStyle = '#1a1622'; c.fillRect(x, y, 1, 2); }
      if (p.k === 'firefly') { if (Math.sin(p.t * 6) > 0) { c.fillStyle = '#fff6a8'; c.fillRect(x, y, 1, 1); c.fillStyle = 'rgba(255,240,140,.35)'; c.fillRect(x - 1, y - 1, 3, 3); } }
      if (p.k === 'leaf') { c.fillStyle = Math.floor(p.t * 4) % 2 ? '#5aa64c' : '#c99d64'; c.fillRect(x, y, 2, 1); }
      if (p.k === 'smoke') { const s = 2 + Math.floor(p.t * 2); c.fillStyle = `rgba(210,210,215,${0.55 - p.t / 5})`; c.fillRect(x - s / 2, y, s, s); }
      if (p.k === 'spray') { c.fillStyle = '#ffffff'; c.fillRect(x, y, 1, 1); }
    });
  }
  function drawObjectAnim(o, x, y) {
    if (o.anim === 'fountain') {
      const t = time; const cx = x + o.w / 2;
      for (let i = 0; i < 18; i++) {
        const ph = (t * 1.2 + i / 18) % 1; const ang = (i / 18) * Math.PI * 2;
        const px = cx + Math.cos(ang) * ph * 22; const py = y + 8 - Math.sin(ph * Math.PI) * 14 + ph * 24 + Math.sin(ang) * ph * 6;
        c.fillStyle = ph < 0.8 ? '#e6f6ff' : '#9fd8ff'; c.fillRect(Math.round(px), Math.round(py), 1, 2);
      }
      c.fillStyle = '#e6f6ff'; c.fillRect(Math.round(cx) - 1, y + 2 + (Math.floor(t * 8) % 2), 2, 6);
      const r = Math.floor((t * 10) % 18); c.fillStyle = 'rgba(230,246,255,.6)'; c.fillRect(Math.round(cx) - r, y + 42 + Math.floor(r / 5), r * 2, 1);
    }
    if (o.img === 'gruta' || o.img === 'treino') {
      const pts = o.img === 'gruta' ? [[46, 44], [113, 44]] : [];
      pts.forEach(([fx, fy], i) => { const a = 0.16 + (Math.floor(time * 9 + i * 3) % 3) * 0.05; c.fillStyle = `rgba(255,190,80,${a})`; c.fillRect(x + fx - 9, y + fy - 9, 19, 19); });
    }
    if (o.img === 'capela' || o.img === 'moinho') {
      const wf = o.img === 'capela' ? [26, 46, 18, 38] : [118, 14, 24, 30];
      for (let i = 0; i < 6; i++) { const off = (time * 60 + i * 13) % wf[3]; c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(x + wf[0] + ((i * 5) % wf[2]), y + wf[1] + Math.floor(off), 1, 3); }
    }
    if (o.type === 'poste') { const a = 0.18 + Math.sin(time * 3 + o.x) * 0.04; c.fillStyle = `rgba(255,229,138,${a})`; c.fillRect(x - 4, y - 3, o.w + 8, 13); }
    if (o.type === 'barraca' && Math.floor(time * 2 + o.x) % 6 === 0) { c.fillStyle = '#ffffff'; c.fillRect(x + 6, y + 2, 1, 1); }
  }

  /* ---------------- desenho ---------------- */
  const DIR_SPRITE = (dir) => (dir === 'left' || dir === 'right' ? 'side' : dir);
  function charSprite(look, dir, moving, walkT, extra = {}) {
    const frame = moving && !reduced() ? (Math.floor(walkT * 7) % 2 ? 1 : 2) : extra.gesture ? 3 : 0;
    const breath = !moving && !reduced() ? (extra.blink !== undefined && extra.blink < 0 ? 2 : Math.floor(time * 1.4 + (extra.seed || 0)) % 2) : 0;
    return PQSprites.charFrame(look, { dir: DIR_SPRITE(dir), flip: dir === 'left', frame, breath: DIR_SPRITE(dir) === 'down' ? breath : (breath === 2 ? 0 : breath), mood: extra.mood || 'neutral' });
  }
  function draw() {
    if (!c || !map) return;
    c.setTransform(scale, 0, 0, scale, 0, 0); c.imageSmoothingEnabled = false;
    c.fillStyle = map.interior ? '#120e16' : '#2f6b33'; c.fillRect(0, 0, W, H);
    const ox = -camPx(cam.x); const oy = -camPx(cam.y);
    // chão
    const cx0 = Math.max(0, Math.floor(cam.x / (CH * T))); const cy0 = Math.max(0, Math.floor(cam.y / (CH * T)));
    const cx1 = Math.floor((cam.x + W) / (CH * T)); const cy1 = Math.floor((cam.y + H) / (CH * T));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      if (cx * CH >= map.w || cy * CH >= map.h) continue;
      if (RES !== scale) { c.imageSmoothingEnabled = RES > scale; c.imageSmoothingQuality = 'high'; }
      c.drawImage(chunk(map, cx, cy), cx * CH * T + ox, cy * CH * T + oy, CH * T, CH * T);
      c.imageSmoothingEnabled = false;
    }
    if (!reduced()) drawWaterAnim();
    (map.ducks || []).forEach((d, i) => {
      const a = (reduced() ? 0 : time) * d.sp + d.ph * Math.PI * 2; const x = Math.round(d.cx + Math.cos(a) * d.rx) + ox; const y = Math.round(d.cy + Math.sin(a) * d.ry) + oy;
      const left = -Math.sin(a) < 0; const bob = Math.floor(time * 3 + i) % 2;
      c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x - 6, y + 4, 12, 1);
      c.fillStyle = '#1a1622'; c.fillRect(x - 5, y - 2 + bob, 10, 6); c.fillRect(left ? x - 6 : x + 2, y - 6 + bob, 5, 5);
      c.fillStyle = '#ffffff'; c.fillRect(x - 4, y - 1 + bob, 8, 4); c.fillRect(left ? x - 5 : x + 3, y - 5 + bob, 3, 4);
      c.fillStyle = '#f2a33a'; c.fillRect(left ? x - 7 : x + 6, y - 3 + bob, 2, 1);
      c.fillStyle = '#1a1622'; c.fillRect(left ? x - 4 : x + 4, y - 4 + bob, 1, 1);
    });
    // sombras das nuvens
    if (!map.interior && !reduced()) {
      c.fillStyle = 'rgba(20,40,30,.07)';
      for (let i = 0; i < 4; i++) { const x = ((time * 9 + i * 420) % (map.w * T + 300)) - 200 + ox; const y = (i * 260 + 120) % (map.h * T) + oy; TL.blob(c, 'rgba(20,40,30,.07)', Math.round(x), Math.round(y), 70, 26); }
    }
    // entidades ordenadas pela base (profundidade 3/4)
    const vis = [];
    const vx0 = cam.x - 340; const vy0 = cam.y - 200; const vx1 = cam.x + W + 20; const vy1 = cam.y + H + 200;
    for (const o of map.objects) { if (o.flat) continue; if (o.x + o.w < vx0 || o.x > vx1 || o.y + o.h < vy0 || o.y > vy1) continue; vis.push({ base: o.y + (o.base ?? (o.solid ? o.solid[1] + o.solid[3] : o.h)), o }); }
    for (const n of npcs) if (!n.hidden) vis.push({ base: n.y, n });
    vis.push({ base: player.y + 0.1, p: true });
    vis.sort((a, b) => a.base - b.base);
    const mission = missionTarget();
    for (const e of vis) {
      if (e.o) {
        const o = e.o;
        if (o.type === 'canoa') { const b = Math.round(Math.sin(time * 2) * 1); c.drawImage(TL.objectCanvas(o), o.x + ox, o.y + oy + b); continue; }
        const art = TL.objectCanvas(o, RES);
        if (art) {
          if (o.img) { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; }
          c.drawImage(art, o.x + ox, o.y + oy, o.w, o.h);
          if (o.img) c.imageSmoothingEnabled = false;
        }
        if (doorAnim && doorAnim.o === o && o.doorRect) {
          const [dx, dy, dw, dh] = o.doorRect; const open = Math.round(dw * doorAnim.t);
          c.fillStyle = '#120e16'; c.fillRect(o.x + ox + dx + Math.round((dw - open) / 2), o.y + oy + dy, open, dh);
          c.fillStyle = 'rgba(255,229,138,.35)'; c.fillRect(o.x + ox + dx + Math.round((dw - open) / 2), o.y + oy + dy + dh - 3, open, 3);
        }
        if (!reduced()) drawObjectAnim(o, o.x + ox, o.y + oy);
      } else if (e.n) {
        const n = e.n;
        const spr = charSprite(n.look, n.dir, n.moving, n.walkT, { gesture: n.gesture > 0, blink: n.blink, seed: n.x % 3, mood: n.def.mood });
        c.drawImage(spr, Math.round(n.x - 9) + ox, Math.round(n.y - 24) + oy);
        const mark = n.def.mission?.(ctxLite()) && !n.talking;
        if (mark) { const b = Math.floor(time * 3) % 2; c.fillStyle = '#1a1622'; c.fillRect(Math.round(n.x) + ox - 3, Math.round(n.y) + oy - 37 - b, 6, 10); c.fillStyle = '#ffe58a'; c.fillRect(Math.round(n.x) + ox - 2, Math.round(n.y) + oy - 36 - b, 4, 5); c.fillRect(Math.round(n.x) + ox - 2, Math.round(n.y) + oy - 30 - b, 4, 2); }
        if (near?.ref === n) { const nm = n.def.patient ? (PQ.caseOfDay(PQ.theme().id)?.patient.name || '') : n.def.name; const w = TL.textWidth(nm, true) + 6; const tx = Math.round(n.x - w / 2) + ox; const ty = Math.round(n.y) + oy - (mark ? 46 : 34); c.fillStyle = '#1a1622'; c.fillRect(tx - 1, ty - 1, w + 2, 9); c.fillStyle = '#f6ecd7'; c.fillRect(tx, ty, w, 7); TL.drawText(c, nm, tx + 3, ty + 1, '#2d3529', { small: true }); }
      } else {
        c.drawImage(charSprite(PQ.player().look, player.dir, player.moving, player.walkT), Math.round(player.x - 9) + ox, Math.round(player.y - 24) + oy);
      }
    }
    if (!reduced()) drawParticles();
    // luzes
    if (!map.interior && !reduced()) {
      c.globalCompositeOperation = 'lighter';
      for (const l of map.lights) { const a = 0.05 + Math.sin(time * 2.5 + l.x) * 0.015; const g = c.createRadialGradient(l.x + ox, l.y + oy, 1, l.x + ox, l.y + oy, l.r); g.addColorStop(0, `rgba(255,220,120,${a * 3})`); g.addColorStop(1, 'rgba(255,220,120,0)'); c.fillStyle = g; c.fillRect(l.x + ox - l.r, l.y + oy - l.r, l.r * 2, l.r * 2); }
      c.globalCompositeOperation = 'source-over';
    }
    // marcador da missão (seta sobre o alvo ou na borda da tela)
    if (mission && !PQ.dialogOpen()) {
      const mx = mission.x + ox; const my = mission.y + oy; const b = Math.floor(time * 3) % 2;
      if (mx > 6 && mx < W - 6 && my > 6 && my < H - 6) { if (!mission.npc && dist(player, mission.approach) > 40) drawArrow(Math.round(mx), Math.round(my) + b, 'down'); }
      else {
        const ex = Math.max(8, Math.min(W - 8, mx)); const ey = Math.max(8, Math.min(H - 8, my));
        drawArrow(Math.round(ex), Math.round(ey), Math.abs(mx - ex) > Math.abs(my - ey) ? (mx < ex ? 'left' : 'right') : (my < ey ? 'up' : 'down'));
      }
    }
    if (fade.a > 0) { c.fillStyle = `rgba(10,8,14,${fade.a})`; c.fillRect(0, 0, W, H); }
  }
  function drawArrow(x, y, dir) {
    const P = (dx, dy, w, h, col) => { c.fillStyle = col; c.fillRect(x + dx, y + dy, w, h); };
    const shape = { down: [[-4, -6, 9, 3], [-3, -3, 7, 2], [-2, -1, 5, 2], [-1, 1, 3, 2]], up: [[-1, -6, 3, 2], [-2, -4, 5, 2], [-3, -2, 7, 2], [-4, 0, 9, 3]], left: [[-6, -1, 2, 3], [-4, -2, 2, 5], [-2, -3, 2, 7], [0, -4, 3, 9]], right: [[4, -1, 2, 3], [2, -2, 2, 5], [0, -3, 2, 7], [-3, -4, 3, 9]] }[dir];
    shape.forEach(([dx, dy, w, h]) => P(dx - 1, dy - 1, w + 2, h + 2, '#1a1622'));
    shape.forEach(([dx, dy, w, h]) => P(dx, dy, w, h, '#ffe58a'));
  }
  let lite = null; let liteT = -1;
  function ctxLite() { if (liteT !== Math.floor(time * 2)) { liteT = Math.floor(time * 2); lite = { next: PQ.nextAction(), state }; } return lite; }

  /* ---------------- minimapa e mapa completo ---------------- */
  const TILE_COLOR = { 0: '#6cae4b', 1: '#74b452', 2: '#c99d64', 3: '#a69a7e', 4: '#c4b696', 5: '#3d7cc9', 6: '#e3cf98', 7: '#6b4a2f', 8: '#8a5a36', 9: '#57525f', 10: '#5a9a3e', 11: '#a7743f', 12: '#e8e4da', 13: '#efe3c4', 14: '#a8405e', 15: '#2f6b33', 16: '#bfe3f6', 17: '#3f8a3e', 18: '#6b6574', 19: '#4a3a48' };
  function miniBase(m) {
    if (m._mini) return m._mini;
    const cnv = document.createElement('canvas'); cnv.width = m.w * 2; cnv.height = m.h * 2;
    const g = cnv.getContext('2d');
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { g.fillStyle = TILE_COLOR[tileAt(m, x, y)] || '#000'; g.fillRect(x * 2, y * 2, 2, 2); }
    m.objects.forEach((o) => {
      if (o.img) { const art = TL.objectCanvas(o); if (art) { g.imageSmoothingEnabled = true; g.drawImage(art, o.x / 8, o.y / 8, o.w / 8, o.h / 8); g.imageSmoothingEnabled = false; } return; }
      if (!o.solid || o.flat) return;
      const big = o.w >= 90;
      g.fillStyle = big ? '#efe3c4' : o.type === 'arvore' || o.type === 'palmeira' ? '#2f6b33' : '#8a5a36';
      if (big) { g.fillRect(o.x / 8, (o.y + 18) / 8, o.w / 8, (o.h - 18) / 8); g.fillStyle = o.type === 'hospital' ? '#2f6f9a' : o.type === 'ubs' ? '#2f7d6b' : o.type === 'biblioteca' ? '#34508a' : '#c96a3a'; g.fillRect(o.x / 8, o.y / 8, o.w / 8, 3); }
      else g.fillRect((o.x + o.solid[0]) / 8, (o.y + o.solid[1] - 6) / 8, Math.max(2, o.solid[2] / 8), Math.max(2, (o.solid[3] + 6) / 8));
    });
    m._mini = cnv;
    return cnv;
  }
  function drawMinimap() {
    const mm = byId('vila-minimap'); if (!mm || !map) return;
    const g = mm.getContext('2d');
    const base = miniBase(map);
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#1a1622'; g.fillRect(0, 0, mm.width, mm.height);
    const s = Math.min(mm.width / base.width, mm.height / base.height);
    const w = base.width * s; const h = base.height * s; const x0 = (mm.width - w) / 2; const y0 = (mm.height - h) / 2;
    g.drawImage(base, x0, y0, w, h);
    const k = (s * 2) / T;
    g.strokeStyle = '#ffe58a'; g.lineWidth = 1; g.strokeRect(Math.round(x0 + cam.x * k) + 0.5, Math.round(y0 + cam.y * k) + 0.5, Math.round(W * k), Math.round(H * k));
    const mt = missionTarget();
    if (mt && Math.floor(time * 2) % 2) { g.fillStyle = '#ffe58a'; g.fillRect(x0 + mt.approach.x * k - 2, y0 + mt.approach.y * k - 2, 4, 4); }
    npcs.forEach((n) => { if (!n.hidden) { g.fillStyle = '#f6ecd7'; g.fillRect(x0 + n.x * k - 1, y0 + n.y * k - 1, 2, 2); } });
    g.fillStyle = '#1a1622'; g.fillRect(x0 + player.x * k - 3, y0 + player.y * k - 3, 6, 6);
    g.fillStyle = '#e85d4a'; g.fillRect(x0 + player.x * k - 2, y0 + player.y * k - 2, 4, 4);
    mm.dataset.map = map.id;
    mm._geo = { x0, y0, k };
  }
  function overlayOpen() { return !!(byId('world-map') && !byId('world-map').hidden) || !!(byId('world-menu') && !byId('world-menu').hidden); }
  function openMap() {
    closeMenu();
    const el = byId('world-map'); if (!el) return;
    el.hidden = false;
    const fm = byId('world-map-canvas');
    const vila = MAPS.vila; const base = miniBase(vila);
    fm.width = base.width * 2; fm.height = base.height * 2;
    const g = fm.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(base, 0, 0, fm.width, fm.height);
    const k = 4 / T;
    // névoa nas regiões não visitadas
    vila.regions.forEach((r) => {
      if (state.world.visited[r.id]) return;
      g.fillStyle = 'rgba(16,14,22,.9)'; g.fillRect(r.rect[0] * 4, r.rect[1] * 4, r.rect[2] * 4, r.rect[3] * 4);
      g.fillStyle = '#9a9aa8'; TL.drawText(g, '???', r.rect[0] * 4 + (r.rect[2] * 4) / 2 - 8, r.rect[1] * 4 + (r.rect[3] * 4) / 2 - 3, '#9a9aa8', { small: false });
    });
    // nomes dos lugares visitados
    const placed = [];
    vila.doors.forEach((d) => {
      const reg = vila.regions.find((r) => d.x / T >= r.rect[0] && d.x / T < r.rect[0] + r.rect[2] && d.y / T >= r.rect[1] && d.y / T < r.rect[1] + r.rect[3]);
      if (!reg || !state.world.visited[reg.id] || /^Casa \d/.test(d.label)) return;
      const lbl = d.label.replace('Hospital Comunitário Antonella', 'Hospital Antonella').replace('Casa do Idoso Viver Bem', 'Casa do Idoso').replace('Quitanda da Dona Rita', 'Quitanda').replace('Farmácia da Vila', 'Farmácia');
      const w = TL.textWidth(lbl, true) + 4; const x = Math.round(d.x * k - w / 2); let y = Math.round(d.y * k - 16);
      while (placed.some((r) => x < r[0] + r[2] + 2 && x + w + 2 > r[0] && y < r[1] + 11 && y + 11 > r[1])) y -= 11;
      placed.push([x, y, w]);
      g.fillStyle = '#1a1622'; g.fillRect(x - 1, y - 1, w + 2, 9); g.fillStyle = '#f6ecd7'; g.fillRect(x, y, w, 7); TL.drawText(g, lbl, x + 2, y + 1, '#2d3529', { small: true });
    });
    const mt = map.id === 'vila' ? missionTarget() : null;
    if (mt) { g.fillStyle = '#1a1622'; g.fillRect(mt.approach.x * k - 4, mt.approach.y * k - 4, 8, 8); g.fillStyle = '#ffe58a'; g.fillRect(mt.approach.x * k - 3, mt.approach.y * k - 3, 6, 6); }
    const pp = map.id === 'vila' ? player : state.world.ret || player;
    g.fillStyle = '#1a1622'; g.fillRect(pp.x * k - 4, pp.y * k - 4, 8, 8); g.fillStyle = '#e85d4a'; g.fillRect(pp.x * k - 3, pp.y * k - 3, 6, 6);
    const seen = vila.regions.filter((r) => state.world.visited[r.id]).length;
    byId('world-map-legend').innerHTML = `<span><i class="lg you"></i> Você</span><span><i class="lg goal"></i> Missão: ${esc(PQ.nextAction().label)}</span><span>${seen}/${vila.regions.length} regiões descobertas</span>`;
    byId('world-map-close').focus({ preventScroll: true });
    PQ.play('select');
  }
  function closeMap() { const el = byId('world-map'); if (el && !el.hidden) { el.hidden = true; PQ.play('cancel'); scene.focus({ preventScroll: true }); } }
  function openMenu() {
    closeMap();
    const el = byId('world-menu'); if (!el) return;
    el.hidden = false;
    const a = state.audio;
    el.querySelector(`[name="zoom"][value="${state.world.zoom}"]`).checked = true;
    byId('opt-sound').checked = state.sound;
    byId('opt-music').value = Math.round(a.music * 100); byId('opt-sfx').value = Math.round(a.sfx * 100); byId('opt-amb').value = Math.round(a.amb * 100);
    el.querySelector('[data-menu="close"]').focus({ preventScroll: true });
    PQ.play('select');
  }
  function closeMenu() { const el = byId('world-menu'); if (el && !el.hidden) { el.hidden = true; PQ.play('cancel'); scene.focus({ preventScroll: true }); } }

  /* ---------------- HUD ---------------- */
  function renderHudStatic() {
    const q = byId('hud-quest-text'); if (q) { q.textContent = PQ.nextAction().text; q.closest('.hud-quest').title = `${PQ.nextAction().text} (toque para ser guiado)`; }
    const snd = byId('hud-sound');
    if (snd) { snd.hidden = state.sound; }
  }
  PQ.onSoundChange = () => { renderHudStatic(); if (state.sound && map && state.view === 'vila') { window.PQAudio?.music(currentRegion().music); ambientFor(); } };

  /* ---------------- laço ---------------- */
  function loop(t) {
    if (!running) return;
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016); last = t;
    update(dt);
    draw();
    updateNear();
    if (Math.floor(t / 120) !== Math.floor((t - dt * 1000) / 120)) drawMinimap();
    raf = requestAnimationFrame(loop);
  }
  function syncUpgrades() {
    const u = MAPS.vila.objects.find((o) => o.id === 'ubs');
    const opts = { reform: !!state.purchases.fachada, flowers: !!state.purchases.floreiras };
    if (u && JSON.stringify(u.opts || {}) !== JSON.stringify(opts)) { u.opts = opts; MAPS.vila._mini = null; }
  }
  let spritesAsked = false;
  function start() {
    scene = byId('vila-scene'); cv = byId('world-canvas'); c = cv.getContext('2d');
    if (!spritesAsked) {
      spritesAsked = true;
      TL.onSprite(() => { Object.values(MAPS).forEach((m) => { m._mini = null; }); });
      TL.loadSprites(window.PLANTAO_MAPAS_UTIL.SPRITES);
    }
    syncUpgrades();
    if (!map || map.id !== state.world.map) {
      const w = state.world;
      loadMap(w.map, Number.isFinite(w.x) && Number.isFinite(w.y) ? { x: w.x, y: w.y, dir: w.dir } : null);
    } else { npcs.forEach((n) => { n.hidden = npcHidden(n.def); n.look = n.def.patient ? PQ.caseOfDay(PQ.theme().id)?.look : n.def.look; }); renderHudStatic(); updateRegion(true); }
    resize();
    busy = false; fade.a = 0; fade.to = 0; fade.cb = null; doorAnim = null;
    if (!running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
    draw(); drawMinimap();
  }
  function stop() {
    running = false; cancelAnimationFrame(raf); held.clear(); pad.clear(); path = null; pathCb = null;
    byId('world-map') && (byId('world-map').hidden = true); byId('world-menu') && (byId('world-menu').hidden = true);
    if (map) persist(true);
  }

  /* ---------------- teclado, toque e mouse ---------------- */
  function onKey(e, down) {
    const key = (e.key || '').toLowerCase();
    if (overlayOpen()) {
      if (down && (key === 'escape' || (key === 'm' && !byId('world-map').hidden))) { closeMap(); closeMenu(); return true; }
      return false;
    }
    if (down && key === 'escape') { openMenu(); return true; }
    if (down && key === 'm' && !e.repeat) { openMap(); return true; }
    if (down && key === 'e' && !e.repeat) {
      if (!interact()) guideTo();
      return true;
    }
    if (!DIRS[key] || ['up', 'down', 'left', 'right'].includes(key)) return false;
    if (key.startsWith('arrow')) { const a = document.activeElement; if (a && a !== document.body && !scene.contains(a)) return false; }
    if (down) held.add(key); else held.delete(key);
    return true;
  }
  function bind() {
    scene = byId('vila-scene'); cv = byId('world-canvas');
    new ResizeObserver(() => { if (running) { resize(); draw(); } }).observe(scene);
    cv.addEventListener('click', (e) => {
      if (busy || PQ.dialogOpen()) return;
      scene.focus({ preventScroll: true });
      const r = cv.getBoundingClientRect();
      const wx = ((e.clientX - r.left) / r.width) * W + camPx(cam.x);
      const wy = ((e.clientY - r.top) / r.height) * H + camPx(cam.y);
      // clicou num NPC?
      const n = npcs.find((x) => !x.hidden && Math.abs(x.x - wx) < 10 && wy > x.y - 26 && wy < x.y + 2);
      if (n) { if (dist(player, n) <= (n.def.reach || 28)) talk(n); else walkTo(n.x, n.y + 14, () => { if (dist(player, n) <= (n.def.reach || 28) + 6) talk(n); }, n); return; }
      // clicou num prédio com porta ou objeto interativo?
      const o = map.objects.find((x) => !x.flat && (x.interact || map.doors.some((d) => d.building === x.id)) && wx >= x.x && wx <= x.x + x.w && wy >= x.y && wy <= x.y + x.h);
      if (o) {
        const d = map.doors.find((x) => x.building === o.id);
        if (d) { walkTo(d.x, d.y, () => { if (Math.abs(player.x - d.x) < 16 && Math.abs(player.y - d.y) < 16) enterDoor(d); }); return; }
        const base = o.y + (o.solid ? o.solid[1] + o.solid[3] : o.h);
        walkTo(o.x + o.w / 2, base + 8, () => { const k = candidates().find((x) => x.ref === o); if (k) interact(k); });
        return;
      }
      const ex = map.doors.find((d) => d.exit && wx >= d.rect[0] && wx <= d.rect[0] + d.rect[2] && wy >= d.rect[1] - 4);
      if (ex) { walkTo(ex.x, ex.y - 2, () => exitInterior()); return; }
      walkTo(wx, wy);
    });
    byId('vila-minimap').addEventListener('click', (e) => {
      e.stopPropagation();
      const mm = byId('vila-minimap'); const g = mm._geo; if (!g) return;
      const r = mm.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * mm.width; const py = ((e.clientY - r.top) / r.height) * mm.height;
      walkTo((px - g.x0) / g.k, (py - g.y0) / g.k);
    });
    // toque: direcional virtual (segura para andar)
    const padEl = byId('touch-pad');
    padEl.querySelectorAll('[data-pad]').forEach((b) => {
      const dir = b.dataset.pad;
      const on = (ev) => { ev.preventDefault(); pad.add(dir); b.classList.add('on'); };
      const off = () => { pad.delete(dir); b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
      b.addEventListener('contextmenu', (ev) => ev.preventDefault());
    });
    byId('pad-act').addEventListener('click', (e) => { e.stopPropagation(); if (PQ.dialogOpen()) { PQ.dialogKey({ key: 'Enter' }); return; } if (!interact()) guideTo(); });
    scene.addEventListener('click', (e) => {
      const h = e.target.closest('[data-hud]');
      if (h) {
        e.stopPropagation();
        const a = h.dataset.hud;
        if (a === 'map') openMap();
        if (a === 'menu') openMenu();
        if (a === 'inventory') PQ.showJournal?.('cesto');
        if (a === 'sound') { byId('sound').click(); }
        if (a === 'quest') guideTo();
        return;
      }
      if (e.target.closest('#world-map-close')) { closeMap(); return; }
      const mc = e.target.closest('[data-menu]');
      if (mc) {
        const a = mc.dataset.menu;
        if (a === 'close') closeMenu();
        if (a === 'map') openMap();
        if (a === 'journal') { closeMenu(); PQ.showJournal?.(); }
        if (a === 'theme') { closeMenu(); PQ.openThemeDialog?.(); }
      }
    });
    byId('world-map-canvas').addEventListener('click', (e) => {
      if (map.id !== 'vila') return;
      const fm = byId('world-map-canvas'); const r = fm.getBoundingClientRect();
      const wx = ((e.clientX - r.left) / r.width) * MAPS.vila.w * T; const wy = ((e.clientY - r.top) / r.height) * MAPS.vila.h * T;
      const reg = MAPS.vila.regions.find((rg) => wx / T >= rg.rect[0] && wx / T < rg.rect[0] + rg.rect[2] && wy / T >= rg.rect[1] && wy / T < rg.rect[1] + rg.rect[3]);
      if (reg && !state.world.visited[reg.id]) { PQ.toast('Região ainda não descoberta. Vá até lá a pé para revelar o mapa.'); return; }
      closeMap(); walkTo(wx, wy);
    });
    const menu = byId('world-menu');
    menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); } });
    byId('world-map').addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key.toLowerCase() === 'm') { e.preventDefault(); e.stopPropagation(); closeMap(); } });
    menu.addEventListener('change', (e) => {
      const t = e.target;
      if (t.name === 'zoom') { state.world.zoom = t.value; resize(); draw(); PQ.save(); PQ.play('select'); }
      if (t.id === 'opt-sound') { if (state.sound !== t.checked) byId('sound').click(); }
    });
    menu.addEventListener('input', (e) => {
      const t = e.target; const v = Number(t.value) / 100;
      if (t.id === 'opt-music') state.audio.music = v;
      if (t.id === 'opt-sfx') { state.audio.sfx = v; }
      if (t.id === 'opt-amb') state.audio.amb = v;
      if (['opt-music', 'opt-sfx', 'opt-amb'].includes(t.id)) { window.PQAudio?.apply(); PQ.save(); }
    });
    menu.addEventListener('change', (e) => { if (e.target.id === 'opt-sfx') PQ.play('confirm'); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { held.clear(); pad.clear(); } });
  }

  PQ.Mundo = {
    start, stop, bind, onKey, talkTo, enterBuilding, walkTo, guideTo, openMap, closeMap, openMenu, closeMenu, interact,
    get map() { return map; }, get player() { return player; }, get cam() { return cam; }, get scale() { return scale; }, get view() { return { W, H }; },
    get near() { return near; }, get npcs() { return npcs; }, get busy() { return busy; }, get region() { return regionId; },
    blocked: (x, y) => blockedRect(map, footRect(x, y)),
    teleport(mapId, x, y) { loadMap(mapId, { x, y, dir: 'down' }); snapCamera(); },
    findPath: (x, y) => findPath(map, player.x, player.y, x, y),
    // retrato do mapa inteiro em escala 1 (usado nos testes e na documentação)
    snapshot(k = 2) {
      const keep = { W, H, cv, c, cx: cam.x, cy: cam.y, scale };
      const off = document.createElement('canvas'); off.width = map.w * T * k; off.height = map.h * T * k;
      cv = off; c = off.getContext('2d'); W = map.w * T; H = map.h * T; cam.x = 0; cam.y = 0; scale = k;
      draw();
      ({ W, H, cv, c, scale } = keep); cam.x = keep.cx; cam.y = keep.cy;
      return off.toDataURL('image/png');
    },
  };
})();
