/*
 * Plantão Quest — arte do mundo por tiles (16 × 16), prédios, objetos e fonte de pixel.
 * Tudo é desenhado por código (arte original). Os desenhos ficam em cache em canvases pequenos.
 */
(function tiles() {
  'use strict';
  const T = 16;
  const rect = (c, color, x, y, w, h) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
  const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return (h ^ (h >>> 16)) / 4294967296; };
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
  }
  function blob(c, color, cx, cy, rx, ry) {
    for (let y = -ry; y <= ry; y++) { const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); rect(c, color, cx - half, cy + y, half * 2, 1); }
  }
  const OUT = '#1a1622';
  // gerador pseudoaleatório estável (para espalhar flores sem amontoar)
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------------- fonte de pixel (5 × 7 e 3 × 5) ---------------- */
  const F5 = {
    A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110', D: '11110100011000110001100011000111110',
    E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000', G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001',
    I: '01110001000010000100001000010001110', J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
    M: '10001110111010110101100011000110001', N: '10001100011100110101100111000110001', O: '01110100011000110001100011000101110', P: '11110100011000111110100001000010000',
    Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001', S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100',
    U: '10001100011000110001100011000101110', V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001',
    Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111', ' ': '00000000000000000000000000000000000',
    '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111', '3': '11110000010000101110000010000111110',
    '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110', '6': '01110100001000011110100011000101110', '7': '11111000010001000100010000100001000',
    '8': '01110100011000101110100011000101110', '9': '01110100011000101111000010000101110', '-': '00000000000000011111000000000000000', '.': '00000000000000000000000000110001100', '+': '00000001000010011111001000010000000',
  };
  const F3 = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011',
    H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101',
    O: '010101101101010', P: '110101110100100', Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111',
    V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', ' ': '000000000000000', '-': '000000111000000', '.': '000000000000010',
  };
  const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  // separa cada letra do seu acento (agudo, til, circunflexo, crase, cedilha) para desenhar o sinal
  function glyphs(str) {
    const out = [];
    for (const ch of str.normalize('NFD').toUpperCase()) {
      if (/[̀-ͯ]/.test(ch)) { if (out.length) out[out.length - 1].mark = ch; continue; }
      out.push({ ch, mark: null });
    }
    return out;
  }
  function textWidth(str, small, scale = 1) { return glyphs(str).length * (small ? 4 : 6) * scale - scale; }
  function drawText(c, str, x, y, color, { small = false, scale = 1, shadow = null } = {}) {
    const font = small ? F3 : F5; const w = small ? 3 : 5; const h = small ? 5 : 7;
    let cx = x;
    const px = (X, Y) => { if (shadow) rect(c, shadow, X + scale, Y + scale, scale, scale); rect(c, color, X, Y, scale, scale); };
    for (const { ch, mark } of glyphs(str)) {
      const g = font[ch] || font[' '];
      for (let i = 0; i < w * h; i++) if (g[i] === '1') px(cx + (i % w) * scale, y + Math.floor(i / w) * scale);
      const mid = cx + Math.floor(w / 2) * scale; const top = y - 2 * scale;
      if (mark === '́') { px(mid, top); px(mid + scale, top); }
      else if (mark === '̀') { px(mid - scale, top); px(mid, top); }
      else if (mark === '̃') { px(mid - scale, top + scale); px(mid, top); px(mid + scale, top + scale); }
      else if (mark === '̂') { px(mid - scale, top + scale); px(mid, top); px(mid + scale, top + scale); }
      else if (mark === '̧') { px(mid, y + h * scale); px(mid - scale, y + (h + 1) * scale); }
      cx += (w + 1) * scale;
    }
  }

  /* ---------------- tiles ---------------- */
  // 0 grama, 1 grama florida, 2 terra, 3 calçamento, 4 praça, 5 água, 6 areia, 7 canteiro, 8 ponte, 9 rocha,
  // 10 grama alta, 11 piso de madeira, 12 piso claro, 13 parede, 14 tapete, 15 mata, 16 cachoeira, 17 cerca viva, 18 piso de pedra escuro
  const SOLID = new Set([5, 9, 13, 15, 16, 17, 19]);
  const tileCache = {};
  /* ---------------- tiles em alta definição (32 × 32 por tile de 16) ---------------- */
  // mais detalhe no chão: folhas de grama, pedras com relevo, ondas, tábuas com veios
  const HD = 32;
  const hdCache = {};
  function tileHD(id, v) {
    const key = `${id}:${v}`;
    if (hdCache[key] !== undefined) return hdCache[key];
    const cv = document.createElement('canvas'); cv.width = HD; cv.height = HD;
    const c = cv.getContext('2d');
    const R = rng(id * 7919 + v * 104729 + 17);
    const p = (col, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const grass = () => {
      p('#79c450', 0, 0, HD, HD);
      for (let i = 0; i < 70; i++) p(R() > 0.5 ? '#6cb847' : '#86cf5a', Math.floor(R() * HD), Math.floor(R() * HD), 1, 1);
      for (let i = 0; i < 26; i++) { const x = Math.floor(R() * 31); const y = 2 + Math.floor(R() * 29); const h = 2 + Math.floor(R() * 3); p(R() > 0.4 ? '#5aa83c' : '#4f9a36', x, y - h, 1, h); p('#9fe070', x, y - h, 1, 1); }
      if (R() > 0.6) { const x = 4 + Math.floor(R() * 22); const y = 4 + Math.floor(R() * 22); [[0, 0], [2, 0], [1, -1], [1, 1]].forEach(([dx, dy]) => p('#5fb041', x + dx, y + dy, 2, 2)); p('#8ee060', x + 1, y, 1, 1); }
    };
    const flower = (x, y, col) => { p('#3f8a34', x + 1, y + 3, 1, 3); p(col, x, y + 1, 3, 1); p(col, x + 1, y, 1, 3); p(shade(col, -0.2), x + 2, y + 2, 1, 1); p('#fff4b0', x + 1, y + 1, 1, 1); };
    switch (id) {
      case 0: case 10: grass(); if (id === 10) for (let i = 0; i < 12; i++) { const x = Math.floor(R() * 30); const y = 6 + Math.floor(R() * 24); p('#4a9234', x, y - 5, 1, 5); p('#4a9234', x + 1, y - 3, 1, 3); p('#a6e47a', x, y - 5, 1, 1); } break;
      case 1: grass(); for (let i = 0; i < 6; i++) flower(2 + Math.floor(R() * 26), 2 + Math.floor(R() * 24), ['#ffffff', '#ffd34d', '#ff8ac2', '#c9a5f2', '#ff6b5e', '#7fd0ff'][Math.floor(R() * 6)]); break;
      case 2: {
        p('#d9b47a', 0, 0, HD, HD);
        for (let i = 0; i < 60; i++) p(R() > 0.5 ? '#cba569' : '#e6c690', Math.floor(R() * HD), Math.floor(R() * HD), 1 + Math.floor(R() * 2), 1);
        for (let i = 0; i < 4; i++) { const x = 2 + Math.floor(R() * 26); const y = 2 + Math.floor(R() * 26); p('#8a6a46', x, y + 1, 4, 2); p('#b89470', x, y, 4, 2); p('#e8d2a8', x, y, 2, 1); }
        break;
      }
      case 3: {
        // pedras irregulares com relevo
        p('#9c8360', 0, 0, HD, HD);
        const rows = [[0, 9], [9, 11], [20, 12]];
        rows.forEach(([y, hh], ri) => {
          let x = ri % 2 ? -6 : -1; let k = 0;
          while (x < HD) {
            const ww = 9 + Math.floor(R() * 6); const base = ['#e8d2a3', '#dfc795', '#eedcb0', '#d6bb88', '#e3cc9c'][Math.floor(R() * 5)];
            p(base, x + 1, y + 1, ww - 1, hh - 1);
            p(shade(base, 0.35), x + 1, y + 1, ww - 2, 1); p(shade(base, 0.2), x + 1, y + 1, 1, hh - 2);
            p(shade(base, -0.18), x + 1, y + hh - 1, ww - 1, 1); p(shade(base, -0.12), x + ww - 1, y + 2, 1, hh - 2);
            if (R() > 0.6) p(shade(base, -0.1), x + 3 + Math.floor(R() * (ww - 6)), y + 3 + Math.floor(R() * (hh - 5)), 2, 1);
            x += ww; k += 1;
          }
        });
        break;
      }
      case 4: {
        p('#bea57a', 0, 0, HD, HD);
        [[0, 0], [16, 0], [0, 16], [16, 16]].forEach(([x, y], i) => {
          const base = (i === 0 || i === 3) ? '#f0e1bf' : '#e7d3a9';
          p(base, x + 1, y + 1, 14, 14); p('#fbf1d8', x + 1, y + 1, 13, 1); p('#fbf1d8', x + 1, y + 1, 1, 13); p(shade(base, -0.12), x + 1, y + 14, 14, 1); p(shade(base, -0.12), x + 14, y + 2, 1, 13);
          if (R() > 0.75) p(shade(base, -0.08), x + 4 + Math.floor(R() * 7), y + 4 + Math.floor(R() * 7), 3, 1);
        });
        if (v % 4 === 0) { p('#d98f7c', 14, 12, 4, 8); p('#d98f7c', 12, 14, 8, 4); p('#f2b7a6', 15, 13, 2, 2); }
        break;
      }
      case 5: {
        p('#3fa3e3', 0, 0, HD, HD); p('#3797da', 0, 20, HD, 12);
        for (let i = 0; i < 5; i++) { const x = Math.floor(R() * 26); const y = 2 + Math.floor(R() * 26); p('#7fd0ff', x, y, 5 + Math.floor(R() * 4), 1); p('#2f88cc', x + 1, y + 1, 4, 1); }
        for (let i = 0; i < 3; i++) p('#c8f0ff', Math.floor(R() * 30), Math.floor(R() * 30), 2, 1);
        break;
      }
      case 6: { p('#efd9a0', 0, 0, HD, HD); for (let i = 0; i < 80; i++) p(['#e2c88a', '#f8e8bc', '#d8bd80'][Math.floor(R() * 3)], Math.floor(R() * HD), Math.floor(R() * HD), 1, 1); for (let i = 0; i < 2; i++) { const x = Math.floor(R() * 28); const y = Math.floor(R() * 28); p('#f6f0e4', x, y, 3, 2); p('#d9c9b0', x, y + 2, 3, 1); } break; }
      case 8: {
        p('#5a3a20', 0, 0, HD, HD);
        for (let x = 0; x < HD; x += 8) { p('#a77a48', x, 0, 7, HD); p('#c4945e', x, 0, 1, HD); p('#8a5e34', x + 6, 0, 1, HD); for (let y = 3; y < HD; y += 7 + Math.floor(R() * 4)) p('#946638', x + 2 + Math.floor(R() * 3), y, 2, 1); p('#3a2414', x + 3, 3, 1, 1); p('#3a2414', x + 3, 28, 1, 1); }
        p('#3a2414', 0, 0, HD, 2); p('#3a2414', 0, 30, HD, 2);
        break;
      }
      case 9: {
        p('#5c5664', 0, 0, HD, HD);
        for (let i = 0; i < 6; i++) { const x = Math.floor(R() * 26); const y = Math.floor(R() * 26); const r = 4 + Math.floor(R() * 5); blob(c, '#1a1622', x + r, y + r, r + 1, r); blob(c, '#77707f', x + r, y + r, r, r - 1); blob(c, '#948d9c', x + r - 2, y + r - 2, Math.max(1, r - 3), Math.max(1, r - 4)); p('#b2abb9', x + r - 3, y + r - 3, 2, 1); }
        if (R() > 0.5) { p('#4f9a36', 2 + Math.floor(R() * 26), 26, 3, 2); p('#79c450', 3 + Math.floor(R() * 24), 27, 2, 1); }
        break;
      }
      case 15: {
        p('#256b2c', 0, 0, HD, HD);
        for (let i = 0; i < 7; i++) { const x = Math.floor(R() * 32); const y = Math.floor(R() * 32); const r = 5 + Math.floor(R() * 5); blob(c, '#1d5a24', x, y + 2, r, r - 1); blob(c, '#348a36', x, y, r - 1, r - 2); blob(c, '#4fb243', x - 2, y - 2, Math.max(1, r - 4), Math.max(1, r - 5)); p('#8ee060', x - 3, y - 3, 1, 1); }
        if (R() > 0.65) flower(4 + Math.floor(R() * 22), 4 + Math.floor(R() * 22), ['#ffd34d', '#ff8ac2', '#c9a5f2'][Math.floor(R() * 3)]);
        break;
      }
      case 16: { p('#6fc0f0', 0, 0, HD, HD); for (let x = 0; x < HD; x += 3) { p('#d8f4ff', x, 0, 1, HD); p('#4fa8e0', x + 1, 0, 1, HD); } break; }
      case 17: { p('#2f7a33', 0, 0, HD, HD); blob(c, '#3f9a3a', 16, 13, 15, 11); for (let i = 0; i < 14; i++) p('#6cc04c', 2 + Math.floor(R() * 28), 2 + Math.floor(R() * 20), 2, 1); p('#173a1c', 0, 28, HD, 4); break; }
      default: hdCache[key] = null; return null;
    }
    hdCache[key] = cv;
    return cv;
  }
  const resCache = {};
  // tile na resolução pedida (1 = original 16 px; 2 = 32 px; 4 = 64 px)
  function tileRes(id, v, res) {
    if (res <= 1) return tileCanvas(id, v);
    const key = `${id}:${v}:${res}`;
    if (resCache[key]) return resCache[key];
    const src = tileHD(id, v % 8) || tileCanvas(id, v % 5);
    const cv = document.createElement('canvas'); cv.width = T * res; cv.height = T * res;
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(src, 0, 0, T * res, T * res);
    resCache[key] = cv;
    return cv;
  }

  function tileCanvas(id, v) {
    const key = `${id}:${v}`;
    if (tileCache[key]) return tileCache[key];
    const cv = document.createElement('canvas'); cv.width = T; cv.height = T;
    const c = cv.getContext('2d');
    const r = (i) => hash(v, i, id);
    switch (id) {
      case 0: case 1: case 10: {
        rect(c, '#79c450', 0, 0, T, T);
        for (let i = 0; i < 20; i++) rect(c, r(i) > 0.55 ? '#68b444' : '#8fd65f', Math.floor(r(i + 40) * T), Math.floor(r(i + 80) * T), 1, 1);
        if (r(99) > 0.55 || id === 10) { const bx = Math.floor(r(98) * 12) + 2; const by = Math.floor(r(97) * 10) + 3; rect(c, '#58a03c', bx, by, 1, 3); rect(c, '#58a03c', bx + 2, by + 1, 1, 2); rect(c, '#9fe070', bx + 1, by - 1, 1, 3); }
        if (id === 1) for (let i = 0; i < 5; i++) { const fx = Math.floor(r(i + 120) * 13) + 1; const fy = Math.floor(r(i + 140) * 13) + 1; const col = ['#ffffff', '#ffd34d', '#ff8ac2', '#c9a5f2', '#ff6b5e'][i % 5]; rect(c, '#4f9a38', fx, fy + 2, 1, 1); rect(c, col, fx - 1, fy, 3, 1); rect(c, col, fx, fy - 1, 1, 3); rect(c, '#fff4b0', fx, fy, 1, 1); }
        break;
      }
      case 2: rect(c, '#d9b47a', 0, 0, T, T); for (let i = 0; i < 12; i++) rect(c, r(i) > 0.5 ? '#c79e62' : '#e6c690', Math.floor(r(i + 20) * 15), Math.floor(r(i + 40) * 15), 2, 1); if (r(70) > 0.6) rect(c, '#a98352', Math.floor(r(71) * 13) + 1, Math.floor(r(72) * 13) + 1, 2, 2); break;
      case 3: {
        // calçamento de pedras quentes (bege), juntas escuras
        rect(c, '#b99c72', 0, 0, T, T);
        const rows = [[0, 5], [5, 6], [11, 5]];
        rows.forEach(([y, hh], ri) => { let x = ri % 2 ? -3 : 0; let k = 0; while (x < T) { const ww = 5 + Math.floor(r(ri * 10 + k) * 3); const col = ['#e9d4a6', '#e1c897', '#efdcb2', '#d8bd8a'][Math.floor(r(ri * 20 + k) * 4)]; rect(c, col, x + 1, y + 1, ww - 1, hh - 1); rect(c, '#f6e8c6', x + 1, y + 1, ww - 2, 1); x += ww; k += 1; } });
        break;
      }
      case 4: {
        // piso da praça: lajotas claras com desenho em losango
        rect(c, '#c9b48c', 0, 0, T, T);
        rect(c, '#efe0bd', 1, 1, 7, 7); rect(c, '#e6d3aa', 8, 1, 7, 7); rect(c, '#e6d3aa', 1, 8, 7, 7); rect(c, '#efe0bd', 8, 8, 7, 7);
        rect(c, '#fbf0d4', 1, 1, 6, 1); rect(c, '#fbf0d4', 8, 8, 6, 1);
        if (r(3) > 0.82) { rect(c, '#d99a8a', 7, 6, 2, 4); rect(c, '#d99a8a', 6, 7, 4, 2); }
        break;
      }
      case 5: rect(c, '#3fa3e3', 0, 0, T, T); rect(c, '#3592d4', 0, 11, T, 5); if (r(1) > 0.4) rect(c, '#7fd0ff', Math.floor(r(2) * 10), Math.floor(r(3) * 10), 4, 1); if (r(4) > 0.7) rect(c, '#b8ecff', Math.floor(r(5) * 12), Math.floor(r(6) * 12), 2, 1); break;
      case 6: rect(c, '#efd9a0', 0, 0, T, T); for (let i = 0; i < 8; i++) rect(c, '#dcc185', Math.floor(r(i) * 15), Math.floor(r(i + 9) * 15), 1, 1); break;
      case 7: rect(c, '#6b4a2f', 0, 0, T, T); rect(c, '#5a3d26', 0, 3, T, 2); rect(c, '#5a3d26', 0, 11, T, 2); for (let x = 2; x < T; x += 5) { rect(c, '#3f8a3e', x, 1, 3, 3); rect(c, '#5aa64c', x + 1, 0, 1, 1); rect(c, '#3f8a3e', x, 9, 3, 3); } if (r(1) > 0.5) rect(c, ['#d9412b', '#f2c94c', '#f08a24'][Math.floor(r(2) * 3)], 7, 2, 1, 1); break;
      case 8: rect(c, '#6b4424', 0, 0, T, T); for (let x = 0; x < T; x += 4) { rect(c, '#9a7448', x, 0, 3, T); rect(c, '#b88c55', x, 0, 1, T); } rect(c, '#4a2e1a', 0, 0, T, 1); rect(c, '#4a2e1a', 0, 15, T, 1); break;
      case 9: rect(c, '#57525f', 0, 0, T, T); blob(c, '#6b6574', 6, 6, 5, 4); blob(c, '#4a4553', 11, 12, 4, 3); rect(c, '#7a7484', 4, 3, 3, 1); break;
      case 11: rect(c, '#a7743f', 0, 0, T, T); for (let y = 0; y < T; y += 4) { rect(c, '#8a5a36', 0, y + 3, T, 1); rect(c, '#b88c55', (y * 3) % T, y, 4, 1); } rect(c, '#8a5a36', (v * 5) % 12 + 2, 0, 1, 4); break;
      case 12: rect(c, '#e8e4da', 0, 0, T, T); rect(c, '#d6d0c2', 0, 15, T, 1); rect(c, '#d6d0c2', 15, 0, 1, T); rect(c, '#f4f1e8', 1, 1, 6, 1); break;
      case 13: rect(c, '#efe3c4', 0, 0, T, T); rect(c, '#e3d5b1', 0, 5, T, 1); rect(c, '#e3d5b1', 0, 10, T, 1); rect(c, '#b7ae9b', 0, 13, T, 3); rect(c, '#8a8070', 0, 15, T, 1); break;
      case 14: rect(c, '#8a2f4a', 0, 0, T, T); rect(c, '#a8405e', 1, 1, 14, 14); rect(c, '#e9b949', 3, 3, 10, 1); rect(c, '#e9b949', 3, 12, 10, 1); break;
      case 15: rect(c, '#2e7a32', 0, 0, T, T); blob(c, '#3f9a3a', 5, 5, 6, 5); blob(c, '#2f8236', 12, 11, 6, 5); rect(c, '#6cc04c', 3, 2, 2, 1); rect(c, '#6cc04c', 10, 8, 2, 1); if (r(9) > 0.7) rect(c, ['#ffd34d', '#ff8ac2', '#c9a5f2'][Math.floor(r(8) * 3)], Math.floor(r(7) * 12) + 2, Math.floor(r(6) * 12) + 2, 2, 2); break;
      case 16: rect(c, '#5e98d8', 0, 0, T, T); for (let x = 0; x < T; x += 3) rect(c, '#bfe3f6', x, 0, 1, T); break;
      case 17: rect(c, '#2f6b33', 0, 0, T, T); rect(c, '#3f8a3e', 1, 1, 14, 12); for (let i = 0; i < 6; i++) rect(c, '#5aa64c', Math.floor(r(i) * 13) + 1, Math.floor(r(i + 7) * 10) + 1, 2, 1); rect(c, '#1a3a1e', 0, 14, T, 2); break;
      case 18: rect(c, '#6b6574', 0, 0, T, T); rect(c, '#57525f', 0, 7, T, 1); rect(c, '#57525f', 7, 0, 1, 7); rect(c, '#57525f', 11, 8, 1, 8); break;
      case 19: rect(c, '#4a3a48', 0, 0, T, T); rect(c, '#5d4a5a', 0, 0, T, 2); rect(c, '#3a2c38', 0, 14, T, 2); if (r(1) > 0.5) rect(c, '#6a5668', Math.floor(r(2) * 12), 5, 3, 1); break;
      default: rect(c, '#ff00ff', 0, 0, T, T);
    }
    tileCache[key] = cv;
    return cv;
  }

  /* ---------------- prédios e objetos ---------------- */
  function win(c, x, y, w, h, frame = '#e8e2d0', glass = '#3a6ea8') {
    rect(c, OUT, x - 1, y - 1, w + 2, h + 2); rect(c, frame, x, y, w, h); rect(c, glass, x + 1, y + 1, w - 2, h - 2);
    rect(c, '#9fd0f2', x + 2, y + 2, Math.max(1, Math.floor(w / 3)), Math.max(1, Math.floor(h / 3)));
    rect(c, frame, x + Math.floor(w / 2), y + 1, 1, h - 2);
  }
  function roofTiles(c, x, y, w, h, color) {
    for (let i = 0; i < h; i++) rect(c, i % 4 === 3 ? shade(color, -0.25) : i % 2 ? shade(color, -0.08) : color, x, y + i, w, 1);
    for (let i = 0; i < w; i += 8) rect(c, shade(color, -0.3), x + i + ((Math.floor(i / 8)) % 2) * 4, y, 1, h);
    rect(c, shade(color, -0.45), x, y + h, w, 2);
    rect(c, shade(color, 0.2), x, y, w, 1);
  }
  function doorArt(c, dx, dy, dw, dh, color = '#7a4a2e', glass = false) {
    rect(c, OUT, dx - 1, dy - 1, dw + 2, dh + 1);
    if (glass) { rect(c, '#3a6ea8', dx, dy, dw, dh); rect(c, '#9fd0f2', dx + 1, dy + 1, Math.floor(dw / 2) - 2, dh - 2); rect(c, '#9fd0f2', dx + Math.floor(dw / 2) + 1, dy + 1, Math.floor(dw / 2) - 2, dh - 2); rect(c, '#e8e2d0', dx + Math.floor(dw / 2) - 1, dy, 2, dh); }
    else { rect(c, color, dx, dy, dw, dh); rect(c, shade(color, -0.25), dx + Math.floor(dw / 2), dy, 1, dh); rect(c, shade(color, 0.2), dx + 1, dy + 1, 1, dh - 2); rect(c, '#e0b04a', dx + Math.floor(dw / 2) - 2, dy + Math.floor(dh / 2), 1, 2); }
  }
  function signBoard(c, x, y, w, h, bg, text, sub, { textColor = '#ffffff', subColor = '#ffffff', scale = 1 } = {}) {
    rect(c, OUT, x - 1, y - 1, w + 2, h + 2); rect(c, bg, x, y, w, h); rect(c, shade(bg, 0.25), x, y, w, 1);
    const tw = textWidth(text, false, scale);
    drawText(c, text, x + Math.floor((w - tw) / 2), y + 2 + 2 * scale, textColor, { scale, shadow: shade(bg, -0.5) });
    if (sub) { const sw = textWidth(sub, true); drawText(c, sub, x + Math.floor((w - sw) / 2), y + 6 + 9 * scale, subColor, { small: true }); }
  }

  /*
   * Cada objeto: { w, h, draw(c), solid: [x, y, w, h] relativo, door: { x, y } relativo (centro inferior da porta) }
   */
  const DRAW = {
    hospital(c, w, h, o) {
      rect(c, OUT, 0, 22, w, h - 22);
      rect(c, '#eef1f3', 1, 23, w - 2, h - 24);
      for (let y = 28; y < h - 10; y += 6) rect(c, '#e2e6e9', 1, y, w - 2, 1);
      roofTiles(c, 0, 8, w, 14, '#2f6f9a');
      rect(c, OUT, 120, 0, 80, 24); rect(c, '#eef1f3', 121, 1, 78, 22); roofTiles(c, 118, 0, 84, 6, '#2f6f9a');
      rect(c, '#d63b3b', 156, 8, 8, 14); rect(c, '#d63b3b', 151, 11, 18, 8); rect(c, '#ffffff', 158, 9, 4, 12); rect(c, '#ffffff', 153, 13, 14, 4); rect(c, '#d63b3b', 159, 10, 2, 10); rect(c, '#d63b3b', 154, 14, 12, 2);
      signBoard(c, 28, 26, 264, 33, '#1f5f86', 'HOSPITAL COMUNITÁRIO', 'ANTONELLA', { scale: 2, subColor: '#ffe58a' });
      for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) { const wx = 12 + i * 25; if (wx > 128 && wx < 186 && row === 2) continue; win(c, wx, 62 + row * 30, 14, 18); }
      rect(c, '#2f6f9a', 1, h - 16, w - 2, 3);
      rect(c, '#bfc6cb', 1, h - 13, w - 2, 12);
      doorArt(c, 140, h - 40, 40, 39, '#3a6ea8', true);
      rect(c, '#2f6f9a', 132, h - 46, 56, 6); rect(c, OUT, 132, h - 40, 56, 1); drawText(c, 'ENTRADA', 139, h - 45, '#ffffff', { small: true });
      rect(c, '#d63b3b', 228, h - 34, 40, 14); drawText(c, 'PRONTO', 230, h - 31, '#ffffff', { small: true }); drawText(c, '-SOCORRO', 230, h - 26, '#ffffff', { small: true });
      for (let i = 0; i < 6; i++) rect(c, '#f2c94c', 236 + i * 6, h - 4, 3, 2);
    },
    ubs(c, w, h, o) {
      rect(c, OUT, 0, 20, w, h - 20);
      rect(c, o.reform ? '#e6f4ee' : '#f4f1e8', 1, 21, w - 2, h - 22);
      for (let y = 26; y < h - 12; y += 5) rect(c, o.reform ? '#dcece4' : '#ebe6da', 1, y, w - 2, 1);
      roofTiles(c, 0, 4, w, 16, '#2f7d6b');
      blob(c, OUT, w / 2, 12, 9, 9); blob(c, '#ffffff', w / 2, 12, 8, 8); rect(c, '#d63b3b', w / 2 - 2, 6, 4, 12); rect(c, '#d63b3b', w / 2 - 6, 10, 12, 4);
      signBoard(c, 20, 25, w - 40, 27, o.reform ? '#b8892a' : '#2f7d6b', 'UBS MURICI', 'UNIDADE BÁSICA DE SAÚDE', { scale: 1, subColor: '#e6f4ee' });
      [12, 40, w - 64, w - 36].forEach((x) => win(c, x, 58, 22, 22, o.reform ? '#2f8f7a' : '#e8e2d0'));
      if (o.flowers) [12, 40, w - 64, w - 36].forEach((x) => { rect(c, OUT, x - 1, 81, 24, 6); rect(c, '#7a4a2e', x, 82, 22, 4); for (let i = 0; i < 10; i++) rect(c, ['#e8455a', '#ffd34d', '#f08bb4'][i % 3], x + 1 + i * 2, 79 + (i % 2), 2, 2); });
      rect(c, '#2f7d6b', 1, h - 14, w - 2, 3); rect(c, o.reform ? '#bfe3d6' : '#d6d0c2', 1, h - 11, w - 2, 10);
      rect(c, '#2f7d6b', w / 2 - 22, h - 42, 44, 6); rect(c, OUT, w / 2 - 22, h - 36, 44, 1);
      doorArt(c, w / 2 - 16, h - 35, 32, 34, '#3a6ea8', true);
      if (o.flowers) { [w / 2 - 30, w / 2 + 28].forEach((x) => { rect(c, OUT, x - 1, h - 30, 3, 29); rect(c, '#ffe58a', x - 2, h - 34, 5, 4); }); }
    },
    biblioteca(c, w, h) {
      rect(c, OUT, 0, 22, w, h - 22); rect(c, '#efe3c4', 1, 23, w - 2, h - 24);
      for (let y = 28; y < h - 14; y += 5) rect(c, '#e3d5b1', 1, y, w - 2, 1);
      roofTiles(c, 0, 8, w, 14, '#34508a');
      for (let i = 0; i < 18; i++) rect(c, i % 2 ? '#f6eedb' : '#ece2c8', w / 2 - i * 2, i, i * 4 + 1, 1);
      rect(c, '#c74b3c', w / 2 - 5, 6, 10, 7); rect(c, '#ffffff', w / 2 - 3, 7, 6, 5); rect(c, '#c74b3c', w / 2 - 1, 8, 2, 3);
      signBoard(c, w / 2 - 50, 25, 100, 14, '#34508a', 'BIBLIOTECA', null);
      [10, 34, w - 56, w - 32].forEach((x) => win(c, x, 46, 20, 34));
      [70, w - 76].forEach((x) => { rect(c, OUT, x - 1, 40, 8, h - 54); rect(c, '#ffffff', x, 40, 6, h - 54); rect(c, '#d9d4c6', x + 5, 40, 1, h - 54); });
      rect(c, '#b7ae9b', 1, h - 14, w - 2, 13); for (let x = 1; x < w; x += 8) rect(c, '#a39a88', x, h - 14, 1, 13);
      doorArt(c, w / 2 - 12, h - 40, 24, 32, '#5a3420');
      rect(c, '#d0c7b4', w / 2 - 18, h - 8, 36, 4); rect(c, '#bfb6a3', w / 2 - 22, h - 4, 44, 3);
    },
    escola(c, w, h) {
      rect(c, OUT, 0, 18, w, h - 18); rect(c, '#c96a4a', 1, 19, w - 2, h - 20);
      for (let y = 22; y < h - 2; y += 4) for (let x = (y % 8) ? 1 : 5; x < w - 2; x += 8) rect(c, '#b35a3c', x, y, 7, 1);
      roofTiles(c, 0, 4, w, 14, '#4a4a5a');
      signBoard(c, w / 2 - 66, 22, 132, 26, '#2a2a33', 'ESCOLA DA SAÚDE', 'CENTRO DE TREINAMENTO', { textColor: '#ffe58a' });
      for (let i = 0; i < 5; i++) if (i !== 2) win(c, 10 + i * 36, 54, 22, 20, '#f1efe6');
      doorArt(c, w / 2 - 14, h - 36, 28, 35, '#3a6ea8', true);
      rect(c, '#f2c94c', w - 26, 6, 2, 30); rect(c, '#3f8a3e', w - 24, 6, 14, 9); rect(c, '#ffe58a', w - 20, 9, 5, 3);
    },
    farmacia(c, w, h) {
      rect(c, OUT, 0, 14, w, h - 14); rect(c, '#f4f1e8', 1, 15, w - 2, h - 16);
      roofTiles(c, 0, 2, w, 12, '#3f8a3e');
      signBoard(c, 8, 19, w - 16, 14, '#3f8a3e', 'FARMÁCIA', null);
      rect(c, '#3f8a3e', w - 22, 38, 14, 4); rect(c, '#3f8a3e', w - 17, 33, 4, 14);
      win(c, 8, 40, 28, 22); doorArt(c, w / 2 - 6, h - 30, 22, 29, '#3a6ea8', true);
    },
    mulher(c, w, h) {
      rect(c, OUT, 0, 14, w, h - 14); rect(c, '#f3e6f1', 1, 15, w - 2, h - 16);
      roofTiles(c, 0, 2, w, 12, '#8e5bb9');
      signBoard(c, 6, 18, w - 12, 25, '#8e5bb9', 'SAÚDE DA MULHER', 'AMBULATÓRIO', { subColor: '#ffe0f4' });
      win(c, 10, 46, 24, 20); win(c, w - 34, 46, 24, 20); doorArt(c, w / 2 - 11, h - 30, 22, 29, '#6b4a8a');
    },
    idoso(c, w, h) {
      rect(c, OUT, 0, 16, w, h - 16); rect(c, '#f6e2b0', 1, 17, w - 2, h - 18);
      for (let y = 22; y < h - 8; y += 5) rect(c, '#ecd59c', 1, y, w - 2, 1);
      roofTiles(c, 0, 2, w, 14, '#c96a3a');
      signBoard(c, w / 2 - 70, 21, 140, 26, '#7a4a2e', 'CASA DO IDOSO', 'VIVER BEM', { textColor: '#ffe58a' });
      [10, 38, w - 62, w - 34].forEach((x) => win(c, x, 52, 22, 20));
      doorArt(c, w / 2 - 14, h - 34, 28, 33, '#7a4a2e');
      rect(c, '#bfb6a3', w / 2 + 16, h - 6, 40, 5); for (let i = 0; i < 5; i++) rect(c, '#a39a88', w / 2 + 16 + i * 8, h - 6 + Math.floor(i / 2), 8, 1);
      rect(c, OUT, w / 2 + 16, h - 12, 40, 1); rect(c, '#3a6ea8', w / 2 + 60, h - 22, 10, 10); rect(c, '#ffffff', w / 2 + 63, h - 20, 4, 4);
    },
    casa(c, w, h, o) {
      const wall = o.wall || '#f3e2b0'; const roofC = o.roof || '#3a6ea8';
      rect(c, OUT, 0, 18, w, h - 18); rect(c, wall, 1, 19, w - 2, h - 20);
      for (let y = 23; y < h - 2; y += 4) rect(c, shade(wall, -0.06), 1, y, w - 2, 1);
      roofTiles(c, 0, 4, w, 14, roofC);
      if (o.chimney) { rect(c, OUT, w - 22, -4, 10, 12); rect(c, '#9a5a3a', w - 21, -3, 8, 11); }
      [8, w - 30].forEach((x) => { win(c, x, 30, 22, 16); rect(c, '#8a5a36', x - 1, 47, 24, 3); for (let i = 0; i < 8; i++) rect(c, ['#e8455a', '#ffd34d', '#f08bb4'][i % 3], x + i * 3, 45 + (i % 2), 2, 2); });
      doorArt(c, w / 2 - 8, h - 26, 16, 25);
      if (o.label) signBoard(c, w / 2 - 22, 22, 44, 7, shade(roofC, -0.2), '', null);
    },
    quitanda(c, w, h) {
      DRAW.casa(c, w, h, { wall: '#f1e4c8', roof: '#c94f3d' });
      for (let i = 0; i < Math.ceil(w / 8); i++) rect(c, i % 2 ? '#ffffff' : '#e8455a', i * 8, 30, 8, 8);
      rect(c, OUT, 0, 38, w, 1);
      signBoard(c, w / 2 - 34, 19, 68, 13, '#3f8a3e', 'QUITANDA', null);
      [[4, h - 10, '#4a2a5a'], [w - 18, h - 10, '#f2c94c']].forEach(([x, y, f]) => { rect(c, OUT, x - 1, y - 1, 16, 10); rect(c, '#a7743f', x, y, 14, 8); for (let i = 0; i < 6; i++) rect(c, f, x + 1 + i * 2, y - 2 + (i % 2), 2, 2); });
    },
    barraca(c, w, h, o) {
      const col = o.color || '#e8455a';
      rect(c, OUT, 2, 14, 2, h - 14); rect(c, OUT, w - 4, 14, 2, h - 14);
      for (let i = 0; i < Math.ceil(w / 6); i++) rect(c, i % 2 ? '#ffffff' : col, i * 6, 4, 6, 12);
      for (let i = 0; i < Math.ceil(w / 6); i++) blob(c, i % 2 ? '#ffffff' : col, i * 6 + 3, 16, 3, 2);
      rect(c, OUT, 0, 3, w, 1);
      rect(c, OUT, 3, h - 14, w - 6, 12); rect(c, '#a7743f', 4, h - 13, w - 8, 10); rect(c, '#8a5a36', 4, h - 9, w - 8, 1);
      for (let i = 0; i < Math.floor((w - 10) / 4); i++) rect(c, (o.goods || ['#d9412b', '#f2c94c', '#4a2a5a', '#b6d96a'])[i % 4], 6 + i * 4, h - 16 + (i % 2), 3, 3);
      if (o.label) { const tw = textWidth(o.label, true); rect(c, OUT, w / 2 - tw / 2 - 3, h - 30, tw + 6, 9); rect(c, '#f6ecd7', w / 2 - tw / 2 - 2, h - 29, tw + 4, 7); drawText(c, o.label, w / 2 - tw / 2, h - 28, '#2d3529', { small: true }); }
    },
    gruta(c, w, h) {
      blob(c, '#3c3846', w / 2, h / 2 + 6, w / 2 - 2, h / 2 - 8); blob(c, '#57525f', w / 2 - 2, h / 2 + 4, w / 2 - 8, h / 2 - 14); blob(c, '#6b6574', w / 2 - 20, h / 2 - 10, w / 4, h / 5);
      for (let i = 0; i < 30; i++) blob(c, i % 2 ? '#7a7484' : '#4a4553', 14 + ((i * 37) % (w - 28)), 20 + ((i * 23) % (h - 40)), 4, 3);
      blob(c, '#121016', w / 2, h - 22, 20, 22); rect(c, '#121016', w / 2 - 20, h - 22, 40, 22);
      rect(c, OUT, w / 2 - 34, h - 62, 68, 13); rect(c, '#8a5a36', w / 2 - 33, h - 61, 66, 11); drawText(c, 'GRUTA VELHA', w / 2 - 31, h - 58, '#ffe58a', { small: true });
      [w / 2 - 30, w / 2 + 27].forEach((x) => rect(c, '#5a3a22', x, h - 40, 3, 16));
    },
    arvore(c, w, h, o) {
      const k = o.kind || 'manga';
      const PAL = {
        manga: ['#1f5a26', '#2f8a34', '#4fb243', '#8ee060', '#f08a24'],
        pomar: ['#1f5a26', '#2f8a34', '#4fb243', '#8ee060', '#e2402e'],
        ipe: ['#8a2f6a', '#d0569e', '#f08bc4', '#ffd0ea', '#ffffff'],
        amarelo: ['#9a6a10', '#e0a81c', '#ffd23f', '#fff09a', '#ffffff'],
        jacaranda: ['#4a2a7a', '#7b4cc0', '#a77de8', '#d8c0ff', '#ffffff'],
        flamboyant: ['#7a1f1a', '#c9382a', '#ef6a4a', '#ffb08a', '#ffe0a0'],
      }[k] || ['#1f5a26', '#2f8a34', '#4fb243', '#8ee060', '#f08a24'];
      const cx = w / 2; const top = 2; const ch = h - 16;
      // tronco com raízes
      rect(c, OUT, cx - 4, h - 16, 8, 15); rect(c, '#7a4a2a', cx - 3, h - 16, 6, 14); rect(c, '#5a341c', cx - 3, h - 16, 2, 14); rect(c, '#9a6a3e', cx + 1, h - 14, 1, 10);
      rect(c, OUT, cx - 6, h - 3, 12, 3); rect(c, '#5a341c', cx - 5, h - 3, 10, 2);
      // copa em cachos (contorno, base, sombra, brilho)
      const cl = [[0, 0.42, 0.42], [-0.26, 0.55, 0.3], [0.26, 0.55, 0.3], [-0.18, 0.25, 0.3], [0.2, 0.26, 0.28], [0, 0.66, 0.33], [-0.34, 0.4, 0.22], [0.34, 0.4, 0.22]];
      const R = Math.min(w, ch) / 2;
      const circ = (fx, fy, fr, color, grow = 0) => blob(c, color, Math.round(cx + fx * w), Math.round(top + fy * ch), Math.max(2, Math.round(fr * R * 1.25) + grow), Math.max(2, Math.round(fr * R) + grow));
      cl.forEach(([fx, fy, fr]) => circ(fx, fy, fr, OUT, 1));
      cl.forEach(([fx, fy, fr]) => circ(fx, fy, fr, PAL[1]));
      cl.forEach(([fx, fy, fr]) => blob(c, PAL[0], Math.round(cx + fx * w), Math.round(top + fy * ch + fr * R * 0.55), Math.max(1, Math.round(fr * R * 1.05)), Math.max(1, Math.round(fr * R * 0.42))));
      cl.forEach(([fx, fy, fr]) => blob(c, PAL[2], Math.round(cx + fx * w - fr * R * 0.25), Math.round(top + fy * ch - fr * R * 0.25), Math.max(1, Math.round(fr * R * 0.75)), Math.max(1, Math.round(fr * R * 0.55))));
      cl.forEach(([fx, fy, fr]) => blob(c, PAL[3], Math.round(cx + fx * w - fr * R * 0.45), Math.round(top + fy * ch - fr * R * 0.45), Math.max(1, Math.round(fr * R * 0.3)), Math.max(1, Math.round(fr * R * 0.22))));
      // textura de folhas: pequenos toques claros e escuros dentro da copa
      const TX = rng(w * 3 + h * 5 + k.length);
      const img = c.getImageData(0, 0, w, h).data;
      const inside = (x, y) => { const i = (y * w + x) * 4; return img[i + 3] > 0 && !(img[i] === 26 && img[i + 1] === 22 && img[i + 2] === 34); };
      for (let i = 0; i < Math.round((w * ch) / 9); i++) {
        const x = 2 + Math.floor(TX() * (w - 4)); const y = top + 2 + Math.floor(TX() * (ch - 4));
        if (!inside(x, y) || !inside(x + 2, y + 1)) continue;
        const lit = y < top + ch * (0.35 + TX() * 0.3);
        rect(c, lit ? PAL[3] : PAL[0], x, y, 2, 1); rect(c, lit ? PAL[2] : PAL[1], x + 1, y + 1, 1, 1);
      }
      // flores ou frutos
      const n = Math.round((w * ch) / 55); const RR = rng(w * 7 + h * 13 + k.length * 101);
      for (let i = 0; i < n; i++) {
        const fx = 4 + Math.floor(RR() * (w - 8)); const fy = top + 3 + Math.floor(RR() * (ch - 8));
        const d = c.getImageData(fx, fy, 1, 1).data; if (!d[3] || (d[0] === 26 && d[1] === 22)) continue;
        if (k === 'manga' || k === 'pomar') { rect(c, OUT, fx, fy, 3, 3); rect(c, PAL[4], fx, fy, 2, 2); rect(c, '#ffe0a0', fx, fy, 1, 1); }
        else rect(c, i % 3 ? PAL[3] : PAL[4], fx, fy, 2, 1);
      }
    },
    arbusto(c, w, h, o) {
      const col = o.flower || '#ff6fae';
      blob(c, OUT, w / 2, h / 2 + 2, w / 2 - 1, h / 2 - 2); blob(c, '#2f8a34', w / 2, h / 2 + 2, w / 2 - 2, h / 2 - 3); blob(c, '#4fb243', w / 2 - 2, h / 2, w / 3, h / 4); blob(c, '#8ee060', w / 2 - 3, h / 2 - 2, w / 6, h / 8);
      const R = rng(w * 17 + h + col.length * 3 + col.charCodeAt(2)); for (let i = 0; i < Math.round(w * h / 22); i++) { const fx = 3 + Math.floor(R() * (w - 6)); const fy = 3 + Math.floor(R() * (h - 7)); rect(c, col, fx - 1, fy, 3, 1); rect(c, col, fx, fy - 1, 1, 3); rect(c, '#fff4b0', fx, fy, 1, 1); }
    },
    flores(c, w, h, o) {
      const cols = o.cols || ['#ff6fae', '#ffd34d', '#ffffff', '#c9a5f2', '#ff6b5e'];
      const R = rng(w * 37 + h * 11); const big = w > 40 ? 2 : 1; for (let i = 0; i < Math.round(w * h / (big > 1 ? 34 : 12)); i++) { const fx = 2 + Math.floor(R() * (w - 4)); const fy = 2 + Math.floor(R() * (h - 4)); rect(c, '#3f9a3a', fx - big, fy + big, 2 * big + 1, big); rect(c, '#2f8a34', fx, fy + big, big, 2 * big); const col = cols[i % cols.length]; rect(c, col, fx - big, fy, 2 * big + 1, big); rect(c, col, fx, fy - big, big, 2 * big + 1); rect(c, '#fff4b0', fx, fy, big, big); }
    },
    lirio(c, w, h) { blob(c, '#2f8a34', w / 2, h / 2, w / 2 - 1, h / 2 - 1); blob(c, '#5cc04a', w / 2 - 1, h / 2 - 1, w / 2 - 3, h / 2 - 2); rect(c, '#3fa3e3', w / 2, h / 2 - 1, w / 2, 1); rect(c, '#ff8ac2', w / 2 - 2, h / 2 - 2, 3, 2); rect(c, '#ffffff', w / 2 - 1, h / 2 - 2, 1, 1); },
    placaSetas(c, w, h, o) {
      rect(c, OUT, w / 2 - 2, 4, 4, h - 4); rect(c, '#7a4a2a', w / 2 - 1, 4, 2, h - 4);
      (o.items || []).forEach((t, i) => {
        const y = 2 + i * 11; const right = i % 2 === 0;
        rect(c, OUT, 1, y, w - 2, 10); rect(c, '#e9c47a', 2, y + 1, w - 4, 8); rect(c, '#f6dca0', 2, y + 1, w - 4, 1);
        const ax = right ? w - 7 : 3; for (let k = 0; k < 3; k++) rect(c, '#7a4a2a', right ? ax + k : ax + 2 - k, y + 3 + k, 1, 5 - k * 2 > 0 ? 5 - k * 2 : 1);
        drawText(c, t, right ? 4 : 8, y + 3, '#4a2e1a', { small: true });
      });
    },
    posteBandeira(c, w, h) {
      rect(c, OUT, w / 2 - 1, 6, 3, h - 6); rect(c, '#2a3a36', w / 2, 6, 1, h - 6); rect(c, OUT, w / 2 - 4, 0, 9, 7); rect(c, '#ffe58a', w / 2 - 3, 1, 7, 5); rect(c, '#2a3a36', w / 2 - 4, h - 2, 9, 2);
      rect(c, OUT, w / 2 + 1, 9, 8, 13); rect(c, '#2f8a4a', w / 2 + 2, 10, 6, 11); rect(c, '#ffffff', w / 2 + 4, 12, 2, 6); rect(c, '#ffffff', w / 2 + 3, 14, 4, 2);
    },
    palmeira(c, w, h) {
      const x = w / 2 - 1;
      rect(c, '#7a5a3a', x, 10, 3, h - 10); for (let i = 0; i < 6; i++) rect(c, '#6a4a2e', x, 12 + i * 5, 3, 1);
      const leaf = (dx, dy, len) => { for (let i = 0; i < len; i++) rect(c, '#2f7d3a', x + 1 + Math.round(dx * i), 9 + Math.round(dy * i), 3, 2); };
      leaf(1, 0.35, 11); leaf(-1, 0.35, 11); leaf(0.7, 0.7, 8); leaf(-0.7, 0.7, 8); leaf(0.2, -0.5, 6);
      rect(c, '#4a2a5a', x - 1, 10, 2, 2); rect(c, '#4a2a5a', x + 3, 11, 2, 2);
    },
    chafariz(c, w, h) {
      const u = w / 80; const cx = w / 2; const by = h - 20 * u;
      const R = (col, x, y, ww, hh) => rect(c, col, Math.round(x), Math.round(y), Math.max(1, Math.round(ww)), Math.max(1, Math.round(hh)));
      const B = (col, x, y, rx, ry) => blob(c, col, Math.round(x), Math.round(y), Math.max(1, Math.round(rx)), Math.max(1, Math.round(ry)));
      // bacia de pedra em dois níveis
      B(OUT, cx, by, w / 2 - u, 19 * u); B('#b9b2a5', cx, by, w / 2 - 2 * u, 18 * u); B('#d8d2c4', cx, by - 2 * u, w / 2 - 3 * u, 16 * u);
      B('#8f887c', cx, by + 4 * u, w / 2 - 5 * u, 12 * u); B('#2f88d0', cx, by + u, w / 2 - 7 * u, 12 * u); B('#4fb0ee', cx, by, w / 2 - 9 * u, 10 * u);
      for (let i = 0; i < 14; i++) R('#a7e4ff', cx - 26 * u + i * 4 * u, by - 4 * u + (i % 3) * 3 * u, 3 * u, u * 0.6);
      R(OUT, cx - 5 * u, 12 * u, 10 * u, by - 10 * u); R('#d8d2c4', cx - 4 * u, 12 * u, 8 * u, by - 11 * u); R('#b9b2a5', cx + u, 12 * u, 3 * u, by - 11 * u); R('#efe9dc', cx - 3 * u, 12 * u, u, by - 11 * u);
      B(OUT, cx, 14 * u, 15 * u, 6 * u); B('#d8d2c4', cx, 13 * u, 14 * u, 5 * u); B('#4fb0ee', cx, 12 * u, 11 * u, 3 * u); R('#a7e4ff', cx - 6 * u, 11 * u, 5 * u, u * 0.6);
      R(OUT, cx - 3 * u, 2 * u, 6 * u, 10 * u); R('#e8e2d4', cx - 2 * u, 3 * u, 4 * u, 8 * u); B('#ffd34d', cx, 2 * u, 2 * u, 2 * u);
      for (let i = 0; i < 6; i++) { const fx = cx - 30 * u + i * 12 * u; R('#ff6fae', fx, h - 4 * u, 2 * u, 2 * u); R('#ffd34d', fx + 5 * u, h - 3 * u, 2 * u, 2 * u); }
    },
    banco(c, w) { rect(c, OUT, 0, 2, w, 8); rect(c, '#8a5a36', 1, 3, w - 2, 3); rect(c, '#a7743f', 1, 3, w - 2, 1); rect(c, '#6b4424', 1, 7, w - 2, 1); rect(c, '#3a2414', 2, 9, 2, 4); rect(c, '#3a2414', w - 4, 9, 2, 4); },
    poste(c, w, h) { rect(c, OUT, w / 2 - 1, 6, 3, h - 6); rect(c, '#2a3a36', w / 2, 6, 1, h - 6); rect(c, OUT, w / 2 - 4, 0, 9, 7); rect(c, '#ffe58a', w / 2 - 3, 1, 7, 5); rect(c, '#2a3a36', w / 2 - 4, h - 2, 9, 2); },
    canteiro(c, w, h) {
      const R = rng(w * 131 + h * 7);
      rect(c, OUT, 0, 2, w, h - 2); rect(c, '#d8cbaa', 1, 3, w - 2, h - 4); rect(c, '#efe4c6', 1, 3, w - 2, 1); rect(c, '#b3a581', 1, h - 3, w - 2, 1);
      rect(c, '#2f8a34', 3, 5, w - 6, h - 9);
      for (let i = 0; i < Math.round((w * h) / 20); i++) { const fx = 5 + Math.floor(R() * (w - 10)); const fy = 5 + Math.floor(R() * (h - 12)); blob(c, '#3f9a3a', fx, fy + 2, 4, 3); blob(c, '#5cc04a', fx - 1, fy + 1, 3, 2); rect(c, '#9fe070', fx - 2, fy, 1, 1); }
      for (let i = 0; i < Math.round((w * h) / 8); i++) {
        const fx = 4 + Math.floor(R() * (w - 8)); const fy = 4 + Math.floor(R() * (h - 10));
        const col = ['#ff6fae', '#ffd34d', '#ffffff', '#c9a5f2', '#ff6b5e', '#ff9ad0'][i % 6];
        rect(c, col, fx - 1, fy, 3, 1); rect(c, col, fx, fy - 1, 1, 3); rect(c, '#fff4b0', fx, fy, 1, 1);
      }
    },
    vitral(c, w, h) {
      rect(c, OUT, 0, 0, w, h); rect(c, '#7a4a2a', 1, 1, w - 2, h - 2);
      const cols = ['#3fa3e3', '#ffd34d', '#ff6b5e', '#5cc04a', '#c9a5f2', '#ff9ad0'];
      for (let y = 3; y < h - 3; y += 5) for (let x = 3; x < w - 3; x += 5) rect(c, cols[(x * 3 + y) % cols.length], x, y, 4, 4);
      rect(c, '#fff4d0', w / 2 - 1, 4, 3, h - 8); rect(c, '#fff4d0', w / 2 - 7, 9, 15, 3);
    },
    roseta(c, w, h) {
      const cx = w / 2; const cy = h / 2;
      const ring = (rx, ry, color) => { for (let y = -ry; y <= ry; y++) { const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); rect(c, color, Math.round(cx - half), Math.round(cy + y), half * 2, 1); } };
      ring(w / 2, h / 2, '#8f7650'); ring(w / 2 - 1, h / 2 - 1, '#d9bd8a'); ring(w / 2 - 6, h / 2 - 4, '#b8674e'); ring(w / 2 - 8, h / 2 - 6, '#e7c79a'); ring(w / 2 - 12, h / 2 - 9, '#c98f72'); ring(w / 2 - 14, h / 2 - 11, '#f3e3c0');
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; const x = Math.round(cx + Math.cos(a) * (w / 2 - 4)); const y = Math.round(cy + Math.sin(a) * (h / 2 - 3)); rect(c, '#c4ab80', x, y, 2, 1); }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const x = Math.round(cx + Math.cos(a) * (w / 2 - 14)); const y = Math.round(cy + Math.sin(a) * (h / 2 - 11)); rect(c, '#d99a8a', x - 2, y - 1, 4, 3); rect(c, '#efb8a6', x - 1, y - 1, 2, 1); }
    },
    quadro(c, w, h) { rect(c, '#5a3a22', 4, 14, 2, h - 14); rect(c, '#5a3a22', w - 6, 14, 2, h - 14); rect(c, OUT, 0, 0, w, 18); rect(c, '#8a5a36', 1, 1, w - 2, 16); rect(c, '#f7f1e3', 3, 3, 8, 6); rect(c, '#ffe58a', 13, 3, 6, 5); rect(c, '#bfe3f6', 21, 4, 6, 7); rect(c, '#f7f1e3', 4, 10, 12, 5); rect(c, '#d63b3b', 6, 3, 1, 1); },
    cerca(c, w) { for (let x = 0; x < w; x += 6) { rect(c, OUT, x, 0, 3, 12); rect(c, '#f1efe6', x + 1, 1, 1, 10); } rect(c, '#f1efe6', 0, 4, w, 1); rect(c, '#f1efe6', 0, 8, w, 1); },
    cercaMadeira(c, w) { for (let x = 0; x < w; x += 8) { rect(c, OUT, x, 0, 3, 12); rect(c, '#8a6a46', x + 1, 1, 1, 10); } rect(c, '#7a5a3a', 0, 3, w, 2); rect(c, '#7a5a3a', 0, 8, w, 2); },
    mesa(c, w, h) { rect(c, OUT, 0, 0, w, h - 4); rect(c, '#a7743f', 1, 1, w - 2, h - 6); rect(c, '#c99d64', 2, 2, w - 4, 2); rect(c, '#5a3a22', 2, h - 5, 2, 5); rect(c, '#5a3a22', w - 4, h - 5, 2, 5); },
    guardasol(c, w, h, o) {
      rect(c, OUT, 4, 13, w - 8, 9); rect(c, '#a7743f', 5, 14, w - 10, 6); rect(c, '#c99d64', 6, 14, w - 12, 2); rect(c, '#5a3a22', 6, 20, 2, h - 20); rect(c, '#5a3a22', w - 8, 20, 2, h - 20);
      rect(c, '#5a3a22', 2, 20, 3, 5); rect(c, '#5a3a22', w - 5, 20, 3, 5);
      rect(c, '#5a3a22', w / 2, 2, 1, 14);
      for (let i = 0; i < 9; i++) { const hh = 6 - Math.abs(4 - i); rect(c, OUT, w / 2 - 14 + i * 3, 1 + (4 - hh) / 1, 4, hh + 2); }
      for (let i = 0; i < 9; i++) { const hh = 6 - Math.abs(4 - i); rect(c, i % 2 ? '#ffffff' : (o.color || '#f08a24'), w / 2 - 13 + i * 3, 2 + (4 - hh), 3, hh); }
    },
    espantalho(c) { rect(c, '#8a6a46', 7, 8, 2, 20); rect(c, '#8a6a46', 0, 13, 16, 2); rect(c, '#d9a066', 4, 2, 8, 7); rect(c, '#c74b3c', 2, 0, 12, 3); rect(c, '#3a6ea8', 4, 13, 8, 9); },
    canoa(c, w) { rect(c, OUT, 0, 2, w, 6); rect(c, '#8a5a36', 1, 3, w - 2, 3); rect(c, '#a7743f', 2, 3, w - 4, 1); },
    placa(c, w, h, o) { rect(c, '#5a3a22', w / 2 - 1, 10, 2, h - 10); rect(c, OUT, 0, 0, w, 12); rect(c, '#c99d64', 1, 1, w - 2, 10); if (o.label) drawText(c, o.label, Math.round((w - textWidth(o.label, true)) / 2), 3, '#2d3529', { small: true }); },
    pedra(c, w, h) { blob(c, OUT, w / 2, h / 2, w / 2 - 1, h / 2 - 1); blob(c, '#7a7484', w / 2, h / 2, w / 2 - 2, h / 2 - 2); blob(c, '#948e9c', w / 2 - 2, h / 2 - 2, w / 4, h / 4); },
    // interiores
    balcao(c, w, h, o) { rect(c, OUT, 0, 0, w, h); rect(c, o.color || '#2f7d6b', 1, 1, w - 2, h - 2); rect(c, '#f1efe6', 1, 1, w - 2, 4); rect(c, shade(o.color || '#2f7d6b', -0.2), 1, h - 4, w - 2, 3); },
    estante(c, w, h) { rect(c, OUT, 0, 0, w, h); rect(c, '#6b4424', 1, 1, w - 2, h - 2); for (let y = 3; y < h - 2; y += 9) { rect(c, '#4a2e1a', 2, y + 7, w - 4, 1); for (let x = 3; x < w - 3; x += 3) rect(c, ['#c94f3d', '#3a6ea8', '#3f8a3e', '#e9b949', '#8e5bb9'][(x + y) % 5], x, y + Math.floor(hash(x, y) * 2), 2, 7 - Math.floor(hash(x, y) * 2)); } },
    maca(c, w, h) { rect(c, OUT, 0, 2, w, h - 4); rect(c, '#3f8a6a', 1, 3, w - 2, h - 8); rect(c, '#f1efe6', 2, 3, 8, h - 8); rect(c, '#9a9a9a', 2, h - 5, 2, 5); rect(c, '#9a9a9a', w - 4, h - 5, 2, 5); },
    leito(c, w, h) { rect(c, OUT, 0, 0, w, h); rect(c, '#cfd8dc', 1, 1, w - 2, h - 2); rect(c, '#ffffff', 2, 2, w - 4, 7); rect(c, '#7fb6ea', 2, 10, w - 4, h - 12); rect(c, '#5e98d8', 2, 10, w - 4, 1); },
    cadeiras(c, w) { for (let x = 0; x < w; x += 12) { rect(c, OUT, x, 0, 11, 12); rect(c, '#3a6ea8', x + 1, 1, 9, 6); rect(c, '#2a5a99', x + 1, 7, 9, 3); rect(c, '#3a3f4a', x + 2, 10, 2, 2); rect(c, '#3a3f4a', x + 7, 10, 2, 2); } },
    geladeira(c, w, h) { rect(c, OUT, 0, 0, w, h); rect(c, '#e8eef2', 1, 1, w - 2, h - 2); rect(c, '#9fd0f2', 3, 3, w - 6, h - 12); for (let i = 0; i < 3; i++) rect(c, '#f2c94c', 5 + i * 4, 6 + i * 3, 2, 4); rect(c, '#3a6ea8', 3, h - 7, w - 6, 3); },
    planta(c, w, h) { rect(c, OUT, w / 2 - 5, h - 8, 10, 8); rect(c, '#a7743f', w / 2 - 4, h - 7, 8, 6); blob(c, '#2f6b33', w / 2, h / 2 - 2, w / 2 - 1, h / 2 - 4); blob(c, '#5aa64c', w / 2 - 2, h / 2 - 4, w / 4, h / 5); },
    lousaParede(c, w, h) { rect(c, OUT, 0, 0, w, h); rect(c, '#6b4424', 1, 1, w - 2, h - 2); rect(c, '#2c4636', 3, 3, w - 6, h - 6); drawText(c, 'AULA', 6, 6, '#f2f6ea', { small: true }); rect(c, '#f2f6ea', 6, 13, w - 18, 1); rect(c, '#9fe0ff', 6, 16, w - 26, 1); },
    carteiras(c, w, h) { for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 20) { rect(c, OUT, x, y, 14, 9); rect(c, '#c99d64', x + 1, y + 1, 12, 5); rect(c, '#5a3a22', x + 2, y + 6, 2, 3); rect(c, '#5a3a22', x + 10, y + 6, 2, 3); } },
    boneco(c, w, h) { rect(c, '#5a3a22', w / 2 - 1, h - 14, 2, 14); blob(c, OUT, w / 2, 8, 7, 7); blob(c, '#d9a066', w / 2, 8, 6, 6); rect(c, '#c74b3c', w / 2 - 5, 7, 10, 2); rect(c, OUT, w / 2 - 6, 14, 12, 10); rect(c, '#f1efe6', w / 2 - 5, 15, 10, 8); rect(c, '#d63b3b', w / 2 - 1, 16, 2, 6); rect(c, '#d63b3b', w / 2 - 3, 18, 6, 2); },
    cadeiraRodas(c, w, h) { blob(c, OUT, 5, h - 5, 5, 5); blob(c, '#3a3f4a', 5, h - 5, 4, 4); rect(c, OUT, 2, 2, 12, h - 8); rect(c, '#3a6ea8', 3, 3, 10, h - 10); },
    vitrine(c, w, h) { rect(c, OUT, 0, 0, w, h); rect(c, '#e8eef2', 1, 1, w - 2, h - 2); for (let y = 3; y < h - 3; y += 6) { rect(c, '#9a9a9a', 2, y + 5, w - 4, 1); for (let x = 3; x < w - 3; x += 4) rect(c, ['#ffffff', '#f2c94c', '#3f8a3e', '#d63b3b'][(x + y) % 4], x, y + 1, 3, 4); } },
    tapeteSaida(c, w, h) { rect(c, '#8a2f4a', 0, 0, w, h); rect(c, '#e9b949', 2, 2, w - 4, 1); drawText(c, 'SAÍDA', w / 2 - 9, 5, '#ffe58a', { small: true }); },
  };

  /* ---------------- artes dos prédios (PNG recortados das artes aprovadas) ---------------- */
  const SPR = {}; const sprWaiters = [];
  // textos nítidos por cima das placas pequenas da arte reduzida
  const OVERLAY = {
    _hospital(c) { rect(c, OUT, 143, 44, 66, 12); rect(c, '#d63b3b', 144, 45, 64, 10); rect(c, '#f2675e', 144, 45, 64, 1); drawText(c, 'ANTONELLA', 150, 47, '#ffffff', { shadow: '#8a1f1a' }); },
    _ubs(c) { rect(c, '#1f4a32', 66, 52, 92, 9); drawText(c, 'UNIDADE BÁSICA DE SAÚDE', 67, 55, '#f6ecd7', { small: true }); },
  };
  // defs: { chave: { w, h } } com o tamanho no mundo; a imagem vem em alta definição (até 3×)
  function loadSprites(defs, base = 'assets/predios/') {
    Object.entries(defs).forEach(([k, d]) => {
      if (SPR[k]) return;
      SPR[k] = { ready: false, canvas: null, k: 1 };
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
        const kk = img.naturalWidth / (d.w || img.naturalWidth);
        if (OVERLAY[k]) { c.save(); c.scale(kk, kk); OVERLAY[k](c); c.restore(); }
        SPR[k].canvas = cv; SPR[k].k = kk; SPR[k].ready = true;
        sprWaiters.forEach((fn) => fn(k));
      };
      img.onerror = () => { SPR[k].failed = true; };
      img.src = `${base}${k}.png`;
    });
  }
  const sprite = (k) => (SPR[k]?.ready ? SPR[k].canvas : null);
  const spritesReady = (keys) => keys.every((k) => SPR[k]?.ready || SPR[k]?.failed);
  const onSprite = (fn) => sprWaiters.push(fn);

  const objCache = {};
  // reformas da UBS desenhadas por cima da arte aprovada
  const DECOR = {
    ubs(c, w, h, opts) {
      if (opts.reform) {
        for (let i = 0; i < 15; i++) { const x = 34 + i * 11; const y = 36 + Math.round(Math.abs(7 - i) * 0.6); rect(c, OUT, x, y, 6, 6); rect(c, ['#e8455a', '#ffd34d', '#3fa3e3', '#5cc04a'][i % 4], x + 1, y + 1, 4, 4); }
        rect(c, '#7a4a2a', 33, 37, 160, 1);
        rect(c, OUT, 84, 64, 56, 9); rect(c, '#e9b949', 85, 65, 54, 7); drawText(c, 'REFORMADA', 88, 66, '#4a2e1a', { small: true });
      }
      if (opts.flowers) [[30, 118], [60, 120], [150, 120], [178, 118]].forEach(([x, y]) => { rect(c, OUT, x - 1, y - 1, 22, 9); rect(c, '#9a5a32', x, y + 2, 20, 6); for (let i = 0; i < 9; i++) rect(c, ['#ff6fae', '#ffd34d', '#ffffff', '#c9a5f2'][i % 4], x + 1 + i * 2, y - 1 + (i % 2), 2, 2); });
    },
  };
  // objetos desenhados por fórmula ganham detalhe de verdade em alta resolução
  const HIRES = new Set(['arvore', 'arbusto', 'flores', 'canteiro', 'roseta', 'lirio', 'chafariz', 'pedra']);
  function objectCanvas(o, res = 1) {
    if (o.img) {
      const base = sprite(o.img);
      if (!base || !o.opts || !DECOR[o.img] || !(o.opts.reform || o.opts.flowers)) return base;
      const key = `img:${o.img}:${JSON.stringify(o.opts)}`;
      if (!objCache[key]) { const cv = document.createElement('canvas'); cv.width = base.width; cv.height = base.height; const c = cv.getContext('2d'); c.drawImage(base, 0, 0); const kk = SPR[o.img].k || 1; c.scale(kk, kk); DECOR[o.img](c, o.w, o.h, o.opts); objCache[key] = cv; }
      return objCache[key];
    }
    const k = res > 1 && HIRES.has(o.type) ? 2 : 1;
    const key = `${o.type}:${o.w}x${o.h}:${k}:${JSON.stringify(o.opts || {})}`;
    if (objCache[key]) return objCache[key];
    const cv = document.createElement('canvas'); cv.width = o.w * k; cv.height = o.h * k;
    const c = cv.getContext('2d');
    (DRAW[o.type] || (() => rect(c, '#ff00ff', 0, 0, o.w, o.h)))(c, o.w * k, o.h * k, o.opts || {});
    objCache[key] = cv;
    return cv;
  }
  function clearObjectCache() { for (const k of Object.keys(objCache)) delete objCache[k]; }

  window.PQTiles = { T, SOLID, tileCanvas, tileRes, objectCanvas, clearObjectCache, drawText, textWidth, hash, shade, rect, blob, loadSprites, sprite, spritesReady, onSprite };
})();
