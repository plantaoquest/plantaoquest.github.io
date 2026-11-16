/*
 * Plantão Quest — personagens em pixel art 16 bits, montados em camadas.
 * Corpo: 16 × 24 (tela de 18 × 26 com 1 px de contorno). Retrato: 32 × 32 (tela de 34 × 34).
 * Aparência (look): { skin, hairStyle, hairColor, eyes, outfit, outfitColor, inner, pants, acc: [] }
 */
(function sprites() {
  'use strict';

  const OUTLINE = '#1a1622';
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('')}`;
  }

  const SKINS = ['#f3d2b3', '#e5b48c', '#c98e63', '#a8714a', '#8a5636', '#5e3a26'];
  const HAIR_COLORS = ['#1d1a18', '#3b2a20', '#6a4428', '#b5733a', '#e0bf72', '#c94f3d', '#d9d9d9', '#4f7fc0', '#8e5bb9'];
  const EYES = ['#2b1d14', '#3a6ea8', '#3f8a3e', '#7a5a2a'];
  const HAIR_STYLES = [
    ['curto', 'Curto'], ['longo', 'Longo'], ['cacheado', 'Cacheado'], ['coque', 'Coque'], ['raspado', 'Raspado'], ['trancas', 'Tranças'], ['moicano', 'Topete'],
  ];
  const OUTFITS = [['jaleco', 'Jaleco'], ['scrub', 'Pijama cirúrgico'], ['camiseta', 'Camiseta'], ['avental', 'Avental'], ['colete', 'Colete']];
  const OUTFIT_COLORS = ['#3f8a6a', '#3a6ea8', '#7a2e3a', '#2a2a33', '#d36a8a', '#e9b949', '#8e5bb9', '#c96a3a'];
  const ACCESSORIES = [['estetoscopio', 'Estetoscópio'], ['oculos', 'Óculos'], ['touca', 'Touca'], ['cracha', 'Crachá'], ['mascara', 'Máscara'], ['bone', 'Boné'], ['chapeu', 'Chapéu de palha'], ['brinco', 'Brincos']];

  function withOutline(target, draw, w, h, shadow) {
    const buf = document.createElement('canvas');
    buf.width = w; buf.height = h;
    const b = buf.getContext('2d');
    draw(b);
    const img = b.getImageData(0, 0, w, h);
    const d = img.data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
    const out = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) out.push([x, y]);
    }
    b.fillStyle = OUTLINE;
    out.forEach(([x, y]) => b.fillRect(x, y, 1, 1));
    const c = target.getContext('2d');
    c.clearRect(0, 0, target.width, target.height);
    if (shadow) { c.fillStyle = '#10141066'; c.fillRect(shadow[0], shadow[1], shadow[2], 2); c.fillRect(shadow[0] + 1, shadow[1] - 1, shadow[2] - 2, 1); }
    c.drawImage(buf, 0, 0);
  }

  /* ---------------- corpo inteiro ---------------- */
  // opts: frame 0 parado, 1/2 passos, 3 gesto (aceno) · dir 'down' | 'up' | 'side' (lado = direita; flip vira para a esquerda) · breath 0/1
  function drawChar(canvas, look, opts = {}) {
    if (!canvas || !look) return;
    const { frame = 0, flip = false, mood = 'neutral', item, dir = 'down', breath = 0 } = opts;
    const L = { skin: SKINS[2], hairStyle: 'curto', hairColor: HAIR_COLORS[0], eyes: EYES[0], outfit: 'camiseta', outfitColor: '#3a6ea8', inner: '#7fb6ea', pants: '#3a3f4a', acc: [], ...look };
    const acc = new Set(L.acc || []);
    const skin = mood === 'sick' ? shade(L.skin, 0.18) : L.skin;
    const skinD = shade(skin, -0.2);
    const hair = L.hairColor; const hairD = shade(hair, -0.3); const hairL = shade(hair, 0.25);
    const by = breath && (frame === 0 || frame === 3) ? 1 : 0;
    withOutline(canvas, (c) => {
      c.save();
      if (flip) { c.translate(18, 0); c.scale(-1, 1); }
      c.translate(1, 1);
      const p = (color, x, y, w = 1, h = 1) => { c.fillStyle = color; c.fillRect(x, y < 18 ? y + by : y, w, h); };
      const pants = L.outfit === 'scrub' ? shade(L.outfitColor, -0.1) : L.pants;
      const body = L.outfit === 'jaleco' ? '#f1efe6' : L.outfitColor;
      const bodyD = shade(body, -0.18);
      const hs = L.hairStyle;
      if (dir === 'side') {
        // pernas de perfil (passo para frente e para trás)
        if (frame === 1 || frame === 2) {
          const f = frame === 1 ? 1 : -1;
          p(shade(pants, -0.25), 7 - 2 * f, 18, 3, 3); p('#2a2420', 7 - 2 * f, 21, 3, 1);
          p(pants, 7 + f, 18, 3, 4); p('#2a2420', 7 + f, 22, 4, 1);
        } else { p(pants, 6, 18, 4, 4); p(shade(pants, -0.25), 6, 18, 1, 4); p('#2a2420', 6, 22, 5, 1); }
        p(body, 5, 11, 6, 7); p(bodyD, 5, 11, 1, 7); p(bodyD, 5, 17, 6, 1);
        if (L.outfit === 'jaleco') { p(L.outfitColor, 9, 11, 2, 6); p('#f1efe6', 5, 18, 5, 1); }
        if (L.outfit === 'avental') { p('#f1e4c8', 9, 12, 2, 6); }
        if (L.outfit === 'colete') { p(L.inner, 9, 11, 2, 7); }
        p(skinD, 7, 10, 3, 1);
        p(skin, 5, 2, 7, 8); p(skin, 12, 5, 1, 2); p(skinD, 5, 9, 7, 1);
        p(L.eyes, 10, 6, 1, 2); p('#ffffff', 10, 6, 1, 1);
        if (mood === 'happy') p('#8a3a3a', 10, 8, 2, 1); else p('#8a4a3a', 11, 8, 1, 1);
        p(skinD, 7, 5, 1, 2);
        if (hs === 'raspado') { c.globalAlpha = 0.85; p(hair, 5, 2, 7, 2); p(hair, 5, 4, 2, 2); c.globalAlpha = 1; }
        else if (hs === 'moicano') { p(hair, 6, 0, 5, 3); p(hairL, 8, 0, 2, 1); p(hairD, 5, 2, 2, 3); }
        else if (hs === 'cacheado') { p(hair, 3, 0, 10, 4); p(hair, 2, 2, 6, 9); p(hairL, 4, 1, 1, 1); p(hairL, 3, 6, 1, 1); p(hairD, 2, 9, 3, 2); p(hair, 8, 3, 4, 1); }
        else {
          p(hair, 5, 1, 7, 2); p(hair, 4, 2, 4, 5); p(hair, 8, 3, 4, 1); p(hairL, 6, 1, 3, 1); p(hairD, 4, 6, 2, 1);
          if (hs === 'longo') { p(hair, 3, 3, 4, 10); p(hairD, 3, 10, 2, 3); }
          if (hs === 'coque') { p(hair, 2, 1, 3, 3); p(hairL, 2, 1, 1, 1); }
          if (hs === 'trancas') { for (let i = 0; i < 5; i++) p(i % 2 ? hairD : hair, 3, 6 + i * 2, 2, 2); p('#e8455a', 3, 16, 2, 1); }
        }
        if (acc.has('touca')) { p(L.outfitColor, 4, 0, 8, 4); p(shade(L.outfitColor, 0.3), 6, 1, 1, 1); }
        if (acc.has('bone')) { p('#c94f3d', 4, 0, 8, 3); p('#a23a2c', 10, 3, 5, 1); }
        if (acc.has('chapeu')) { p('#d9b26a', 1, 2, 14, 1); p('#c99d50', 4, -1, 8, 3); p('#8a5a36', 4, 1, 8, 1); }
        if (acc.has('oculos')) { p('#1b1b24', 8, 5, 4, 1); p('#bfe3f6', 10, 6, 2, 1); p(L.eyes, 10, 6, 1, 1); }
        if (acc.has('mascara')) { p('#bfe3f6', 9, 7, 4, 3); p('#d9eef8', 7, 7, 2, 1); }
        if (acc.has('brinco')) p('#f2c94c', 7, 8, 1, 1);
        if (acc.has('barba')) { p(hair, 7, 7, 1, 3); p(hair, 8, 9, 4, 1); p(hair, 9, 8, 3, 1); }
        if (acc.has('estetoscopio')) { p('#3a3f4a', 9, 11, 1, 3); p('#cfd8dc', 9, 14, 2, 1); }
        if (acc.has('cracha')) { p('#ffffff', 9, 13, 2, 2); p('#3a6ea8', 9, 14, 2, 1); }
        // braço da frente (balança ao andar; no gesto aponta para frente)
        if (frame === 3) { p(body, 8, 11, 6, 2); p(skin, 14, 11, 2, 2); }
        else { const s = frame === 1 ? 1 : frame === 2 ? -1 : 0; p(body, 7 + s, 11, 2, 5); p(bodyD, 7 + s, 15, 2, 1); p(skin, 7 + s, 16, 2, 1); }
        if (item === 'sword') { p('#cfd8dc', 12, 6, 1, 9); p('#8d6e63', 11, 14, 3, 1); }
        if (item === 'rod') { p('#8d6e63', 12, 0, 1, 16); }
        if (item === 'can') { p('#5b8fb9', 9, 14, 3, 3); }
        c.restore();
        return;
      }
      const legL = frame === 1 ? 3 : 4; const legR = frame === 2 ? 3 : 4;
      p(pants, 5, 18, 3, legL); p(shade(pants, -0.25), 5, 18, 1, legL);
      p(pants, 8, 18, 3, legR); p(shade(pants, -0.25), 10, 18, 1, legR);
      p('#2a2420', 5, 18 + legL, 3, 1); p('#2a2420', 8, 18 + legR, 3, 1);
      const armY = (side) => (frame === 0 || frame === 3 ? 0 : (frame === 1) === (side === 'L') ? 1 : -1);
      p(body, 4, 11, 8, 7); p(bodyD, 11, 11, 1, 7); p(bodyD, 4, 17, 8, 1);
      p(body, 2, 11 + armY('L'), 2, 5); p(bodyD, 2, 11 + armY('L'), 1, 5);
      p(skin, 2, 16 + armY('L'), 2, 1);
      if (frame === 3) { p(body, 12, 7, 2, 5); p(skin, 12, 5, 2, 2); }
      else { p(body, 12, 11 + armY('R'), 2, 5); p(bodyD, 13, 11 + armY('R'), 1, 5); p(skin, 12, 16 + armY('R'), 2, 1); }
      if (dir === 'up') {
        // costas: sem rosto, cabelo cobre a cabeça
        if (L.outfit === 'jaleco') { p('#e3dfd2', 7, 11, 2, 7); p('#f1efe6', 4, 18, 1, 2); p('#f1efe6', 11, 18, 1, 2); }
        if (L.outfit === 'avental') { p(L.inner, 4, 11, 8, 7); p('#f1e4c8', 7, 14, 2, 1); p('#f1e4c8', 6, 15, 4, 1); }
        if (L.outfit === 'colete') { p(L.outfitColor, 4, 11, 8, 7); p('#e9e2c8', 4, 14, 8, 1); }
        p(skinD, 7, 10, 2, 1);
        p(skin, 4, 2, 8, 8); p(skin, 3, 5, 1, 2); p(skin, 12, 5, 1, 2);
        if (hs === 'raspado') { c.globalAlpha = 0.85; p(hair, 4, 2, 8, 7); c.globalAlpha = 1; }
        else if (hs === 'moicano') { p(hairD, 4, 2, 8, 6); p(hair, 6, 0, 4, 8); p(hairL, 7, 0, 2, 2); }
        else if (hs === 'cacheado') { p(hair, 3, 0, 10, 4); p(hair, 2, 2, 12, 9); p(hairL, 4, 1, 1, 1); p(hairL, 9, 3, 1, 1); p(hairL, 5, 6, 1, 1); p(hairD, 2, 9, 12, 2); }
        else {
          p(hair, 4, 1, 8, 8); p(hair, 3, 2, 10, 5); p(hairL, 5, 1, 4, 1); p(hairD, 4, 8, 8, 1);
          if (hs === 'longo') { p(hair, 3, 4, 10, 9); p(hairD, 3, 11, 10, 2); p(hairL, 6, 5, 1, 4); }
          if (hs === 'coque') { p(hair, 6, -1, 4, 3); p(hairL, 7, -1, 1, 1); p(hairD, 6, 1, 4, 1); }
          if (hs === 'trancas') { for (let i = 0; i < 5; i++) { p(i % 2 ? hairD : hair, 4, 8 + i * 2, 2, 2); p(i % 2 ? hairD : hair, 10, 8 + i * 2, 2, 2); } p('#e8455a', 4, 18, 2, 1); p('#e8455a', 10, 18, 2, 1); }
        }
        if (acc.has('touca')) { p(L.outfitColor, 3, 0, 10, 5); p(shade(L.outfitColor, 0.3), 5, 2, 1, 1); p(shade(L.outfitColor, 0.3), 9, 1, 1, 1); }
        if (acc.has('bone')) { p('#c94f3d', 3, 0, 10, 4); p('#a23a2c', 6, 4, 4, 1); }
        if (acc.has('chapeu')) { p('#d9b26a', 0, 3, 16, 1); p('#c99d50', 3, -1, 10, 4); p('#8a5a36', 3, 2, 10, 1); }
        if (acc.has('mascara')) { p('#d9eef8', 3, 7, 1, 1); p('#d9eef8', 12, 7, 1, 1); }
        if (item === 'sword') { p('#cfd8dc', 1, 6, 1, 9); }
        c.restore();
        return;
      }
      if (L.outfit === 'jaleco') {
        p(L.outfitColor, 7, 11, 2, 7); p(shade(L.outfitColor, -0.2), 7, 11, 1, 7);
        p('#cfcabb', 6, 11, 1, 3); p('#cfcabb', 9, 11, 1, 3);
        p('#d9d4c6', 5, 15, 2, 1); p('#d9d4c6', 9, 15, 2, 1);
        p('#f1efe6', 4, 18, 1, 2); p('#f1efe6', 11, 18, 1, 2);
      } else if (L.outfit === 'scrub') {
        p(skinD, 7, 11, 2, 1); p(skinD, 7, 12, 1, 1); p(bodyD, 9, 13, 2, 2);
      } else if (L.outfit === 'camiseta') {
        p(bodyD, 6, 11, 4, 1); p(shade(body, 0.15), 5, 12, 2, 1);
      } else if (L.outfit === 'avental') {
        p(L.inner, 4, 11, 8, 2); p('#f1e4c8', 5, 12, 6, 6); p('#d9c9a6', 5, 12, 6, 1); p('#d9c9a6', 7, 15, 2, 1);
      } else if (L.outfit === 'colete') {
        p(L.inner, 6, 11, 4, 7); p(L.outfitColor, 4, 11, 2, 7); p(L.outfitColor, 10, 11, 2, 7); p('#e9e2c8', 5, 14, 1, 1);
      }
      // pescoço e cabeça
      p(skinD, 7, 10, 2, 1);
      p(skin, 4, 2, 8, 8); p(skinD, 11, 3, 1, 7); p(skinD, 4, 9, 8, 1);
      p(skin, 3, 5, 1, 2); p(skin, 12, 5, 1, 2);
      // olhos e boca (piscar no quadro de respiração)
      const eye = L.eyes;
      if (breath === 2) { p(skinD, 6, 7, 1, 1); p(skinD, 9, 7, 1, 1); }
      else { p(eye, 6, 6, 1, 2); p(eye, 9, 6, 1, 2); p('#ffffff', 6, 6, 1, 1); p('#ffffff', 9, 6, 1, 1); }
      if (mood === 'happy') { p('#8a3a3a', 6, 8, 4, 1); p('#e88a8a', 4, 7, 1, 1); p('#e88a8a', 11, 7, 1, 1); }
      else if (mood === 'sad' || mood === 'sick') { p('#6a3a3a', 7, 9, 2, 1); p('#6a3a3a', 6, 8, 1, 1); }
      else p('#8a4a3a', 7, 8, 2, 1);
      if (mood === 'sick') { p('#9fd0f2', 12, 3, 1, 2); }
      // cabelo
      if (hs === 'raspado') { c.globalAlpha = 0.85; p(hair, 4, 2, 8, 2); p(hair, 3, 3, 1, 2); p(hair, 12, 3, 1, 2); c.globalAlpha = 1; }
      else if (hs === 'moicano') { p(hair, 6, 0, 4, 4); p(hairL, 7, 0, 2, 1); p(hairD, 4, 2, 2, 2); p(hairD, 10, 2, 2, 2); }
      else if (hs === 'cacheado') {
        p(hair, 3, 0, 10, 4); p(hair, 2, 2, 12, 3); p(hair, 2, 5, 2, 6); p(hair, 12, 5, 2, 6);
        p(hairL, 4, 0, 1, 1); p(hairL, 7, 1, 1, 1); p(hairL, 10, 0, 1, 1); p(hairL, 3, 6, 1, 1); p(hairL, 12, 8, 1, 1);
        p(hairD, 2, 9, 2, 2); p(hairD, 12, 9, 2, 2); p(hair, 4, 4, 3, 1);
      } else {
        p(hair, 4, 1, 8, 3); p(hair, 3, 2, 10, 2); p(hair, 3, 4, 1, 3); p(hair, 12, 4, 1, 2);
        p(hair, 4, 4, 4, 1); p(hairL, 5, 1, 3, 1); p(hairD, 11, 2, 1, 2);
        if (hs === 'longo') { p(hair, 2, 4, 2, 9); p(hair, 12, 4, 2, 9); p(hairD, 2, 10, 1, 3); p(hairD, 13, 10, 1, 3); }
        if (hs === 'coque') { p(hair, 6, -1, 4, 2); p(hairL, 7, -1, 1, 1); p(hairD, 6, 0, 4, 1); }
        if (hs === 'trancas') { for (let i = 0; i < 5; i++) { p(i % 2 ? hairD : hair, 2, 5 + i * 2, 2, 2); p(i % 2 ? hairD : hair, 12, 5 + i * 2, 2, 2); } p('#e8455a', 2, 15, 2, 1); p('#e8455a', 12, 15, 2, 1); }
      }
      // acessórios
      if (acc.has('touca')) { p(L.outfitColor, 3, 0, 10, 4); p(shade(L.outfitColor, 0.3), 4, 1, 1, 1); p(shade(L.outfitColor, 0.3), 8, 2, 1, 1); p(shade(L.outfitColor, 0.3), 11, 1, 1, 1); }
      if (acc.has('bone')) { p('#c94f3d', 3, 0, 10, 3); p('#a23a2c', 0, 3, 7, 1); p('#ffffff', 7, 1, 2, 1); }
      if (acc.has('chapeu')) { p('#d9b26a', 0, 2, 16, 1); p('#c99d50', 3, -1, 10, 3); p('#8a5a36', 3, 1, 10, 1); }
      if (acc.has('oculos')) { p('#1b1b24', 5, 5, 6, 1); p('#bfe3f6', 5, 6, 2, 1); p('#bfe3f6', 9, 6, 2, 1); p(eye, 6, 6, 1, 1); p(eye, 9, 6, 1, 1); }
      if (acc.has('mascara')) { p('#bfe3f6', 5, 7, 6, 3); p('#9fc7e0', 5, 9, 6, 1); p('#d9eef8', 3, 7, 2, 1); p('#d9eef8', 11, 7, 2, 1); }
      if (acc.has('brinco')) { p('#f2c94c', 3, 7, 1, 1); p('#f2c94c', 12, 7, 1, 1); }
      if (acc.has('barba')) { p(hair, 4, 7, 1, 3); p(hair, 11, 7, 1, 3); p(hair, 5, 9, 6, 1); p(hair, 6, 10, 4, 1); p(hair, 6, 7, 1, 1); p(hair, 9, 7, 1, 1); }
      if (acc.has('estetoscopio')) { p('#3a3f4a', 5, 11, 1, 2); p('#3a3f4a', 10, 11, 1, 2); p('#3a3f4a', 6, 13, 1, 3); p('#cfd8dc', 6, 16, 2, 1); }
      if (acc.has('cracha')) { p('#ffffff', 9, 13, 2, 2); p('#3a6ea8', 9, 14, 2, 1); }
      if (item === 'sword') { p('#cfd8dc', 14, 6, 1, 9); p('#ffffff', 14, 6, 1, 3); p('#8d6e63', 13, 14, 3, 1); p('#8d6e63', 14, 15, 1, 2); }
      if (item === 'rod') { p('#8d6e63', 14, 0, 1, 16); p('#e8e2d0', 15, 0, 1, 1); }
      if (item === 'can') { p('#5b8fb9', 13, 14, 3, 3); p('#5b8fb9', 16, 13, 1, 2); p('#9fd0f2', 14, 14, 1, 1); }
      c.restore();
    }, 18, 26, [3, 24, 12]);
  }

  // quadros em cache para o mundo (desenhar 60×/s sem refazer o contorno)
  const frameCache = new Map();
  function charFrame(look, opts = {}) {
    const key = `${JSON.stringify(look)}|${opts.frame || 0}|${opts.dir || 'down'}|${opts.flip ? 1 : 0}|${opts.mood || 'neutral'}|${opts.breath || 0}|${opts.item || ''}`;
    let cv = frameCache.get(key);
    if (!cv) {
      cv = document.createElement('canvas'); cv.width = 18; cv.height = 26;
      drawChar(cv, look, opts);
      if (frameCache.size > 1500) frameCache.clear();
      frameCache.set(key, cv);
    }
    return cv;
  }

  /* ---------------- retrato ---------------- */
  const MOOD_FILES = { neutral: 'neutro', smile: 'sorriso', happy: 'feliz', serious: 'serio', sad: 'aborrecido', sick: 'aborrecido', surprised: 'surpreso', angry: 'irritado', thinking: 'pensativo', determined: 'determinado' };
  const imgCache = {};
  function portraitImage(src) {
    if (!imgCache[src]) { const img = new Image(); img.decoding = 'async'; img.src = src; imgCache[src] = img; }
    return imgCache[src];
  }
  function drawPortrait(canvas, look, mood = 'neutral') {
    if (!canvas || !look) return;
    if (look.portraits) {
      const img = portraitImage(`${look.portraits}${MOOD_FILES[mood] || 'neutro'}.png`);
      const paint = () => { canvas.width = 96; canvas.height = 96; const c = canvas.getContext('2d'); c.imageSmoothingEnabled = true; c.drawImage(img, 0, 0, 96, 96); canvas.dataset.real = '1'; };
      if (img.complete && img.naturalWidth) { paint(); return; }
      img.addEventListener('load', paint, { once: true });
    }
    const L = { skin: SKINS[2], hairStyle: 'curto', hairColor: HAIR_COLORS[0], eyes: EYES[0], outfit: 'camiseta', outfitColor: '#3a6ea8', inner: '#7fb6ea', acc: [], ...look };
    const acc = new Set(L.acc || []);
    const skin = mood === 'sick' ? shade(L.skin, 0.2) : L.skin;
    const skinD = shade(skin, -0.18); const skinDD = shade(skin, -0.32);
    const hair = L.hairColor; const hairD = shade(hair, -0.3); const hairL = shade(hair, 0.28);
    withOutline(canvas, (c) => {
      c.translate(1, 1);
      const p = (color, x, y, w = 1, h = 1) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
      // ombros
      const body = L.outfit === 'jaleco' ? '#f1efe6' : L.outfitColor;
      p(body, 4, 25, 24, 7); p(body, 6, 24, 20, 1); p(shade(body, -0.18), 22, 25, 6, 7);
      if (L.outfit === 'jaleco') { p(L.outfitColor, 13, 24, 6, 8); p('#cfcabb', 11, 24, 2, 8); p('#cfcabb', 19, 24, 2, 8); }
      if (L.outfit === 'scrub') { p(skinD, 14, 24, 4, 2); p(skinD, 15, 26, 2, 1); }
      if (L.outfit === 'avental') { p(L.inner, 4, 25, 24, 2); p('#f1e4c8', 9, 26, 14, 6); }
      if (L.outfit === 'colete') { p(L.inner, 11, 24, 10, 8); }
      // pescoço e rosto
      p(skinD, 13, 21, 6, 4);
      p(skin, 9, 6, 14, 16); p(skin, 8, 8, 16, 12); p(skinD, 22, 8, 2, 12); p(skinD, 10, 21, 12, 1);
      p(skin, 7, 12, 1, 4); p(skin, 24, 12, 1, 4); p(skinD, 7, 14, 1, 1);
      // sobrancelhas, olhos, nariz, boca
      const brow = hairD;
      if (mood === 'sad' || mood === 'sick') { p(brow, 11, 11, 3, 1); p(brow, 10, 10, 1, 1); p(brow, 18, 11, 3, 1); p(brow, 21, 10, 1, 1); }
      else if (mood === 'surprised') { p(brow, 11, 9, 3, 1); p(brow, 18, 9, 3, 1); }
      else { p(brow, 11, 10, 3, 1); p(brow, 18, 10, 3, 1); }
      p('#ffffff', 11, 12, 3, 3); p('#ffffff', 18, 12, 3, 3);
      p(L.eyes, 12, 12, 2, 3); p(L.eyes, 19, 12, 2, 3); p('#0e0c10', 12, 13, 1, 2); p('#0e0c10', 19, 13, 1, 2);
      p('#ffffff', 13, 12, 1, 1); p('#ffffff', 20, 12, 1, 1);
      p(skinDD, 15, 15, 2, 3); p(skinD, 16, 15, 1, 2);
      if (mood === 'happy') { p('#7a2a2a', 13, 18, 6, 2); p('#ffffff', 14, 18, 4, 1); p('#e88a8a', 10, 16, 2, 1); p('#e88a8a', 20, 16, 2, 1); }
      else if (mood === 'sad' || mood === 'sick') { p('#6a3a3a', 14, 19, 4, 1); p('#6a3a3a', 13, 20, 1, 1); p('#6a3a3a', 18, 20, 1, 1); }
      else if (mood === 'surprised') { p('#6a2a2a', 15, 18, 2, 3); }
      else { p('#8a4a3a', 14, 19, 4, 1); }
      if (mood === 'sick') { p('#9fd0f2', 23, 7, 2, 3); p('#d9eef8', 23, 7, 1, 1); p(shade(skin, -0.1), 10, 17, 2, 1); }
      // cabelo
      const hs = L.hairStyle;
      if (hs === 'raspado') { c.globalAlpha = 0.85; p(hair, 9, 4, 14, 4); p(hair, 8, 6, 2, 4); p(hair, 22, 6, 2, 4); c.globalAlpha = 1; }
      else if (hs === 'moicano') { p(hair, 13, 0, 6, 8); p(hairL, 14, 0, 2, 2); p(hairD, 9, 5, 4, 3); p(hairD, 19, 5, 4, 3); }
      else if (hs === 'cacheado') {
        p(hair, 6, 1, 20, 7); p(hair, 4, 4, 24, 6); p(hair, 4, 10, 4, 12); p(hair, 24, 10, 4, 12); p(hair, 9, 8, 6, 2);
        [[7, 2], [12, 1], [18, 1], [23, 3], [5, 8], [26, 9], [5, 15], [26, 16]].forEach(([x, y]) => { p(hairL, x, y, 2, 1); p(hairD, x, y + 2, 2, 1); });
      } else {
        p(hair, 8, 3, 16, 5); p(hair, 7, 5, 18, 3); p(hair, 7, 8, 2, 6); p(hair, 23, 8, 2, 5); p(hair, 9, 7, 8, 2);
        p(hairL, 10, 3, 6, 1); p(hairL, 9, 4, 2, 1); p(hairD, 22, 5, 2, 3);
        if (hs === 'longo') { p(hair, 4, 8, 4, 18); p(hair, 24, 8, 4, 18); p(hairD, 4, 20, 2, 6); p(hairD, 26, 20, 2, 6); }
        if (hs === 'coque') { p(hair, 12, -1, 8, 5); p(hairL, 13, -1, 3, 1); p(hairD, 12, 3, 8, 1); }
        if (hs === 'trancas') { for (let i = 0; i < 7; i++) { p(i % 2 ? hairD : hair, 4, 10 + i * 2, 4, 2); p(i % 2 ? hairD : hair, 24, 10 + i * 2, 4, 2); } p('#e8455a', 4, 24, 4, 1); p('#e8455a', 24, 24, 4, 1); }
      }
      // acessórios
      if (acc.has('touca')) { p(L.outfitColor, 7, 1, 18, 7); for (let i = 0; i < 5; i++) p(shade(L.outfitColor, 0.35), 9 + i * 3, 2 + (i % 2) * 2, 1, 1); }
      if (acc.has('bone')) { p('#c94f3d', 7, 1, 18, 6); p('#a23a2c', 1, 6, 14, 2); p('#ffffff', 15, 3, 3, 2); }
      if (acc.has('chapeu')) { p('#d9b26a', 1, 5, 30, 2); p('#c99d50', 7, -1, 18, 6); p('#8a5a36', 7, 3, 18, 2); }
      if (acc.has('oculos')) { p('#1b1b24', 10, 11, 5, 1); p('#1b1b24', 10, 15, 5, 1); p('#1b1b24', 10, 11, 1, 5); p('#1b1b24', 14, 11, 1, 5); p('#1b1b24', 17, 11, 5, 1); p('#1b1b24', 17, 15, 5, 1); p('#1b1b24', 17, 11, 1, 5); p('#1b1b24', 21, 11, 1, 5); p('#1b1b24', 15, 12, 2, 1); }
      if (acc.has('mascara')) { p('#bfe3f6', 10, 16, 12, 6); p('#9fc7e0', 10, 18, 12, 1); p('#d9eef8', 7, 15, 3, 1); p('#d9eef8', 22, 15, 3, 1); }
      if (acc.has('brinco')) { p('#f2c94c', 7, 16, 1, 2); p('#f2c94c', 24, 16, 1, 2); }
      if (acc.has('barba')) { c.globalAlpha = 0.9; p(hair, 8, 15, 2, 6); p(hair, 22, 15, 2, 6); p(hair, 10, 20, 12, 2); p(hair, 12, 22, 8, 1); p(hair, 13, 18, 6, 1); c.globalAlpha = 1; p('#8a4a3a', 14, 19, 4, 1); }
      if (acc.has('estetoscopio')) { p('#3a3f4a', 9, 24, 2, 4); p('#3a3f4a', 21, 24, 2, 4); p('#3a3f4a', 11, 28, 10, 1); p('#cfd8dc', 15, 29, 3, 2); }
      if (acc.has('cracha')) { p('#ffffff', 22, 27, 4, 5); p('#3a6ea8', 22, 28, 4, 1); }
    }, 34, 34, null);
  }

  function randomLook() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const acc = ['estetoscopio'];
    if (Math.random() < 0.4) acc.push('oculos');
    if (Math.random() < 0.25) acc.push('cracha');
    return {
      skin: pick(SKINS), hairStyle: pick(HAIR_STYLES)[0], hairColor: pick(HAIR_COLORS.slice(0, 7)), eyes: pick(EYES),
      outfit: pick(['jaleco', 'scrub']), outfitColor: pick(OUTFIT_COLORS), inner: '#7fb6ea', pants: '#3a3f4a', acc,
    };
  }

  window.PQSprites = { drawChar, charFrame, drawPortrait, shade, randomLook, SKINS, HAIR_COLORS, EYES, HAIR_STYLES, OUTFITS, OUTFIT_COLORS, ACCESSORIES };
})();
