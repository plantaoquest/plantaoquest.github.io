/*
 * Plantão Quest — arte em pixel desenhada por código (original).
 * Cenários em baixa resolução (320 × 180) ampliados com image-rendering: pixelated.
 */
(function art() {
  'use strict';

  const rect = (c, color, x, y, w, h) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
  const random = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  function blob(c, color, cx, cy, rx, ry) {
    for (let y = -ry; y <= ry; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      rect(c, color, cx - half, cy + y, half * 2, 1);
    }
  }

  /* ---------- Personagens (18 × 22) ---------- */
  function drawSprite(canvas, colors, lookingLeft, stride, extra) {
    if (!canvas) return;
    const pen = canvas.getContext('2d');
    pen.clearRect(0, 0, 18, 22);
    pen.save();
    if (lookingLeft) { pen.translate(18, 0); pen.scale(-1, 1); }
    const p = (color, x, y, w, h) => { pen.fillStyle = colors[color]; pen.fillRect(x, y, w, h); };
    pen.fillStyle = '#1e291d65';
    pen.fillRect(2, 19, 14, 3);
    p(0, 4, 3, 11, 10); p(0, 6, 1, 7, 2); p(0, 3, 12, 13, 7);
    p(1, 6, 2, 7, 2); p(1, 4, 4, 10, 4); p(2, 4, 6, 2, 6);
    p(3, 6, 7, 8, 5); p(4, 7, 7, 7, 4); p(5, 8, 7, 5, 2);
    p(2, 9, 8, 1, 2); p(2, 13, 8, 1, 2); p(4, 9, 11, 3, 2);
    p(6, 4, 13, 11, 5); p(7, 6, 13, 3, 4); p(7, 12, 13, 2, 3);
    p(8, 8, 16, 5, 3); p(9, 10, 13, 2, 4);
    p(0, 5, 18, 3, stride ? 2 : 3); p(0, 11, 18, 3, stride ? 3 : 2);
    p(3, 3, 16, 2, 2); p(4, 14, 16, 2, 2);
    if (extra === 'glasses') { pen.fillStyle = '#1b1b1b'; pen.fillRect(8, 8, 2, 1); pen.fillRect(12, 8, 2, 1); pen.fillRect(10, 8, 2, 1); }
    if (extra === 'sword') { pen.fillStyle = '#cfd8dc'; pen.fillRect(15, 8, 1, 8); pen.fillStyle = '#8d6e63'; pen.fillRect(14, 15, 3, 1); pen.fillRect(15, 16, 1, 2); }
    if (extra === 'rod') { pen.fillStyle = '#8d6e63'; pen.fillRect(15, 3, 1, 13); pen.fillStyle = '#e8e2d0'; pen.fillRect(16, 3, 1, 1); }
    if (extra === 'can') { pen.fillStyle = '#5b8fb9'; pen.fillRect(14, 13, 4, 4); pen.fillRect(17, 12, 1, 2); }
    pen.restore();
  }

  /* ---------- Monstros da gruta (32 × 32) ---------- */
  function drawMonster(canvas, kind, colors, frame = 0) {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 32, 32);
    const [dark, mid, light, accent] = colors;
    rect(c, '#00000055', 6, 28, 20, 3);
    if (kind === 'slime') {
      const h = frame ? 1 : 0;
      blob(c, dark, 16, 21 + h, 13, 9 - h);
      blob(c, mid, 16, 21 + h, 12, 8 - h);
      blob(c, light, 12, 17 + h, 4, 2);
      rect(c, accent, 10, 16 + h, 2, 1);
      rect(c, dark, 11, 21, 3, 4); rect(c, dark, 18, 21, 3, 4);
      rect(c, '#ffffff', 11, 21, 2, 2); rect(c, '#ffffff', 18, 21, 2, 2);
      rect(c, dark, 14, 26, 4, 1);
    } else if (kind === 'mosquito') {
      const w = frame ? 2 : 0;
      for (let i = 0; i < 3; i++) { rect(c, dark, 10 + i * 4, 19, 1, 8 - i); rect(c, dark, 9 + i * 4, 26 - i, 2, 1); }
      for (let i = 0; i < 6; i++) rect(c, i % 2 ? light : dark, 17 + i * 2, 14 + i, 3, 5);
      blob(c, dark, 13, 15, 5, 4);
      rect(c, mid, 11, 13, 3, 2);
      c.globalAlpha = 0.7;
      blob(c, light, 12, 8 + w, 4, 3); blob(c, light, 19, 7 + w, 6, 3);
      c.globalAlpha = 1;
      blob(c, mid, 6, 14, 3, 3);
      rect(c, accent, 4, 12, 3, 3);
      rect(c, '#ffffff', 5, 12, 1, 1);
      rect(c, dark, 0, 16, 4, 1);
    } else if (kind === 'cristal') {
      // Torrão de açúcar com coroa: o chefe do tema Diabetes.
      const b = frame ? 1 : 0;
      rect(c, dark, 6, 9 + b, 20, 19 - b);
      rect(c, mid, 7, 10 + b, 18, 17 - b);
      rect(c, light, 7, 10 + b, 18, 4);
      rect(c, light, 7, 10 + b, 3, 15 - b);
      for (let i = 0; i < 7; i++) rect(c, i % 2 ? light : '#ffffff', 9 + ((i * 5) % 15), 15 + b + ((i * 3) % 9), 1, 1);
      rect(c, accent, 9, 4 + b, 14, 3); rect(c, accent, 9, 2 + b, 2, 2); rect(c, accent, 15, 1 + b, 2, 3); rect(c, accent, 21, 2 + b, 2, 2);
      rect(c, '#ffffff', 16, 2 + b, 1, 1);
      rect(c, '#ffffff', 10, 16 + b, 4, 4); rect(c, '#ffffff', 18, 16 + b, 4, 4);
      rect(c, dark, 12, 17 + b, 2, 2); rect(c, dark, 20, 17 + b, 2, 2);
      rect(c, dark, 9, 14 + b, 5, 1); rect(c, dark, 18, 14 + b, 5, 1);
      rect(c, dark, 13, 23, 6, 1); rect(c, accent, 14, 24, 4, 1);
      rect(c, dark, 3, 18 + b, 3, 2); rect(c, dark, 26, 18 - b, 3, 2);
      if (frame) { rect(c, '#ffffff', 2, 8, 1, 3); rect(c, '#ffffff', 1, 9, 3, 1); rect(c, '#ffffff', 29, 12, 1, 3); rect(c, '#ffffff', 28, 13, 3, 1); }
    } else {
      const s = frame ? 1 : 0;
      rect(c, dark, 3, 11 - s, 26, 13);
      rect(c, dark, 5, 9 - s, 22, 17);
      rect(c, mid, 5, 11 - s, 22, 13);
      rect(c, mid, 7, 10 - s, 18, 15);
      rect(c, light, 8, 12 - s, 10, 2);
      for (let i = 0; i < 5; i++) rect(c, dark, 4 + i * 6, 25 - s + (i % 2), 1, 4);
      rect(c, '#ffffff', 10, 15 - s, 4, 4); rect(c, '#ffffff', 18, 15 - s, 4, 4);
      rect(c, dark, 12, 16 - s, 2, 2); rect(c, dark, 20, 16 - s, 2, 2);
      rect(c, dark, 9, 13 - s, 5, 1); rect(c, dark, 18, 13 - s, 5, 1);
      rect(c, accent, 13, 21 - s, 6, 1);
    }
  }

  /* ---------- Praça da Vila Murici (320 × 180) ---------- */
  function drawTree(c, x, y, r, fruit) {
    rect(c, '#5a3a22', x - 2, y, 4, 12);
    blob(c, '#2f6b33', x, y - 4, r + 1, r);
    blob(c, '#3f8a3e', x - 1, y - 5, r, r - 1);
    blob(c, '#5aa64c', x - 3, y - 7, r - 3, r - 4);
    if (fruit) for (let i = 0; i < 6; i++) rect(c, fruit, x - r + 2 + ((i * 7) % (r * 2 - 3)), y - r + 3 + ((i * 5) % (r + 2)), 2, 2);
  }
  function drawPalm(c, x, y) {
    rect(c, '#7a5a3a', x, y - 22, 3, 24);
    for (let i = 0; i < 5; i++) rect(c, '#6a4a2e', x, y - 20 + i * 5, 3, 1);
    const leaf = (dx, dy, len) => { for (let i = 0; i < len; i++) rect(c, '#2f7d3a', x + 1 + Math.round(dx * i), y - 23 + Math.round(dy * i), 3, 2); };
    leaf(1, 0.35, 12); leaf(-1, 0.35, 12); leaf(0.7, 0.7, 9); leaf(-0.7, 0.7, 9); leaf(0.2, -0.4, 6);
    rect(c, '#4a2a5a', x - 1, y - 21, 2, 2); rect(c, '#4a2a5a', x + 3, y - 20, 2, 2);
  }
  function windowAt(c, x, y, w, h, frame = '#e8e2d0') {
    rect(c, frame, x - 1, y - 1, w + 2, h + 2);
    rect(c, '#3a6ea8', x, y, w, h);
    rect(c, '#7fb6ea', x + 1, y + 1, Math.max(1, Math.floor(w / 2) - 1), Math.max(1, Math.floor(h / 2) - 1));
    rect(c, frame, x + Math.floor(w / 2), y, 1, h);
  }

  function drawPraca(canvas, opts = {}) {
    const c = canvas.getContext('2d');
    const r = random(7);
    // céu
    const sky = ['#5fb4ea', '#72c0ee', '#86cbf1', '#9bd6f4', '#b3e1f6'];
    sky.forEach((color, i) => rect(c, color, 0, i * 14, 320, 14));
    for (let i = 1; i < sky.length; i++) for (let x = (i % 2); x < 320; x += 2) rect(c, sky[i], x, i * 14 - 1, 1, 1);
    blob(c, '#fff6c8', 284, 18, 11, 11); blob(c, '#ffe58a', 284, 18, 8, 8);
    [[40, 16], [120, 10], [205, 22]].forEach(([x, y]) => { blob(c, '#ffffff', x, y, 14, 4); blob(c, '#ffffff', x + 8, y - 3, 8, 4); blob(c, '#e3f1fa', x, y + 3, 12, 2); });
    // morros e mata ao fundo
    for (let x = 0; x < 320; x++) {
      const h = 66 + Math.round(Math.sin(x / 23) * 4 + Math.sin(x / 9) * 2);
      rect(c, '#3d7a42', x, h, 1, 90 - h);
    }
    for (let x = 0; x < 320; x += 6) blob(c, '#336b39', x, 70 + (x % 4), 5, 4);
    // grama
    rect(c, '#6cae4b', 0, 76, 320, 104);
    for (let i = 0; i < 1400; i++) rect(c, r() > 0.5 ? '#5f9f42' : '#7cbd58', Math.floor(r() * 320), 76 + Math.floor(r() * 104), 1, 1);
    for (let i = 0; i < 70; i++) rect(c, ['#f7f1e3', '#ffd34d', '#f08bb4', '#c9a5f2'][i % 4], Math.floor(r() * 320), 118 + Math.floor(r() * 60), 1, 1);
    // caminhos
    const dirt = '#c99d64';
    rect(c, '#a87f4b', 0, 112, 320, 12); rect(c, dirt, 0, 113, 320, 10);
    rect(c, '#a87f4b', 146, 112, 28, 68); rect(c, dirt, 147, 112, 26, 68);
    rect(c, '#a87f4b', 44, 122, 14, 10); rect(c, dirt, 45, 122, 12, 10);
    rect(c, '#a87f4b', 262, 122, 22, 26); rect(c, dirt, 263, 122, 20, 26);
    for (let i = 0; i < 160; i++) rect(c, '#b88c55', Math.floor(r() * 320), 113 + Math.floor(r() * 10), 2, 1);
    for (let i = 0; i < 60; i++) rect(c, '#b88c55', 147 + Math.floor(r() * 26), 123 + Math.floor(r() * 56), 2, 1);

    // biblioteca
    rect(c, '#2a2a33', 16, 50, 88, 63);
    rect(c, '#efe3c4', 18, 52, 84, 60);
    rect(c, '#b7ae9b', 18, 104, 84, 8);
    for (let x = 18; x < 102; x += 6) rect(c, '#a39a88', x, 104, 1, 8);
    for (let i = 0; i < 16; i++) rect(c, i % 2 ? '#2d4a80' : '#3a5a96', 12 + i, 50 - Math.min(i, 15 - i), 96 - i * 2, 1);
    rect(c, '#243a66', 12, 50, 96, 2);
    for (let i = 0; i < 12; i++) rect(c, '#f6eedb', 60 - i * 2, 40 + i, i * 4 + 1, 1);
    rect(c, '#c74b3c', 57, 44, 6, 4); rect(c, '#ffffff', 59, 45, 2, 2);
    [26, 40, 74, 88].forEach((x) => { windowAt(c, x, 62, 8, 16); rect(c, '#d9ceb1', x - 1, 80, 10, 2); });
    [50, 68].forEach((x) => rect(c, '#ffffff', x, 54, 3, 50));
    rect(c, '#5a3420', 54, 86, 12, 18); rect(c, '#7a4a2e', 55, 87, 5, 17); rect(c, '#7a4a2e', 61, 87, 4, 17); rect(c, '#e0b04a', 59, 95, 1, 2);
    rect(c, '#a39a88', 50, 104, 20, 3); rect(c, '#bfb6a3', 48, 107, 24, 3);

    // posto de saúde (UBS)
    const wall = opts.fachada ? '#e6f4ee' : '#f4f1e8';
    const trim = opts.fachada ? '#2f8f7a' : '#7c8a86';
    rect(c, '#24302c', 120, 54, 80, 59);
    rect(c, wall, 122, 56, 76, 56);
    rect(c, trim, 122, 100, 76, 3);
    rect(c, opts.fachada ? '#bfe3d6' : '#d6d0c2', 122, 103, 76, 9);
    for (let i = 0; i < 14; i++) rect(c, i % 2 ? '#2a7a66' : '#33907a', 116 + i, 54 - i, 88 - i * 2, 1);
    rect(c, '#1f5a4c', 116, 54, 88, 2);
    for (let i = 0; i < 12; i++) rect(c, '#f7f3ea', 160 - i * 2, 30 + i, i * 4 + 1, 1);
    blob(c, '#ffffff', 160, 37, 5, 5); rect(c, '#d63b3b', 159, 33, 3, 9); rect(c, '#d63b3b', 156, 36, 9, 3);
    rect(c, opts.fachada ? '#d9a93a' : '#2f7d6b', 138, 60, 44, 8);
    rect(c, opts.fachada ? '#f4d27a' : '#4aa58c', 139, 61, 42, 1);
    [128, 140, 172, 184].forEach((x) => windowAt(c, x, 72, 9, 12, opts.fachada ? '#2f8f7a' : '#e8e2d0'));
    rect(c, '#3a6ea8', 152, 86, 16, 26); rect(c, '#9fd0f2', 153, 87, 6, 24); rect(c, '#9fd0f2', 161, 87, 6, 24); rect(c, '#e8e2d0', 159, 86, 2, 26);
    if (opts.floreiras) {
      [127, 139, 171, 183].forEach((x) => {
        rect(c, '#7a4a2e', x, 86, 12, 4);
        for (let i = 0; i < 6; i++) rect(c, ['#e8455a', '#ffd34d', '#f08bb4'][i % 3], x + 1 + i * 2, 84 + (i % 2), 2, 2);
        rect(c, '#3f8a3e', x + 1, 86, 10, 1);
      });
      [144, 176].forEach((x) => { rect(c, '#2a3a36', x, 92, 2, 20); rect(c, '#2a3a36', x - 2, 89, 6, 3); rect(c, '#ffe58a', x - 1, 90, 4, 2); });
    }

    // hospital (em obras)
    rect(c, '#2e3338', 220, 32, 90, 81);
    rect(c, '#e1e5e8', 222, 34, 86, 78);
    rect(c, '#2f8f7a', 222, 60, 86, 6);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) windowAt(c, 228 + i * 20, 40 + row * 32, 10, 12);
    rect(c, '#bfc6cb', 222, 104, 86, 8);
    rect(c, '#ffffff', 256, 36, 18, 18); rect(c, '#d63b3b', 263, 38, 4, 14); rect(c, '#d63b3b', 258, 43, 14, 4);
    rect(c, '#6b7378', 258, 90, 14, 22);
    for (let x = 218; x < 312; x += 14) rect(c, '#8a6a3e', x, 30, 2, 84);
    for (let y = 46; y < 112; y += 22) rect(c, '#8a6a3e', 216, y, 96, 2);
    for (let i = 0; i < 12; i++) rect(c, i % 2 ? '#f2f2f2' : '#f08a24', 244 + i * 4, 104, 4, 4);

    // horta e lago (canto inferior esquerdo)
    rect(c, '#7a5a3a', 8, 132, 72, 2); rect(c, '#7a5a3a', 8, 168, 72, 2);
    for (let x = 8; x <= 78; x += 7) rect(c, '#8a6a46', x, 130, 2, 40);
    rect(c, '#6b4a2f', 12, 136, 64, 30);
    for (let y = 138; y < 166; y += 6) { rect(c, '#5a3d26', 12, y, 64, 2); for (let x = 16; x < 74; x += 8) { rect(c, '#3f8a3e', x, y - 2, 3, 3); rect(c, ['#d9412b', '#f2c94c', '#b6d96a'][(x + y) % 3], x + 1, y - 3, 1, 1); } }
    blob(c, '#d9c08a', 106, 158, 22, 13);
    blob(c, '#2a5a99', 106, 158, 20, 11);
    blob(c, '#3d7cc9', 106, 157, 18, 9);
    for (let i = 0; i < 6; i++) rect(c, '#9fcdf2', 94 + i * 5, 153 + (i % 3) * 3, 3, 1);
    rect(c, '#8a6a46', 102, 140, 5, 12);

    // quadro de avisos (cronograma)
    rect(c, '#5a3a22', 190, 136, 2, 22); rect(c, '#5a3a22', 210, 136, 2, 22);
    rect(c, '#4a2e1c', 186, 128, 30, 18); rect(c, '#8a5a36', 187, 129, 28, 16);
    rect(c, '#f7f1e3', 189, 131, 8, 6); rect(c, '#ffe58a', 199, 131, 6, 5); rect(c, '#bfe3f6', 207, 132, 6, 6); rect(c, '#f7f1e3', 191, 138, 10, 5);
    rect(c, '#d63b3b', 192, 131, 1, 1); rect(c, '#d63b3b', 201, 131, 1, 1);

    // gruta velha (canto inferior direito)
    blob(c, '#3c3846', 276, 168, 42, 34);
    blob(c, '#57525f', 274, 166, 38, 30);
    blob(c, '#6b6574', 266, 158, 22, 16);
    for (let i = 0; i < 18; i++) blob(c, i % 2 ? '#7a7484' : '#4a4553', 244 + ((i * 13) % 64), 142 + ((i * 7) % 30), 3, 2);
    blob(c, '#121016', 274, 172, 12, 16);
    rect(c, '#121016', 262, 172, 24, 8);
    [258, 290].forEach((x) => { rect(c, '#5a3a22', x, 160, 2, 12); rect(c, '#f2a33a', x - 1, 156, 4, 4); rect(c, '#ffe58a', x, 157, 2, 2); });

    // árvores e enfeites
    drawTree(c, 112, 104, 9, '#f08a24');
    drawTree(c, 210, 104, 9, '#f08a24');
    drawPalm(c, 6, 110);
    drawPalm(c, 312, 128);
    drawTree(c, 230, 134, 7);
    [[124, 126], [196, 126]].forEach(([x, y]) => { rect(c, '#6b4a2f', x, y, 14, 3); rect(c, '#5a3a22', x + 1, y + 3, 2, 3); rect(c, '#5a3a22', x + 11, y + 3, 2, 3); });
    return canvas;
  }

  /* ---------- Vila Murici, mapa grande (640 × 360) ---------- */
  function shadeHex(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
  }
  function roof(c, x, y, w, h, color) {
    for (let i = 0; i < h; i++) {
      const inset = Math.floor(i * 0.0);
      rect(c, i % 3 === 2 ? shadeHex(color, -0.22) : i % 2 ? shadeHex(color, -0.08) : color, x - 4 + inset, y + i, w + 8 - inset * 2, 1);
    }
    rect(c, shadeHex(color, -0.4), x - 4, y + h, w + 8, 2);
    for (let i = 0; i < w + 8; i += 6) rect(c, shadeHex(color, -0.3), x - 4 + i, y, 1, h);
  }
  function gable(c, cx, y, half, color) {
    for (let i = 0; i < half; i++) rect(c, i % 2 ? color : shadeHex(color, -0.08), cx - i * 2, y + i, i * 4 + 1, 1);
  }
  function house(c, x, y, w, h, wall, roofColor, opts = {}) {
    rect(c, '#1a1622', x - 1, y - 1, w + 2, h + 2);
    rect(c, wall, x, y, w, h);
    for (let yy = y + 3; yy < y + h; yy += 4) rect(c, shadeHex(wall, -0.06), x, yy, w, 1);
    rect(c, shadeHex(wall, -0.18), x + w - 3, y, 3, h);
    roof(c, x, y - 14, w, 12, roofColor);
    if (opts.chimney) { rect(c, '#1a1622', x + w - 14, y - 22, 8, 10); rect(c, '#9a5a3a', x + w - 13, y - 21, 6, 9); }
    const dx = x + Math.floor(w / 2) - 4;
    rect(c, '#3a2414', dx, y + h - 14, 9, 14); rect(c, '#7a4a2e', dx + 1, y + h - 13, 7, 13); rect(c, '#e0b04a', dx + 6, y + h - 7, 1, 1);
    [[x + 5, y + 6], [x + w - 15, y + 6]].forEach(([wx, wy]) => {
      rect(c, '#1a1622', wx - 1, wy - 1, 12, 10); rect(c, '#3a6ea8', wx, wy, 10, 8); rect(c, '#9fd0f2', wx + 1, wy + 1, 4, 3); rect(c, '#f1efe6', wx + 5, wy, 1, 8); rect(c, '#f1efe6', wx, wy + 4, 10, 1);
      rect(c, '#8a5a36', wx - 1, wy + 9, 12, 2);
      if (opts.flowers) for (let i = 0; i < 5; i++) rect(c, ['#e8455a', '#ffd34d', '#f08bb4'][i % 3], wx + i * 2, wy + 8, 1, 1);
    });
  }
  function ipe(c, x, y, r) {
    rect(c, '#5a3a22', x - 2, y - 4, 4, 16); rect(c, '#4a2e1a', x - 2, y - 4, 1, 16);
    blob(c, '#8a2f6a', x, y - 8, r + 1, r);
    blob(c, '#c94f9a', x - 1, y - 9, r, r - 1);
    blob(c, '#f08bc4', x - 3, y - 11, r - 3, r - 4);
    for (let i = 0; i < 10; i++) rect(c, '#ffd0e8', x - r + 2 + ((i * 7) % (r * 2 - 3)), y - r - 4 + ((i * 5) % (r + 2)), 1, 1);
  }
  function lamp(c, x, y) { rect(c, '#1a1622', x - 1, y - 18, 3, 18); rect(c, '#2a3a36', x, y - 18, 1, 18); rect(c, '#1a1622', x - 3, y - 23, 7, 6); rect(c, '#ffe58a', x - 2, y - 22, 5, 4); rect(c, '#2a3a36', x - 3, y, 7, 2); }
  function bench(c, x, y) { rect(c, '#1a1622', x - 1, y - 1, 18, 6); rect(c, '#8a5a36', x, y, 16, 2); rect(c, '#a7743f', x, y, 16, 1); rect(c, '#6b4424', x, y + 3, 16, 1); rect(c, '#3a2414', x + 1, y + 4, 2, 3); rect(c, '#3a2414', x + 13, y + 4, 2, 3); }
  function flowerBed(c, x, y, w, h, r) {
    rect(c, '#1a1622', x - 1, y - 1, w + 2, h + 2); rect(c, '#b9ae95', x, y, w, h); rect(c, '#5a3d26', x + 1, y + 1, w - 2, h - 2);
    for (let i = 0; i < (w * h) / 6; i++) { const fx = x + 2 + Math.floor(r() * (w - 4)); const fy = y + 2 + Math.floor(r() * (h - 4)); rect(c, '#3f8a3e', fx, fy, 2, 2); rect(c, ['#e8455a', '#ffd34d', '#f08bb4', '#ffffff', '#c9a5f2'][i % 5], fx, fy, 1, 1); }
  }
  function crate(c, x, y, fruit) { rect(c, '#1a1622', x - 1, y - 1, 12, 9); rect(c, '#a7743f', x, y, 10, 7); rect(c, '#8a5a36', x, y + 3, 10, 1); for (let i = 0; i < 4; i++) rect(c, fruit, x + 1 + i * 2, y - 2 + (i % 2), 2, 2); }

  function drawVila(canvas, opts = {}) {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 640, 360);
    const r = random(19);
    // céu e morros
    ['#5fb4ea', '#6cbbec', '#7ac3ee', '#89cbf1', '#9bd5f4', '#b0def6'].forEach((col, i) => rect(c, col, 0, i * 8, 640, 8));
    blob(c, '#fff6c8', 590, 16, 11, 11); blob(c, '#ffe58a', 590, 16, 8, 8);
    for (let x = 0; x < 640; x++) { const h = 30 + Math.round(Math.sin(x / 31) * 5 + Math.sin(x / 11) * 2); rect(c, '#4f8f5a', x, h, 1, 60 - h); }
    for (let x = 0; x < 640; x += 7) { blob(c, '#336b39', x, 46 + (x % 5), 6, 5); blob(c, '#3f7a42', x + 3, 44 + (x % 3), 4, 3); }
    // grama
    rect(c, '#6cae4b', 0, 52, 640, 308);
    for (let i = 0; i < 5200; i++) rect(c, r() > 0.5 ? '#5f9f42' : '#7cbd58', Math.floor(r() * 640), 52 + Math.floor(r() * 308), 1, 1);
    for (let i = 0; i < 260; i++) { const fx = Math.floor(r() * 640); const fy = 145 + Math.floor(r() * 180); rect(c, '#4f8f3a', fx, fy + 1, 1, 2); rect(c, ['#f7f1e3', '#ffd34d', '#f08bb4', '#c9a5f2'][i % 4], fx, fy, 1, 1); }
    for (let i = 0; i < 90; i++) { const tx = Math.floor(r() * 640); const ty = 150 + Math.floor(r() * 175); rect(c, '#4f8f3a', tx, ty, 1, 3); rect(c, '#4f8f3a', tx + 2, ty + 1, 1, 2); rect(c, '#5f9f42', tx + 1, ty - 1, 1, 4); }
    // rio ao sul
    rect(c, '#d9c08a', 0, 326, 640, 6); for (let x = 0; x < 640; x += 3) rect(c, '#c9ad72', x, 326 + (x % 2), 2, 1);
    rect(c, '#2a5a99', 0, 331, 640, 29); rect(c, '#3d7cc9', 0, 333, 640, 27);
    for (let i = 0; i < 120; i++) rect(c, r() > 0.5 ? '#5e98d8' : '#2f68b0', Math.floor(r() * 636), 335 + Math.floor(r() * 23), 4, 1);
    // estrada principal de pedras
    rect(c, '#8a7a62', 0, 128, 640, 16);
    for (let y = 129; y < 143; y += 4) for (let x = (y % 8) ? 0 : 4; x < 640; x += 8) { rect(c, '#b8a888', x, y, 7, 3); rect(c, '#cfc1a2', x, y, 6, 1); }
    // caminhos de terra
    const dirt = (x, y, w, h) => { rect(c, '#a87f4b', x, y, w, h); rect(c, '#c99d64', x + 1, y + 1, w - 2, h - 2); for (let i = 0; i < (w * h) / 30; i++) rect(c, '#b88c55', x + 1 + Math.floor(r() * (w - 3)), y + 1 + Math.floor(r() * (h - 3)), 2, 1); };
    dirt(312, 144, 16, 186); dirt(80, 144, 14, 118); dirt(540, 144, 14, 150); dirt(94, 240, 220, 12); dirt(328, 240, 214, 12);
    // praça central
    blob(c, '#8a7a62', 320, 196, 74, 46); blob(c, '#b8a888', 320, 196, 72, 44);
    for (let y = 154; y < 240; y += 5) for (let x = 250; x < 392; x += 7) rect(c, '#a69a7e', x + ((y / 5) % 2) * 3, y, 1, 1);
    blob(c, '#cfc1a2', 320, 196, 30, 19);
    // chafariz
    blob(c, '#1a1622', 320, 198, 24, 14); blob(c, '#9a948a', 320, 197, 23, 13); blob(c, '#7a746a', 320, 199, 21, 11);
    blob(c, '#2f68b0', 320, 197, 19, 10); blob(c, '#3d7cc9', 320, 196, 18, 9);
    rect(c, '#1a1622', 317, 180, 7, 18); rect(c, '#b5afa3', 318, 181, 5, 16); rect(c, '#1a1622', 314, 179, 13, 3); rect(c, '#cfc9bd', 315, 179, 11, 2);
    flowerBed(c, 252, 160, 24, 12, r); flowerBed(c, 364, 160, 24, 12, r); flowerBed(c, 252, 222, 24, 12, r); flowerBed(c, 364, 222, 24, 12, r);
    bench(c, 284, 230); bench(c, 340, 230); bench(c, 284, 158); bench(c, 340, 158);
    // biblioteca
    rect(c, '#1a1622', 38, 60, 114, 70);
    rect(c, '#efe3c4', 40, 62, 110, 66);
    for (let yy = 66; yy < 118; yy += 5) rect(c, '#e3d5b1', 40, yy, 110, 1);
    rect(c, '#b7ae9b', 40, 118, 110, 10); for (let x = 40; x < 150; x += 7) rect(c, '#a39a88', x, 118, 1, 10);
    roof(c, 40, 46, 110, 14, '#34508a');
    gable(c, 95, 34, 14, '#f6eedb'); rect(c, '#c74b3c', 91, 40, 8, 6); rect(c, '#ffffff', 93, 41, 4, 4); rect(c, '#c74b3c', 94, 42, 2, 2);
    [48, 64, 116, 132].forEach((x) => { windowAt(c, x, 74, 10, 22); rect(c, '#d9ceb1', x - 2, 97, 14, 2); });
    [80, 106].forEach((x) => { rect(c, '#1a1622', x - 1, 62, 6, 56); rect(c, '#ffffff', x, 62, 4, 56); rect(c, '#d9d4c6', x + 3, 62, 1, 56); });
    rect(c, '#1a1622', 88, 98, 15, 22); rect(c, '#5a3420', 89, 99, 13, 21); rect(c, '#7a4a2e', 90, 100, 5, 20); rect(c, '#7a4a2e', 96, 100, 5, 20); rect(c, '#e0b04a', 94, 109, 1, 2);
    rect(c, '#bfb6a3', 84, 120, 24, 3); rect(c, '#d0c7b4', 82, 123, 28, 3);
    rect(c, '#2a1d0e', 70, 66, 50, 9); rect(c, '#efe3c4', 71, 67, 48, 7); for (let i = 0; i < 8; i++) rect(c, '#2a1d0e', 75 + i * 5, 69, 3, 3);
    // posto de saúde
    const wall = opts.fachada ? '#e6f4ee' : '#f4f1e8';
    rect(c, '#1a1622', 260, 58, 120, 72);
    rect(c, wall, 262, 60, 116, 68);
    for (let yy = 64; yy < 116; yy += 4) rect(c, shadeHex(wall, -0.04), 262, yy, 116, 1);
    rect(c, opts.fachada ? '#2f8f7a' : '#8a9a96', 262, 112, 116, 3);
    rect(c, opts.fachada ? '#bfe3d6' : '#d6d0c2', 262, 115, 116, 13);
    roof(c, 262, 44, 116, 14, '#2f7d6b');
    gable(c, 320, 26, 18, '#f7f3ea');
    blob(c, '#1a1622', 320, 36, 7, 7); blob(c, '#ffffff', 320, 36, 6, 6); rect(c, '#d63b3b', 318, 31, 4, 11); rect(c, '#d63b3b', 315, 34, 11, 4);
    rect(c, '#1a1622', 290, 63, 60, 12); rect(c, opts.fachada ? '#d9a93a' : '#2f7d6b', 291, 64, 58, 10); rect(c, opts.fachada ? '#f4d27a' : '#4aa58c', 292, 65, 56, 1);
    for (let i = 0; i < 11; i++) rect(c, '#ffffff', 295 + i * 5, 68, 3, 3);
    [270, 290, 336, 356].forEach((x) => windowAt(c, x, 80, 13, 16, opts.fachada ? '#2f8f7a' : '#e8e2d0'));
    rect(c, '#1a1622', 306, 92, 29, 36); rect(c, '#3a6ea8', 307, 93, 27, 35); rect(c, '#9fd0f2', 308, 94, 12, 33); rect(c, '#9fd0f2', 321, 94, 12, 33); rect(c, '#e8e2d0', 319, 93, 3, 35);
    rect(c, '#2f7d6b', 302, 88, 37, 4); rect(c, '#1a1622', 302, 92, 37, 1);
    if (opts.floreiras) {
      [268, 288, 334, 354].forEach((x) => { rect(c, '#1a1622', x - 1, 98, 19, 6); rect(c, '#7a4a2e', x, 99, 17, 4); for (let i = 0; i < 8; i++) rect(c, ['#e8455a', '#ffd34d', '#f08bb4'][i % 3], x + 1 + i * 2, 96 + (i % 2), 2, 2); rect(c, '#3f8a3e', x + 1, 99, 15, 1); });
      lamp(c, 298, 128); lamp(c, 343, 128);
    }
    rect(c, '#5a3a22', 386, 40, 2, 88); rect(c, '#1a1622', 385, 126, 4, 3);
    // hospital em obras
    rect(c, '#1a1622', 466, 38, 140, 92);
    rect(c, '#e1e5e8', 468, 40, 136, 88);
    rect(c, '#2f8f7a', 468, 70, 136, 7);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) windowAt(c, 476 + i * 22, 47 + row * 36, 11, 14);
    rect(c, '#1a1622', 523, 39, 26, 22); rect(c, '#ffffff', 524, 40, 24, 20); rect(c, '#d63b3b', 533, 42, 6, 16); rect(c, '#d63b3b', 528, 47, 16, 6);
    rect(c, '#6b7378', 524, 102, 24, 26);
    for (let x = 462; x < 612; x += 16) rect(c, '#8a6a3e', x, 34, 2, 96);
    for (let y = 52; y < 128; y += 24) rect(c, '#8a6a3e', 460, y, 152, 2);
    for (let i = 0; i < 18; i++) rect(c, i % 2 ? '#f2f2f2' : '#f08a24', 500 + i * 4, 120, 4, 5);
    [[478, 136], [596, 136]].forEach(([x, y]) => { rect(c, '#1a1622', x - 3, y - 9, 7, 10); rect(c, '#f08a24', x - 2, y - 8, 5, 8); rect(c, '#ffffff', x - 2, y - 5, 5, 2); });
    rect(c, '#e9b949', 612, 20, 3, 110); rect(c, '#e9b949', 560, 20, 55, 3); rect(c, '#1a1622', 568, 23, 1, 30); rect(c, '#8a8a8a', 564, 52, 9, 5);
    // quitanda da Dona Rita
    house(c, 30, 172, 84, 56, '#f1e4c8', '#c94f3d');
    for (let i = 0; i < 12; i++) rect(c, i % 2 ? '#ffffff' : '#e8455a', 26 + i * 8, 186, 8, 8);
    rect(c, '#1a1622', 26, 194, 96, 1);
    crate(c, 34, 220, '#4a2a5a'); crate(c, 50, 220, '#f2c94c'); crate(c, 92, 220, '#9a6a2a'); crate(c, 106, 222, '#d9412b');
    rect(c, '#1a1622', 50, 162, 44, 10); rect(c, '#3f8a3e', 51, 163, 42, 8); for (let i = 0; i < 7; i++) rect(c, '#ffe58a', 55 + i * 5, 166, 3, 2);
    // casas
    house(c, 140, 178, 62, 50, '#f3e2b0', '#3a6ea8', { chimney: true, flowers: true });
    house(c, 438, 176, 64, 52, '#f6d9c4', '#c96a3a', { chimney: true, flowers: true });
    house(c, 526, 180, 70, 48, '#dfe9d2', '#3f8a6a', { flowers: true });
    for (let x = 436; x < 600; x += 6) { rect(c, '#1a1622', x, 233, 2, 8); rect(c, '#f1efe6', x, 234, 2, 6); }
    rect(c, '#f1efe6', 436, 236, 164, 1);
    // horta
    rect(c, '#1a1622', 26, 264, 112, 56);
    rect(c, '#6b4a2f', 28, 266, 108, 52);
    for (let y = 270; y < 318; y += 8) { rect(c, '#5a3d26', 28, y, 108, 2); for (let x = 32; x < 134; x += 10) { rect(c, '#3f8a3e', x, y - 3, 4, 4); rect(c, '#5aa64c', x + 1, y - 4, 2, 1); rect(c, ['#d9412b', '#f2c94c', '#b6d96a', '#f08a24'][(x + y) % 4], x + 1, y - 2, 1, 1); } }
    for (let x = 24; x <= 140; x += 7) rect(c, '#8a6a46', x, 260, 2, 62);
    rect(c, '#7a5a3a', 24, 262, 118, 2); rect(c, '#7a5a3a', 24, 320, 118, 2);
    rect(c, '#8a6a46', 148, 280, 2, 22); rect(c, '#8a6a46', 141, 286, 16, 2); rect(c, '#d9a066', 145, 274, 8, 7); rect(c, '#c74b3c', 143, 272, 12, 3); rect(c, '#3a6ea8', 144, 287, 10, 10);
    // lago
    blob(c, '#d9c08a', 190, 296, 30, 20); blob(c, '#2a5a99', 190, 296, 28, 18); blob(c, '#3d7cc9', 190, 295, 26, 16);
    [[178, 290], [200, 300], [188, 302]].forEach(([x, y]) => { blob(c, '#3f8a3e', x, y, 4, 2); rect(c, '#f08bb4', x, y - 1, 1, 1); });
    rect(c, '#1a1622', 208, 286, 16, 8); for (let i = 0; i < 4; i++) rect(c, '#9a7448', 209 + i * 4, 287, 3, 6);
    // gruta velha
    blob(c, '#3c3846', 556, 296, 76, 50); blob(c, '#57525f', 554, 294, 72, 46); blob(c, '#6b6574', 540, 282, 40, 26);
    for (let i = 0; i < 30; i++) blob(c, i % 2 ? '#7a7484' : '#4a4553', 492 + ((i * 17) % 124), 258 + ((i * 11) % 60), 4, 3);
    blob(c, '#121016', 548, 312, 16, 18); rect(c, '#121016', 532, 312, 32, 14);
    rect(c, '#2a1d0e', 524, 276, 48, 10); rect(c, '#8a5a36', 525, 277, 46, 8); for (let i = 0; i < 6; i++) rect(c, '#ffe58a', 529 + i * 7, 280, 4, 2);
    [532, 566].forEach((x) => { rect(c, '#5a3a22', x, 296, 3, 16); });
    // píer e canoa
    rect(c, '#1a1622', 309, 322, 22, 30); for (let y = 323; y < 352; y += 4) { rect(c, '#9a7448', 310, y, 20, 3); rect(c, '#b88c55', 310, y, 20, 1); }
    // árvores
    [[20, 150, 9], [222, 150, 8], [420, 152, 8], [620, 160, 9], [240, 290, 9], [420, 290, 10], [460, 316, 7]].forEach(([x, y, rr]) => drawTree(c, x, y, rr, '#f08a24'));
    [[170, 150], [460, 148], [618, 250]].forEach(([x, y]) => ipe(c, x, y, 10));
    [[8, 130], [212, 128], [632, 130], [370, 300], [258, 318]].forEach(([x, y]) => drawPalm(c, x, y));
    [[176, 130], [240, 130], [400, 130], [452, 130], [250, 252], [390, 252]].forEach(([x, y]) => lamp(c, x, y));
    // quadro de avisos
    rect(c, '#5a3a22', 252, 152, 2, 22); rect(c, '#5a3a22', 272, 152, 2, 22);
    rect(c, '#1a1622', 247, 140, 32, 20); rect(c, '#8a5a36', 248, 141, 30, 18);
    rect(c, '#f7f1e3', 250, 143, 9, 7); rect(c, '#ffe58a', 261, 143, 7, 6); rect(c, '#bfe3f6', 270, 144, 6, 7); rect(c, '#f7f1e3', 252, 151, 12, 6);
    rect(c, '#d63b3b', 253, 143, 1, 1); rect(c, '#d63b3b', 263, 143, 1, 1);
    return canvas;
  }

  /* camada animada da vila: nuvens, água, fumaça, bandeira, pássaros, borboletas e tochas */
  function drawVilaFx(canvas, t, opts = {}) {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 640, 360);
    const k = t / 1000;
    [[60, 14, 0.9], [250, 8, 0.6], [430, 20, 0.75]].forEach(([x0, y, sp]) => {
      const x = ((x0 + k * 6 * sp) % 720) - 60;
      blob(c, '#ffffff', x, y, 16, 4); blob(c, '#ffffff', x + 9, y - 3, 9, 4); blob(c, '#e3f1fa', x, y + 3, 14, 2);
    });
    for (let i = 0; i < 3; i++) { const bx = ((k * 22 + i * 140) % 760) - 60; const by = 22 + i * 6 + Math.sin(k * 3 + i) * 3; const w = Math.floor(k * 6 + i) % 2; rect(c, '#2a2a33', bx, by, 2, 1); rect(c, '#2a2a33', bx + 2, by + (w ? 1 : -1), 2, 1); rect(c, '#2a2a33', bx - 2, by + (w ? 1 : -1), 2, 1); }
    const f = Math.floor(k * 8);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + k * 2; const rr = 6 + ((f + i) % 4) * 3; rect(c, '#bfe3f6', 320 + Math.cos(a) * rr * 1.6, 194 + Math.sin(a) * rr * 0.7, 1, 1); }
    for (let i = 0; i < 4; i++) { const h = ((f * 2 + i * 5) % 14); rect(c, '#e3f1fa', 319 + (i % 2) * 2, 178 - h, 1, 2); }
    for (let i = 0; i < 18; i++) { const x = (i * 37 + Math.floor(k * 10) * 3) % 640; rect(c, '#9fcdf2', x, 336 + (i * 7) % 20, 3, 1); }
    rect(c, '#1a1622', 410 + Math.sin(k * 1.5) * 4, 342 + Math.sin(k * 2) * 1, 30, 5); rect(c, '#8a5a36', 411 + Math.sin(k * 1.5) * 4, 342 + Math.sin(k * 2) * 1, 28, 3);
    for (let i = 0; i < 4; i++) { const rx = 176 + ((i * 9 + f) % 26); rect(c, '#9fcdf2', rx, 290 + (i * 5) % 12, 2, 1); }
    [[196, 158], [496, 156]].forEach(([x, y], j) => { for (let i = 0; i < 3; i++) { const ph = ((k * 0.8 + i / 3 + j * 0.2) % 1); blob(c, `rgba(230,230,235,${0.75 - ph * 0.7})`, x + ph * 6 + Math.sin(ph * 6) * 2, y - ph * 22, 2 + Math.floor(ph * 3), 2 + Math.floor(ph * 2)); } });
    const wave = (i) => Math.round(Math.sin(k * 6 - i * 0.6) * 1.5);
    for (let i = 0; i < 14; i++) { rect(c, opts.fachada ? '#e9b949' : '#2f8f7a', 388 + i, 41 + wave(i), 1, 9); rect(c, '#ffffff', 388 + i, 44 + wave(i), 1, 3); }
    for (let i = 0; i < 3; i++) { const bx = 250 + i * 60 + Math.sin(k * 2 + i) * 14; const by = 165 + i * 20 + Math.cos(k * 3 + i) * 6; const w = Math.floor(k * 10 + i) % 2; rect(c, ['#ffd34d', '#f08bb4', '#ffffff'][i], bx, by, 1, 1); rect(c, ['#ffd34d', '#f08bb4', '#ffffff'][i], bx - 1, by - w, 1, 1); rect(c, ['#ffd34d', '#f08bb4', '#ffffff'][i], bx + 1, by - w, 1, 1); }
    [532, 566].forEach((x, i) => { const fl = (f + i) % 3; rect(c, '#f2a33a', x - 1, 290 - fl, 5, 6 + fl); rect(c, '#ffe58a', x, 292 - fl, 3, 3); });
  }

  /* ---------- Horta e lago ao pôr do sol (320 × 180) ---------- */
  const CROPS = [
    { name: 'Pimenta-de-cheiro', fruit: '#d9412b' },
    { name: 'Jambu', fruit: '#f2c94c' },
    { name: 'Maxixe', fruit: '#b6d96a' },
    { name: 'Abóbora', fruit: '#f08a24' },
  ];
  const PLOTS = [{ x: 22, y: 50 }, { x: 84, y: 50 }, { x: 22, y: 104 }, { x: 84, y: 104 }];

  function drawPlant(c, x, y, stage, fruit) {
    for (let i = 0; i < 4; i++) {
      const px = x + 6 + i * 12;
      for (let row = 0; row < 2; row++) {
        const py = y + 10 + row * 16;
        if (stage === 0) { rect(c, '#3d2a18', px + 1, py + 2, 3, 2); rect(c, '#e8d3a2', px + 2, py + 2, 1, 1); }
        if (stage >= 1) { rect(c, '#3f8a3e', px + 2, py, 1, 4); rect(c, '#5aa64c', px, py + 1, 2, 1); rect(c, '#5aa64c', px + 3, py, 2, 1); }
        if (stage >= 2) { rect(c, '#2f6b33', px - 1, py - 3, 7, 4); rect(c, '#5aa64c', px, py - 4, 5, 3); rect(c, '#7cc45e', px + 1, py - 4, 2, 1); }
        if (stage >= 3) { rect(c, fruit, px, py - 2, 2, 2); rect(c, fruit, px + 3, py - 3, 2, 2); rect(c, '#ffffff99', px, py - 2, 1, 1); }
      }
    }
  }

  function drawHorta(canvas, plots = []) {
    const c = canvas.getContext('2d');
    const r = random(11);
    rect(c, '#7aa54a', 0, 0, 320, 180);
    for (let i = 0; i < 1500; i++) rect(c, r() > 0.5 ? '#6b9442' : '#8bb758', Math.floor(r() * 320), Math.floor(r() * 180), 1, 1);
    for (let i = 0; i < 60; i++) rect(c, ['#f7f1e3', '#ffd34d', '#f08bb4'][i % 3], Math.floor(r() * 320), Math.floor(r() * 180), 1, 1);
    // cerca da horta
    rect(c, '#6b4a2f', 12, 40, 136, 2); rect(c, '#6b4a2f', 12, 152, 136, 2);
    for (let x = 12; x <= 146; x += 8) { rect(c, '#8a6a46', x, 36, 3, 6); rect(c, '#8a6a46', x, 150, 3, 6); }
    for (let y = 40; y <= 152; y += 8) { rect(c, '#8a6a46', 10, y, 3, 4); rect(c, '#8a6a46', 146, y, 3, 4); }
    PLOTS.forEach((p, i) => {
      rect(c, '#4a3220', p.x - 1, p.y - 1, 54, 42);
      rect(c, '#6b4a2f', p.x, p.y, 52, 40);
      for (let y = p.y + 4; y < p.y + 40; y += 8) rect(c, '#5a3d26', p.x, y, 52, 2);
      drawPlant(c, p.x, p.y, plots[i]?.stage || 0, CROPS[i].fruit);
    });
    // espantalho
    rect(c, '#8a6a46', 154, 92, 2, 26); rect(c, '#8a6a46', 146, 98, 18, 2);
    rect(c, '#d9a066', 151, 86, 8, 7); rect(c, '#c74b3c', 149, 84, 12, 3); rect(c, '#3a6ea8', 150, 98, 10, 10);
    // lago
    const lake = [[244, 86, 52, 40], [222, 110, 30, 26], [270, 64, 26, 18], [258, 128, 34, 20]];
    lake.forEach(([x, y, rx, ry]) => blob(c, '#d9c08a', x, y, rx + 3, ry + 3));
    lake.forEach(([x, y, rx, ry]) => blob(c, '#2a5a99', x, y, rx + 1, ry + 1));
    lake.forEach(([x, y, rx, ry]) => blob(c, '#3d7cc9', x, y, rx, ry));
    for (let i = 0; i < 40; i++) rect(c, r() > 0.5 ? '#5e98d8' : '#2f68b0', 210 + Math.floor(r() * 86), 60 + Math.floor(r() * 80), 3, 1);
    [[230, 76], [262, 100], [286, 74]].forEach(([x, y]) => { blob(c, '#3f8a3e', x, y, 4, 2); rect(c, '#f08bb4', x, y - 1, 1, 1); });
    // píer
    rect(c, '#4a3220', 205, 118, 18, 62);
    for (let y = 120; y < 180; y += 5) { rect(c, '#9a7448', 206, y, 16, 4); rect(c, '#b88c55', 206, y, 16, 1); }
    // árvores, pedras e cesto
    drawTree(c, 176, 42, 13);
    drawTree(c, 304, 160, 10);
    blob(c, '#7a7484', 300, 30, 8, 5); blob(c, '#948e9c', 298, 28, 5, 3);
    rect(c, '#8a5a36', 166, 150, 14, 9); rect(c, '#a7743f', 167, 151, 12, 2); rect(c, '#6b4424', 170, 147, 6, 3);
    // luz de fim de tarde
    c.fillStyle = 'rgba(255, 140, 70, 0.16)';
    c.fillRect(0, 0, 320, 180);
    c.fillStyle = 'rgba(120, 40, 110, 0.10)';
    c.fillRect(0, 0, 320, 40);
  }

  /* ---------- Gruta Velha (320 × 150) ---------- */
  function drawGruta(canvas) {
    const c = canvas.getContext('2d');
    const r = random(23);
    rect(c, '#1a1720', 0, 0, 320, 150);
    for (let y = 0; y < 96; y += 8) for (let x = (y / 8) % 2 ? -10 : 0; x < 320; x += 20) { rect(c, '#2a2532', x + 1, y + 1, 18, 6); rect(c, '#332d3d', x + 2, y + 1, 10, 2); }
    for (let i = 0; i < 18; i++) { const x = Math.floor(r() * 320); const h = 6 + Math.floor(r() * 14); for (let k = 0; k < h; k++) rect(c, '#3a3444', x + Math.floor(k / 4), k, Math.max(1, 5 - Math.floor(k / 3)), 1); }
    rect(c, '#2e2836', 0, 96, 320, 54);
    for (let i = 0; i < 500; i++) rect(c, r() > 0.5 ? '#3a3444' : '#262130', Math.floor(r() * 320), 96 + Math.floor(r() * 54), 2, 1);
    for (let i = 0; i < 10; i++) blob(c, '#443d4e', Math.floor(r() * 320), 110 + Math.floor(r() * 36), 4, 2);
    rect(c, '#0f0d13', 0, 94, 320, 2);
    [40, 280].forEach((x) => {
      rect(c, '#5a3a22', x, 58, 3, 18); rect(c, '#3a2614', x - 2, 74, 7, 3);
    });
  }

  window.PQArt = { drawSprite, drawMonster, drawPraca, drawVila, drawVilaFx, drawHorta, drawGruta, CROPS, PLOTS };
})();
