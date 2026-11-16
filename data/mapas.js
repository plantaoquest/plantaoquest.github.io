/*
 * Plantão Quest — mapas do mundo (dados separados do motor).
 * Vila Murici: 96 × 64 tiles de 16 px (1536 × 1024 px). Interiores menores, cada um com saída para a porta de origem.
 *
 * Tiles: 0 grama, 1 grama florida, 2 terra, 3 calçamento, 4 praça, 5 água, 6 areia, 7 canteiro, 8 ponte, 9 rocha,
 * 10 grama alta, 11 madeira, 12 piso claro, 13 parede, 14 tapete, 15 mata, 16 cachoeira, 17 cerca viva, 18 pedra, 19 borda de parede
 */
(function mapas() {
  'use strict';
  const T = 16;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function makeMap(id, name, w, h, base) { return { id, name, w, h, tiles: new Array(w * h).fill(base), objects: [], doors: [], spots: [], regions: [], npcs: [], lights: [] }; }
  const inside = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h;
  const set = (m, x, y, t) => { if (inside(m, x, y)) m.tiles[y * m.w + x] = t; };
  const get = (m, x, y) => (inside(m, x, y) ? m.tiles[y * m.w + x] : 15);
  const fill = (m, x, y, w, h, t) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(m, i, j, t); };
  const disc = (m, cx, cy, rx, ry, t) => { for (let j = Math.floor(cy - ry); j <= cy + ry; j++) for (let i = Math.floor(cx - rx); i <= cx + rx; i++) if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1) set(m, i, j, t); };

  // arte (tamanho em px) e área sólida padrão de cada tipo; porta relativa (retângulo desenhado na arte)
  const KIND = {
    hospital: { w: 320, h: 176, solid: [2, 20, 316, 156], door: [140, 136, 40, 39] },
    ubs: { w: 192, h: 128, solid: [2, 22, 188, 106], door: [80, 93, 32, 34] },
    biblioteca: { w: 176, h: 128, solid: [2, 22, 172, 106], door: [76, 88, 24, 32] },
    escola: { w: 192, h: 96, solid: [2, 18, 188, 78], door: [82, 60, 28, 35] },
    farmacia: { w: 96, h: 80, solid: [2, 14, 92, 66], door: [42, 50, 22, 29] },
    mulher: { w: 112, h: 80, solid: [2, 14, 108, 66], door: [45, 50, 22, 29] },
    idoso: { w: 192, h: 96, solid: [2, 16, 188, 80], door: [82, 62, 28, 33] },
    casa: { w: 96, h: 64, solid: [2, 16, 92, 48], door: [40, 38, 16, 25] },
    quitanda: { w: 112, h: 64, solid: [2, 16, 108, 48], door: [48, 38, 16, 25] },
    gruta: { w: 144, h: 112, solid: [4, 14, 136, 98], door: [52, 68, 40, 44] },
    barraca: { w: 48, h: 48, solid: [2, 34, 44, 14] },
    arvore: { w: 44, h: 52, solid: [17, 42, 10, 8] },
    palmeira: { w: 24, h: 44, solid: [8, 38, 8, 6] },
    chafariz: { w: 64, h: 48, solid: [2, 18, 60, 30] },
    banco: { w: 32, h: 14, solid: [0, 4, 32, 10] },
    poste: { w: 10, h: 30, solid: [2, 25, 6, 5] },
    canteiro: { w: 32, h: 16, solid: [0, 0, 32, 16] },
    quadro: { w: 32, h: 30, solid: [2, 24, 28, 6] },
    cerca: { w: 48, h: 12, solid: [0, 4, 48, 8] },
    cercaMadeira: { w: 48, h: 12, solid: [0, 4, 48, 8] },
    mesa: { w: 32, h: 20, solid: [0, 2, 32, 18] },
    guardasol: { w: 32, h: 28, solid: [0, 12, 32, 16] },
    espantalho: { w: 16, h: 28, solid: [5, 22, 6, 6] },
    canoa: { w: 40, h: 10, solid: null },
    placa: { w: 40, h: 22, solid: [16, 16, 8, 6] },
    pedra: { w: 24, h: 18, solid: [1, 4, 22, 14] },
    balcao: { w: 96, h: 20, solid: [0, 0, 96, 20] },
    estante: { w: 48, h: 40, solid: [0, 8, 48, 32] },
    maca: { w: 40, h: 24, solid: [0, 4, 40, 20] },
    leito: { w: 28, h: 40, solid: [0, 0, 28, 40] },
    cadeiras: { w: 60, h: 14, solid: [0, 2, 60, 12] },
    geladeira: { w: 24, h: 36, solid: [0, 10, 24, 26] },
    planta: { w: 16, h: 24, solid: [3, 16, 10, 8] },
    lousaParede: { w: 64, h: 28, solid: null },
    carteiras: { w: 80, h: 48, solid: [0, 0, 74, 46] },
    boneco: { w: 20, h: 40, solid: [4, 28, 12, 12] },
    cadeiraRodas: { w: 16, h: 20, solid: [0, 6, 16, 14] },
    vitrine: { w: 48, h: 36, solid: [0, 6, 48, 30] },
    tapeteSaida: { w: 32, h: 12, solid: null, flat: true },
  };
  let oid = 0;
  function obj(m, type, tx, ty, extra = {}) {
    const k = KIND[type] || { w: 16, h: 16, solid: [0, 0, 16, 16] };
    const o = { id: extra.id || `${type}-${++oid}`, type, x: Math.round(tx * T), y: Math.round(ty * T), w: extra.w || k.w, h: extra.h || k.h, solid: extra.solid !== undefined ? extra.solid : k.solid, flat: !!k.flat, ...extra };
    if (extra.w && k.solid && extra.solid === undefined) o.solid = [k.solid[0], k.solid[1], extra.w - (k.w - k.solid[2]), (extra.h || k.h) - (k.h - k.solid[3])];
    m.objects.push(o);
    return o;
  }
  // prédio com porta: cria o objeto e o gatilho da porta logo abaixo dela
  function building(m, type, tx, ty, { id, label, to, action, opts, sublabel } = {}) {
    const o = obj(m, type, tx, ty, { id, opts, label });
    const d = KIND[type].door;
    o.doorRect = d;
    const sb = KIND[type].solid ? KIND[type].solid[1] + KIND[type].solid[3] : 0;
    const dx = o.x + d[0] + d[2] / 2; const dy = o.y + Math.max(d[1] + d[3], sb);
    m.doors.push({ id: `${id}-porta`, building: o.id, label, sublabel, to, action, x: dx, y: dy + 6, rect: [dx - 12, dy - 2, 24, 18], face: 'up' });
    return o;
  }
  function road(m, x, y, w, h, t = 3) { fill(m, x, y, w, h, t); }

  /*
   * Artes aprovadas dos prédios (assets/predios/*.png, recortadas das imagens enviadas e reduzidas para a escala do jogo).
   * Medidas em px dentro da imagem: solids = áreas sólidas; door = retângulo da porta (animação); doorAt = centro e base da porta;
   * base = linha de profundidade (personagem passa atrás acima dela); hit = área para "Pressione E".
   */
  const SPRITES = {
    ubs: { w: 224, h: 133, door: [92, 75, 40, 37], doorAt: [112, 112], base: 108, solids: [[28, 28, 168, 80], [32, 100, 32, 16], [78, 100, 14, 14], [140, 100, 14, 14], [152, 96, 22, 22], [18, 104, 10, 16], [196, 104, 10, 16]] },
    hospital: { w: 352, h: 148, door: [140, 66, 68, 40], doorAt: [174, 106], base: 106, solids: [[0, 28, 352, 78], [72, 110, 32, 26], [8, 104, 46, 20], [56, 106, 12, 16], [336, 100, 8, 40]] },
    biblioteca: { w: 192, h: 152, door: [88, 96, 24, 34], doorAt: [100, 130], base: 126, solids: [[36, 24, 142, 102], [26, 118, 10, 20], [166, 118, 10, 20], [138, 112, 26, 26], [36, 118, 22, 20], [56, 124, 24, 12], [118, 118, 18, 18]] },
    escola: { w: 176, h: 157, door: [72, 96, 30, 36], doorAt: [87, 132], base: 128, solids: [[14, 30, 150, 98], [6, 120, 12, 24], [160, 120, 12, 24], [14, 116, 50, 26], [104, 116, 48, 26]] },
    mulher: { w: 192, h: 116, door: [92, 56, 26, 36], doorAt: [105, 92], base: 90, solids: [[46, 12, 134, 78], [10, 82, 62, 18], [70, 84, 20, 14], [128, 84, 22, 14], [150, 84, 26, 20]] },
    vacinacao: { w: 160, h: 114, door: [62, 54, 36, 41], doorAt: [80, 95], base: 92, solids: [[22, 12, 118, 80], [24, 82, 28, 14], [52, 80, 14, 16], [100, 82, 14, 14], [112, 80, 22, 18], [16, 86, 8, 12], [136, 86, 8, 12]] },
    farmacia: { w: 208, h: 110, door: [82, 58, 24, 34], doorAt: [94, 92], base: 90, solids: [[26, 12, 156, 78], [24, 74, 56, 22], [110, 74, 56, 22], [168, 68, 26, 28], [18, 80, 8, 16]] },
    capela: { w: 192, h: 106, door: [100, 58, 20, 22], doorAt: [110, 84], base: 80, solids: [[64, 14, 92, 66], [8, 36, 56, 56], [140, 56, 46, 40], [148, 86, 34, 14]] },
    idoso: { w: 208, h: 94, door: [82, 46, 20, 30], doorAt: [92, 80], base: 76, solids: [[28, 10, 152, 66], [44, 70, 26, 14], [150, 58, 42, 26], [8, 70, 30, 14], [118, 70, 24, 14]] },
    gruta: { w: 160, h: 89, door: [58, 34, 42, 52], doorAt: [79, 86], base: 76, solids: [[10, 4, 48, 76], [100, 4, 50, 76], [58, 4, 42, 72]] },
    feira: { w: 208, h: 97, base: 86, solids: [[30, 44, 152, 42], [6, 76, 8, 12], [194, 76, 8, 12]], hit: [30, 44, 152, 42] },
    quadro: { w: 144, h: 61, base: 52, solids: [[44, 36, 62, 16], [16, 44, 32, 12], [106, 44, 32, 12]], hit: [44, 36, 62, 16] },
    treino: { w: 176, h: 74, base: 62, solids: [[22, 30, 6, 40], [148, 30, 6, 40], [36, 36, 26, 18], [90, 36, 34, 18], [116, 26, 32, 22], [60, 44, 48, 22]], hit: [60, 44, 48, 22] },
    esporte: { w: 208, h: 75, base: 68, solids: [[70, 18, 132, 50], [10, 22, 52, 30], [10, 56, 32, 10]], hit: [70, 18, 132, 50] },
    horta: { w: 224, h: 90, base: 70, solids: [[36, 8, 104, 58], [118, 36, 82, 44], [8, 66, 100, 16]], hit: [8, 8, 196, 76] },
    moinho: { w: 208, h: 82, base: 72, solids: [[16, 8, 188, 66]], hit: [16, 8, 188, 66] },
  };
  // objeto com a arte aprovada; com `to`/`action` vira prédio com porta
  function sprite(m, key, tx, ty, { id, label, sublabel, to, action, interact } = {}) {
    const S = SPRITES[key];
    const o = { id: id || key, type: 'sprite', img: key, x: Math.round(tx * T), y: Math.round(ty * T), w: S.w, h: S.h, solid: S.solids[0], solids: S.solids.slice(1), base: S.base, label, interact, hit: S.hit || S.solids[0] };
    m.objects.push(o);
    if (S.door && (to || action)) {
      o.doorRect = S.door;
      const dx = o.x + S.doorAt[0]; const dy = o.y + S.doorAt[1];
      m.doors.push({ id: `${o.id}-porta`, building: o.id, label, sublabel, to, action, x: dx, y: dy + 6, rect: [dx - 12, dy - 2, 24, 18], face: 'up' });
    }
    return o;
  }
  // espaço livre para decorar (só grama, longe de prédios, portas e caminhos)
  function isFree(m, x, y, w, h, margin = 0.5) {
    for (let j = Math.floor(y); j < Math.ceil(y + h); j++) for (let i = Math.floor(x); i < Math.ceil(x + w); i++) if (![0, 1, 10].includes(get(m, i, j))) return false;
    const r = [(x - margin) * T, (y - margin) * T, (w + 2 * margin) * T, (h + 2 * margin) * T];
    const hit = (b) => r[0] < b[0] + b[2] && r[0] + r[2] > b[0] && r[1] < b[1] + b[3] && r[1] + r[3] > b[1];
    if (m.objects.some((o) => !o.flat && hit([o.x, o.y, o.w, o.h]))) return false;
    if (m.doors.some((d) => hit([d.x - 24, d.y - 24, 48, 56]))) return false;
    return true;
  }

  /* ======================= VILA MURICI ======================= */
  function vila() {
    seed = 11;
    const m = makeMap('vila', 'Vila Murici', 96, 64, 0);
    m.outdoor = true;
    for (let i = 0; i < m.tiles.length; i++) { const r = rnd(); m.tiles[i] = r < 0.09 ? 1 : r < 0.13 ? 10 : 0; }
    // mata nas bordas
    fill(m, 0, 0, 96, 2, 15); fill(m, 0, 62, 96, 2, 15); fill(m, 0, 0, 2, 64, 15); fill(m, 94, 0, 2, 64, 15);
    for (let x = 2; x < 94; x++) { if (rnd() < 0.5) set(m, x, 2, 15); if (rnd() < 0.5 && (x < 72 || x > 92)) set(m, x, 61, 15); }
    for (let y = 2; y < 62; y++) { if (rnd() < 0.5) set(m, 2, y, 15); if (rnd() < 0.5) set(m, 93, y, 15); }

    // ruas
    road(m, 3, 20, 90, 2);      // Avenida Norte
    road(m, 3, 44, 89, 2);      // Avenida Sul
    road(m, 46, 18, 2, 28);     // Rua Central
    road(m, 21, 19, 2, 27);     // Rua Oeste (Escola da Saúde)
    road(m, 67, 19, 2, 1);      // calçada do hospital
    road(m, 74, 22, 2, 24);     // Rua Leste
    // calçadas até as portas do norte
    road(m, 8, 19, 2, 1); road(m, 32, 19, 2, 1); road(m, 87, 19, 2, 1);
    // ruas internas do bairro e do comércio
    road(m, 3, 30, 34, 1); road(m, 8, 29, 2, 1);
    road(m, 59, 31, 35, 1); road(m, 82, 30, 2, 1);
    // praça central
    fill(m, 37, 23, 22, 18, 4);
    for (let x = 37; x < 59; x++) { set(m, x, 23, 3); set(m, x, 40, 3); }
    for (let y = 23; y < 41; y++) { set(m, 37, y, 3); set(m, 58, y, 3); }
    fill(m, 23, 38, 13, 5, 4); // pracinha do bairro
    // natureza: lago, rio, trilhas e pontes
    disc(m, 26, 55, 8.5, 6, 6); disc(m, 26, 55, 7.5, 5, 5);
    m.smooth = [{ tile: 6, under: 0, cx: 26, cy: 55, rx: 8.5, ry: 6 }, { tile: 5, under: 6, cx: 26, cy: 55, rx: 7.5, ry: 5 }];
    fill(m, 25, 46, 2, 5, 8); // píer do Seu Zé
    fill(m, 33, 58, 49, 2, 5); fill(m, 80, 52, 2, 8, 5); // rio da cachoeira da capela até o lago
    fill(m, 46, 46, 2, 15, 2); fill(m, 74, 46, 2, 16, 2); // trilhas
    fill(m, 46, 58, 2, 2, 8); fill(m, 74, 58, 2, 2, 8); // pontes
    fill(m, 76, 54, 10, 1, 2); fill(m, 84, 53, 2, 1, 2); set(m, 80, 54, 8); set(m, 81, 54, 8); // caminho da capela
    fill(m, 74, 60, 17, 2, 2); // trilha da gruta
    fill(m, 11, 46, 2, 1, 2); fill(m, 17, 46, 9, 1, 2);
    // rochas em volta da gruta
    fill(m, 82, 55, 2, 5, 9); fill(m, 93, 54, 1, 7, 9);

    /* ---------- prédios com as artes aprovadas ---------- */
    sprite(m, 'biblioteca', 3, 9.5, { id: 'biblioteca', label: 'Biblioteca', to: 'int-biblioteca' });
    sprite(m, 'escola', 16, 9.19, { id: 'escola', label: 'Escola da Saúde', sublabel: 'Centro de treinamento', to: 'int-escola' });
    sprite(m, 'vacinacao', 28, 11.87, { id: 'vacinacao', label: 'Sala de Vacinação', to: 'int-vacinacao' });
    sprite(m, 'ubs', 40, 10.69, { id: 'ubs', label: 'UBS Murici', sublabel: 'Unidade Básica de Saúde', to: 'int-ubs' });
    sprite(m, 'hospital', 57, 9.75, { id: 'hospital', label: 'Hospital Comunitário Antonella', to: 'int-hospital' });
    sprite(m, 'mulher', 81, 11.75, { id: 'mulher', label: 'Saúde da Mulher', sublabel: 'Ambulatório', to: 'int-mulher' });
    sprite(m, 'idoso', 3, 23, { id: 'idoso', label: 'Casa do Idoso Viver Bem', to: 'int-idoso' });
    sprite(m, 'esporte', 23, 23.6, { id: 'esporte', label: 'Esporte e Lazer', interact: { prompt: 'Pressione E para olhar a quadra', action: 'say:esporte' } });
    sprite(m, 'feira', 60, 23.5, { id: 'feira', label: 'Feira da Vila', interact: { prompt: 'Pressione E para olhar as barracas', action: 'say:feira' } });
    sprite(m, 'farmacia', 77, 23, { id: 'farmacia', label: 'Farmácia e Manipulação', to: 'int-farmacia' });
    sprite(m, 'quadro', 60, 34.5, { id: 'quadro', label: 'Quadro de avisos', interact: { prompt: 'Pressione E para ver o quadro', action: 'view:mural' } });
    sprite(m, 'horta', 3, 47, { id: 'horta', label: 'Horta e lago', interact: { prompt: 'Pressione E para cuidar da horta', action: 'view:horta' } });
    sprite(m, 'treino', 34.5, 46.6, { id: 'treino', label: 'Área de Treinamento', interact: { prompt: 'Pressione E para treinar', action: 'say:boneco' } });
    sprite(m, 'moinho', 55, 54.25, { id: 'moinho', label: 'Moinho do rio', interact: { prompt: 'Pressione E para olhar', action: 'say:moinho' } });
    sprite(m, 'capela', 78, 46.5, { id: 'capela', label: 'Capela de São Murici', to: 'int-capela' });
    sprite(m, 'gruta', 84, 55, { id: 'gruta', label: 'Gruta Velha', sublabel: 'Batalha de revisão', action: 'view:gruta' });
    // casas e quitanda (desenhadas por código; não vieram artes para elas)
    const houses = [[3, 35, '#f3e2b0', '#3a6ea8'], [11, 35, '#f1d2c4', '#c94f3d'], [24, 32.6, '#dfe9c8', '#3f8a3e'], [30, 32.6, '#e9dcf2', '#8e5bb9'], [86, 36, '#f6e2b0', '#7a4a2e']];
    houses.forEach(([x, y, wall, roof], i) => building(m, 'casa', x, y, { id: `casa${i + 1}`, label: `Casa ${i + 1}`, sublabel: 'Moradores', to: 'int-casa', opts: { wall, roof, chimney: i % 2 === 0 } }));
    building(m, 'quitanda', 78, 36, { id: 'quitanda', label: 'Quitanda da Dona Rita', to: 'int-quitanda' });
    road(m, 5, 39, 2, 5); road(m, 13, 39, 2, 5); road(m, 26, 36, 2, 2); road(m, 32, 36, 2, 2); road(m, 88, 40, 2, 4); road(m, 81, 40, 2, 4);
    obj(m, 'cerca', 3, 33.7, { w: 96, solid: [0, 4, 96, 8] }); obj(m, 'cerca', 11, 33.7, { w: 32, solid: [0, 4, 32, 8] });

    /* ---------- praça central ---------- */
    obj(m, 'roseta', 43.5, 28.0, { w: 112, h: 84, solid: null, flat: true });
    obj(m, 'chafariz', 44.5, 28.6, { id: 'chafariz', w: 80, h: 60, solid: [4, 24, 72, 34], label: 'Chafariz da praça', anim: 'fountain', interact: { prompt: 'Pressione E para olhar', action: 'say:chafariz' } });
    [[38.6, 24.6], [54.4, 24.6], [38.6, 36.4], [54.4, 36.4]].forEach(([x, y]) => obj(m, 'canteiro', x, y, { w: 48, h: 32, solid: [0, 0, 48, 32] }));
    [[41.5, 26.2], [50.8, 26.2], [41.5, 38.3], [50.8, 38.3]].forEach(([x, y]) => obj(m, 'banco', x, y));
    // vasos floridos em volta do chafariz e bancos voltados para ele
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const x = 47 + Math.cos(a) * 4.6 - 0.6; const y = 30.8 + Math.sin(a) * 3.4 - 0.55; obj(m, 'arbusto', x, y, { w: 20, h: 18, solid: [4, 10, 12, 7], opts: { flower: ['#ff6fae', '#ffd34d', '#ffffff', '#c9a5f2'][i % 4] } }); }
    obj(m, 'banco', 38.9, 33.4); obj(m, 'banco', 55.1, 33.4);
    [[40.4, 30.8], [55.2, 30.8]].forEach(([x, y]) => { obj(m, 'posteBandeira', x, y - 1.6, { w: 16, h: 30, solid: [3, 25, 6, 5] }); m.lights.push({ x: x * T + 5, y: (y - 1.6) * T + 3, r: 32 }); });
    [[38, 24], [57.6, 24], [38, 39.3], [57.6, 39.3]].forEach(([x, y]) => { obj(m, 'posteBandeira', x, y - 1.6, { w: 16, h: 30, solid: [3, 25, 6, 5] }); m.lights.push({ x: x * T + 5, y: (y - 1.6) * T + 3, r: 32 }); });
    obj(m, 'arvore', 38.6, 29.6, { w: 36, h: 44, solid: [13, 35, 10, 8], opts: { kind: 'amarelo' } }); obj(m, 'arvore', 54.6, 29.6, { w: 36, h: 44, solid: [13, 35, 10, 8], opts: { kind: 'ipe' } });
    obj(m, 'placaSetas', 49.6, 41, { w: 60, h: 50, solid: [26, 42, 8, 8], opts: { items: ['UBS', 'HOSPITAL', 'ESCOLA', 'GRUTA'] }, label: 'Placa de caminhos', interact: { prompt: 'Pressione E para ler', action: 'say:placa-praca' } });
    // bancos de espera da UBS
    obj(m, 'banco', 37.5, 18.2); obj(m, 'banco', 54.5, 18.2);
    [[15, 21.7], [27, 21.7], [39, 21.7], [56, 21.7], [71, 21.7], [92, 21.7], [10, 43], [30, 43], [62, 43], [72, 43]].forEach(([x, y]) => { obj(m, 'poste', x, y - 1.4); m.lights.push({ x: x * T + 5, y: (y - 1.4) * T + 3, r: 30 }); });

    /* ---------- natureza ---------- */
    obj(m, 'canoa', 27.3, 50.6, { id: 'pier', label: 'Píer do lago', interact: { prompt: 'Pressione E para pescar', action: 'view:horta' } });
    [[21.5, 53.4], [29.6, 55.6], [23.2, 57.5], [31, 52.6], [20.4, 56.2]].forEach(([x, y]) => obj(m, 'lirio', x, y, { w: 12, h: 8, solid: null, flat: true }));
    m.ducks = [{ cx: 26 * T, cy: 55.5 * T, rx: 54, ry: 22, sp: 0.35, ph: 0 }, { cx: 26 * T, cy: 55.5 * T, rx: 54, ry: 22, sp: 0.35, ph: 0.35 }, { cx: 26 * T, cy: 55.5 * T, rx: 54, ry: 22, sp: 0.35, ph: 0.5 }];
    for (let i = 0; i < 10; i++) obj(m, 'arvore', 35.6 + (i % 5) * 2, 51.8 + Math.floor(i / 5) * 2.6, { w: 36, h: 44, solid: [13, 35, 10, 8], opts: { kind: 'pomar' }, ...(i === 2 ? { id: 'pomar', label: 'Pomar', interact: { prompt: 'Pressione E para colher', action: 'say:pomar' } } : {}) });
    obj(m, 'placa', 72, 46.4, { opts: { label: 'TRILHA' }, label: 'Trilha da cachoeira', interact: { prompt: 'Pressione E para ler', action: 'say:trilha' } });
    obj(m, 'pedra', 70, 49.5); obj(m, 'pedra', 89, 53.1); obj(m, 'pedra', 18.5, 48.5); obj(m, 'pedra', 50, 56.3);
    m.spots.push({ id: 'cachoeira', label: 'Cachoeira da capela', x: 81 * T, y: 53 * T, rect: [78.5 * T, 52.4 * T, 5 * T, 2 * T], interact: { prompt: 'Pressione E para descansar', action: 'say:cachoeira' } });

    /* ---------- árvores, arbustos e flores (só em grama livre) ---------- */
    const KINDS = ['manga', 'amarelo', 'jacaranda', 'ipe', 'manga', 'flamboyant', 'manga'];
    const fixedTrees = [[4, 3.4], [9, 3], [14, 4], [20, 3.2], [26, 4], [31, 3.2], [36, 4.2], [40, 3], [50, 3.4], [54, 4.6], [84, 3.2], [89, 4.6], [91, 7.5], [30, 7], [37.5, 8], [53.5, 6.8],
      [3, 46.6], [18, 45.8], [33, 46.2], [52, 46.2], [66, 46.6], [86, 41], [92, 26], [92, 31.5], [70, 39], [60, 39.5], [50, 52], [64, 51], [3.5, 58], [10, 59], [15, 58.2], [40.5, 59.5], [60, 60], [69, 60]];
    fixedTrees.forEach(([x, y], i) => { if (isFree(m, x, y, 2.75, 3.25, 0.1)) obj(m, i % 6 === 4 ? 'palmeira' : 'arvore', x, y, { opts: { kind: KINDS[i % KINDS.length] } }); });
    // árvores e flores em volta da praça (como nas ilustrações)
    [[35, 25], [35, 31], [35, 36.5], [59.2, 33], [59.2, 38.2], [44, 41.2], [52.6, 41.6]].forEach(([x, y], i) => { if (isFree(m, x, y, 2.2, 2.75, 0)) obj(m, 'arvore', x, y, { w: 36, h: 44, solid: [13, 35, 10, 8], opts: { kind: ['jacaranda', 'amarelo', 'ipe', 'flamboyant'][i % 4] } }); });
    for (let i = 0; i < 520; i++) {
      const x = 3 + rnd() * 89; const y = 3 + rnd() * 57;
      const r = rnd();
      if (r < 0.4 && isFree(m, x, y, 2.75, 3.25, 0.15)) obj(m, 'arvore', x, y, { opts: { kind: KINDS[Math.floor(rnd() * KINDS.length)] } });
      else if (r < 0.7 && isFree(m, x, y, 1.2, 1.1, 0.1)) obj(m, 'arbusto', x, y, { w: 18, h: 16, solid: [3, 9, 12, 6], opts: { flower: ['#ff6fae', '#ffd34d', '#ffffff', '#c9a5f2', '#ff6b5e'][Math.floor(rnd() * 5)] } });
      else if (isFree(m, x, y, 2, 1, 0)) obj(m, 'flores', x, y, { w: 28, h: 14, solid: null, flat: true });
    }

    /* ---------- regiões (para nome na tela, música e mapa) ---------- */
    m.regions = [
      { id: 'saude', name: 'Distrito da Saúde', music: 'saude', rect: [27, 2, 69, 19] },
      { id: 'conhecimento', name: 'Distrito do Conhecimento', music: 'biblioteca', rect: [2, 2, 25, 19] },
      { id: 'praca', name: 'Praça Central', music: 'praca', rect: [36, 21, 23, 23] },
      { id: 'comercio', name: 'Feira e Comércio', music: 'praca', rect: [59, 21, 37, 25] },
      { id: 'residencial', name: 'Bairro Residencial', music: 'praca', rect: [2, 21, 34, 25] },
      { id: 'gruta', name: 'Gruta Velha', music: 'gruta', rect: [82, 54, 14, 10] },
      { id: 'natureza', name: 'Natureza: horta, lago, rio e capela', music: 'natureza', rect: [2, 46, 94, 18] },
    ];
    m.spawn = { x: 47 * T, y: 42 * T + 8, dir: 'up' };
    // atalhos do painel lateral: onde o personagem para antes de entrar
    m.places = {
      ubs: 'ubs-porta', biblioteca: 'biblioteca-porta', hospital: 'hospital-porta', gruta: 'gruta-porta', horta: 'horta', mural: 'quadro',
    };
    return m;
  }

  /* ======================= INTERIORES ======================= */
  // sala com borda, parede de 2 tiles no alto e tapete de saída embaixo
  function room(id, name, w, h, floor, { music, exitX } = {}) {
    const m = makeMap(id, name, w, h, floor);
    m.interior = true; m.music = music;
    fill(m, 0, 0, w, 1, 19); fill(m, 0, h - 1, w, 1, 19); fill(m, 0, 0, 1, h, 19); fill(m, w - 1, 0, 1, h, 19);
    fill(m, 1, 1, w - 2, 2, 13);
    const ex = exitX ?? Math.floor(w / 2) - 1;
    set(m, ex, h - 1, floor); set(m, ex + 1, h - 1, floor);
    obj(m, 'tapeteSaida', ex, h - 1.75);
    m.doors.push({ id: `${id}-saida`, label: 'Saída', to: 'back', x: (ex + 1) * T, y: (h - 1.5) * T, rect: [ex * T, (h - 1.6) * T, 2 * T, 1.6 * T], face: 'down', exit: true });
    m.spawn = { x: (ex + 1) * T, y: (h - 2) * T, dir: 'up' };
    return m;
  }
  const wallV = (m, x, y0, y1, gap = []) => { for (let y = y0; y <= y1; y++) if (!gap.includes(y)) set(m, x, y, 19); };
  const wallH = (m, y, x0, x1, gap = []) => { for (let x = x0; x <= x1; x++) if (!gap.includes(x)) set(m, x, y, 19); };
  function sign(m, tx, ty, text, color = '#2f7d6b') { m.signs = m.signs || []; m.signs.push({ x: tx * T, y: ty * T, text, color }); }

  function ubs() {
    const m = room('int-ubs', 'UBS Murici', 26, 16, 12, { music: 'saude' });
    m.region = { name: 'UBS Murici · Unidade Básica de Saúde', music: 'saude' };
    // divisórias: vacinação (esq.), procedimentos (centro alto), consultório (dir.)
    wallV(m, 9, 3, 9, [7, 8]); wallV(m, 16, 3, 9, [7, 8]); wallH(m, 6, 10, 15, [12, 13]); wallH(m, 10, 1, 8, [4, 5]); wallH(m, 10, 17, 24, [20, 21]);
    fill(m, 1, 3, 8, 7, 12); fill(m, 10, 3, 6, 3, 18);
    sign(m, 2, 1.2, 'VACINAÇÃO', '#2f68b0'); sign(m, 10.4, 1.2, 'PROCEDIMENTOS', '#8a2f4a'); sign(m, 17.2, 1.2, 'CONSULTÓRIO 1', '#2f7d6b'); sign(m, 1.4, 10.2, 'SALA DE ESPERA', '#2f7d6b');
    obj(m, 'geladeira', 1.4, 2.6, { id: 'geladeira-vacinas', label: 'Geladeira de vacinas', interact: { prompt: 'Pressione E para ver', action: 'say:vacinas' } });
    obj(m, 'maca', 5, 3.6); obj(m, 'planta', 7.6, 8.2);
    obj(m, 'maca', 12, 3.2, { w: 40, h: 24 });
    obj(m, 'maca', 21.5, 3.6); obj(m, 'mesa', 18, 5, { id: 'prontuarios', label: 'Prontuários', interact: { prompt: 'Pressione E para ver os plantões', action: 'view:ubs' } });
    obj(m, 'estante', 22, 6.5, { w: 32, h: 40 });
    obj(m, 'balcao', 11, 9.5, { w: 64, solid: [0, 0, 64, 20], opts: { color: '#2f7d6b' } });
    obj(m, 'cadeiras', 2, 12.3, { w: 84, solid: [0, 2, 84, 12] }); obj(m, 'cadeiras', 18.5, 12.3, { w: 84, solid: [0, 2, 84, 12] });
    obj(m, 'planta', 1.2, 13.4); obj(m, 'planta', 23.6, 13.4);
    return m;
  }
  function hospital() {
    const m = room('int-hospital', 'Hospital Comunitário Antonella', 30, 16, 12, { music: 'hospital' });
    m.region = { name: 'Hospital Comunitário Antonella', music: 'hospital' };
    wallV(m, 10, 3, 8, [6, 7]); wallV(m, 19, 3, 8, [6, 7]); wallH(m, 9, 1, 9, [5, 6]); wallH(m, 9, 20, 28, [24, 25]);
    fill(m, 1, 3, 9, 6, 12); fill(m, 20, 3, 9, 6, 12); fill(m, 11, 3, 8, 6, 18);
    sign(m, 2, 1.2, 'ENFERMARIA', '#2f6f9a'); sign(m, 11.2, 1.2, 'TRIAGEM', '#d63b3b'); sign(m, 20.5, 1.2, 'CONSULTÓRIOS', '#2f6f9a'); sign(m, 12.5, 9.7, 'RECEPÇÃO', '#2f6f9a');
    for (let i = 0; i < 4; i++) obj(m, 'leito', 1.4 + i * 2.1, 3.1, { w: 28, h: 40 });
    obj(m, 'cadeiras', 12, 3.4, { w: 48 }); obj(m, 'maca', 15, 5.2);
    m.signs.push({ x: 11.2 * T, y: 7.6 * T, strip: ['#d63b3b', '#f08a24', '#f2c94c', '#3f8a3e', '#3a6ea8'] });
    obj(m, 'maca', 20.5, 3.4); obj(m, 'mesa', 23.6, 4.4); obj(m, 'maca', 26, 6.2); obj(m, 'planta', 27.6, 3);
    obj(m, 'balcao', 12, 10.6, { w: 96, solid: [0, 0, 96, 20], opts: { color: '#2f6f9a' } });
    obj(m, 'cadeiras', 2, 12.5, { w: 96, solid: [0, 2, 96, 12] }); obj(m, 'cadeiras', 21, 12.5, { w: 84, solid: [0, 2, 84, 12] });
    obj(m, 'cadeiraRodas', 21, 10.3); obj(m, 'planta', 1.3, 10);
    obj(m, 'placa', 25.4, 10, { opts: { label: 'EM OBRA' }, label: 'Ala de casos complexos', interact: { prompt: 'Pressione E para ler', action: 'say:obras' } });
    return m;
  }
  function biblioteca() {
    const m = room('int-biblioteca', 'Biblioteca', 22, 14, 11, { music: 'biblioteca' });
    m.region = { name: 'Biblioteca da Vila', music: 'biblioteca' };
    fill(m, 7, 5, 8, 4, 14);
    obj(m, 'lousaParede', 9, 0.9, { w: 64, h: 28 });
    [[1.3, 2.4, 'livro-ficha'], [4.4, 2.4, 'livro-fontes'], [14.6, 2.4, 'livro-revisao'], [17.7, 2.4, 'livro-caderneta']].forEach(([x, y, id]) => obj(m, 'estante', x, y, { id, label: { 'livro-ficha': 'Estante: fichas do tema', 'livro-fontes': 'Estante: fontes oficiais', 'livro-revisao': 'Estante: dúvidas para revisar', 'livro-caderneta': 'Estante: caderneta' }[id], interact: { prompt: 'Pressione E para abrir um livro', action: `book:${id}` } }));
    obj(m, 'estante', 1.3, 6.5); obj(m, 'estante', 17.7, 6.5);
    obj(m, 'mesa', 7.5, 6, { w: 48, h: 20, solid: [0, 2, 48, 18] }); obj(m, 'mesa', 11.5, 6, { w: 48, h: 20, solid: [0, 2, 48, 18] });
    obj(m, 'balcao', 2, 10.5, { w: 64, solid: [0, 0, 64, 20], opts: { color: '#34508a' } });
    obj(m, 'planta', 19.6, 11); obj(m, 'planta', 6.2, 11.5);
    return m;
  }
  function escola() {
    const m = room('int-escola', 'Escola da Saúde', 26, 14, 12, { music: 'biblioteca', exitX: 9 });
    m.region = { name: 'Escola da Saúde · Centro de treinamento', music: 'missoes' };
    wallV(m, 13, 3, 12, [9, 10]);
    fill(m, 14, 3, 11, 10, 18);
    sign(m, 1.2, 1.2, 'SALA DE AULA', '#2a2a33'); sign(m, 15, 1.2, 'TREINAMENTO', '#c96a4a');
    obj(m, 'lousaParede', 5.5, 0.9, { w: 64, h: 28 });
    obj(m, 'carteiras', 2, 5, { w: 80, h: 48 }); obj(m, 'carteiras', 7.5, 5, { w: 80, h: 48 });
    obj(m, 'boneco', 16, 4, { id: 'boneco-rcp', label: 'Boneco de RCP', interact: { prompt: 'Pressione E para treinar', action: 'say:boneco' } });
    obj(m, 'maca', 20, 4.2); obj(m, 'cadeiraRodas', 23.3, 8); obj(m, 'estante', 14.4, 9.6, { w: 48, h: 40 });
    obj(m, 'planta', 11.5, 11); obj(m, 'planta', 23.6, 11.4);
    return m;
  }
  function idoso() {
    const m = room('int-idoso', 'Casa do Idoso Viver Bem', 20, 12, 11, { music: 'saude' });
    m.region = { name: 'Casa do Idoso Viver Bem', music: 'saude' };
    fill(m, 3, 4, 7, 4, 14); fill(m, 12, 4, 6, 4, 14);
    obj(m, 'mesa', 5, 5, { id: 'mesa-damas', label: 'Tabuleiro de damas', interact: { prompt: 'Pressione E para olhar', action: 'say:damas' } });
    obj(m, 'cadeiras', 12, 3.2, { w: 72, solid: [0, 2, 72, 12] }); obj(m, 'cadeiraRodas', 16.6, 7); obj(m, 'estante', 1.3, 2.4, { w: 32, h: 40 });
    obj(m, 'planta', 1.2, 9); obj(m, 'planta', 17.6, 9); obj(m, 'planta', 9.5, 2.6);
    return m;
  }
  function farmacia() {
    const m = room('int-farmacia', 'Farmácia da Vila', 14, 9, 12, { music: 'saude' });
    m.region = { name: 'Farmácia da Vila', music: 'saude' };
    obj(m, 'vitrine', 1.3, 1.9); obj(m, 'vitrine', 4.6, 1.9); obj(m, 'vitrine', 9.3, 1.9);
    obj(m, 'balcao', 3, 5.2, { w: 128, solid: [0, 0, 128, 20], opts: { color: '#3f8a3e' } });
    obj(m, 'planta', 1.2, 6.2); obj(m, 'planta', 11.6, 6.2);
    return m;
  }
  function mulher() {
    const m = room('int-mulher', 'Saúde da Mulher', 16, 10, 12, { music: 'saude' });
    m.region = { name: 'Saúde da Mulher · Ambulatório', music: 'saude' };
    wallV(m, 8, 3, 6, [5, 6]);
    fill(m, 9, 3, 6, 4, 14);
    sign(m, 9.3, 1.2, 'CONSULTA', '#8e5bb9'); sign(m, 1.5, 1.2, 'ESPERA', '#8e5bb9');
    obj(m, 'maca', 10, 3.3); obj(m, 'mesa', 12.6, 4.6); obj(m, 'cadeiras', 1.4, 3.4, { w: 72, solid: [0, 2, 72, 12] });
    obj(m, 'planta', 1.2, 7); obj(m, 'planta', 13.6, 7.2);
    return m;
  }
  function casa() {
    const m = room('int-casa', 'Casa de moradores', 12, 8, 11, { music: 'praca' });
    m.region = { name: 'Casa de moradores', music: 'praca' };
    fill(m, 3, 3, 6, 3, 14);
    obj(m, 'mesa', 4, 3.6, { id: 'bilhete', label: 'Bilhete na mesa', interact: { prompt: 'Pressione E para ler', action: 'say:bilhete' } });
    obj(m, 'leito', 9.5, 2.4, { w: 28, h: 40 }); obj(m, 'estante', 1.2, 2.4, { w: 32, h: 40 }); obj(m, 'planta', 1.2, 5.6);
    return m;
  }
  function quitanda() {
    const m = room('int-quitanda', 'Quitanda da Dona Rita', 14, 8, 11, { music: 'praca' });
    m.region = { name: 'Quitanda da Dona Rita', music: 'praca' };
    obj(m, 'balcao', 3, 3.5, { w: 128, solid: [0, 0, 128, 20], opts: { color: '#c94f3d' } });
    obj(m, 'barraca', 0.8, 1.2, { opts: { color: '#3f8a3e', goods: ['#d9412b', '#f2c94c', '#f08a24', '#b6d96a'] } }); obj(m, 'barraca', 10.2, 1.2, { opts: { color: '#e8455a', goods: ['#4a2a5a', '#f2c94c', '#5aa64c', '#d9412b'] } });
    obj(m, 'planta', 1.2, 5.6); obj(m, 'planta', 11.6, 5.6);
    return m;
  }

  function vacinacao() {
    const m = room('int-vacinacao', 'Sala de Vacinação', 14, 10, 12, { music: 'saude' });
    m.region = { name: 'Sala de Vacinação', music: 'saude' };
    fill(m, 2, 3, 10, 3, 14);
    sign(m, 4.6, 1.2, 'SALA DE VACINAÇÃO', '#2f68b0');
    obj(m, 'geladeira', 1.4, 2.6, { id: 'geladeira-vac', label: 'Geladeira de vacinas', interact: { prompt: 'Pressione E para ver', action: 'say:vacinas' } });
    obj(m, 'maca', 9.6, 3.4); obj(m, 'mesa', 5, 4.4); obj(m, 'cadeiras', 1.4, 7, { w: 48, solid: [0, 2, 48, 12] }); obj(m, 'planta', 11.6, 7);
    return m;
  }
  function capela() {
    const m = room('int-capela', 'Capela de São Murici', 14, 11, 11, { music: 'biblioteca' });
    m.region = { name: 'Capela de São Murici', music: 'biblioteca' };
    fill(m, 6, 3, 2, 7, 14);
    obj(m, 'vitral', 5.8, 0.55, { w: 40, h: 26, solid: null });
    obj(m, 'mesa', 5.5, 3, { id: 'altar', label: 'Altar', w: 48, h: 20, interact: { prompt: 'Pressione E para olhar', action: 'say:capela' } });
    [4.6, 6.6].forEach((y) => { obj(m, 'banco', 1.6, y, { w: 64, solid: [0, 4, 64, 10] }); obj(m, 'banco', 8.4, y, { w: 64, solid: [0, 4, 64, 10] }); });
    obj(m, 'planta', 1.2, 2.4); obj(m, 'planta', 11.6, 2.4);
    return m;
  }

  const maps = { vila: vila(), 'int-vacinacao': vacinacao(), 'int-capela': capela(), 'int-ubs': ubs(), 'int-hospital': hospital(), 'int-biblioteca': biblioteca(), 'int-escola': escola(), 'int-idoso': idoso(), 'int-farmacia': farmacia(), 'int-mulher': mulher(), 'int-casa': casa(), 'int-quitanda': quitanda() };
  window.PLANTAO_MAPAS = maps;
  window.PLANTAO_MAPAS_UTIL = { T, get, KIND, SPRITES };
})();
