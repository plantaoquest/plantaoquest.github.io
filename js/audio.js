/*
 * Plantão Quest — áudio original gerado no navegador (Web Audio).
 * Trilhas chiptune compostas para o projeto, efeitos sonoros e ambiente (água, pássaros, vento).
 * Nada é baixado: tudo é sintetizado. O áudio só começa depois de um gesto do jogador (regra de autoplay).
 */
(function audio() {
  'use strict';
  const S = () => PQ.state;
  let ctx = null; let master = null; let musicBus = null; let sfxBus = null; let ambBus = null; let noiseBuf = null;
  const supported = !!(window.AudioContext || window.webkitAudioContext);

  const vol = () => {
    const a = S().audio || {};
    return { music: a.music ?? 0.55, sfx: a.sfx ?? 0.8, amb: a.amb ?? 0.5 };
  };
  const enabled = () => S().sound === true;

  function ensure() {
    if (!supported || !enabled()) return null;
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        musicBus = ctx.createGain(); sfxBus = ctx.createGain(); ambBus = ctx.createGain();
        [musicBus, sfxBus, ambBus].forEach((g) => g.connect(master));
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        apply();
      } catch { ctx = null; return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function apply() {
    if (!ctx) return;
    const v = vol(); const on = enabled();
    const t = ctx.currentTime;
    musicBus.gain.setTargetAtTime(on ? v.music * 0.5 : 0, t, 0.08);
    sfxBus.gain.setTargetAtTime(on ? v.sfx : 0, t, 0.05);
    ambBus.gain.setTargetAtTime(on ? v.amb : 0, t, 0.2);
    if (!on) stopMusic(); else if (wanted && !playing) music(wanted);
  }

  /* ---------------- síntese básica ---------------- */
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(n) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(n); if (!m) return 0;
    const midi = (Number(m[3]) + 1) * 12 + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * 2 ** ((midi - 69) / 12);
  }
  function tone(bus, type, f, t, dur, gain, { slide = 0, attack = 0.005, release = 0.06 } = {}) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + Math.max(attack, dur - release)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.01);
    o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(bus, t, dur, gain, { type = 'highpass', f = 6000, q = 0.7 } = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(bus); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }

  /* ---------------- trilhas (composição original) ---------------- */
  // 8 passos por compasso; '.' sustenta a nota anterior, '-' é pausa.
  const SONGS = {
    praca: { bpm: 112, lead: 'square', drums: 'pop',
      lead_: 'E5 . G5 . A5 G5 E5 . C5 . D5 E5 . . D5 . F5 . A5 . C6 A5 F5 . G5 . F5 E5 D5 . - - E5 . G5 . A5 G5 E5 . C6 . B5 A5 G5 . E5 . F5 . E5 D5 C5 . A4 . B4 . C5 D5 C5 . - -',
      bass: 'C3 C3 G2 G2 A2 A2 E2 E2 F2 F2 C3 C3 G2 G2 B2 G2', chords: [['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4']] },
    saude: { bpm: 96, lead: 'triangle', drums: 'soft',
      lead_: 'A4 . C5 . F5 . E5 . D5 . . C5 D5 . - - Bb4 . D5 . F5 . G5 F5 E5 . . . C5 . - - A4 . C5 . F5 . A5 . G5 . F5 . D5 . - - Bb4 . A4 . G4 . A4 . F4 . . . - - - -',
      bass: 'F2 F2 C3 C3 D2 D2 A2 A2 Bb2 Bb2 F2 F2 C3 C3 G2 C3', chords: [['F4', 'A4', 'C5'], ['D4', 'F4', 'A4'], ['Bb3', 'D4', 'F4'], ['C4', 'E4', 'G4']] },
    biblioteca: { bpm: 84, lead: 'triangle', drums: null,
      lead_: 'F#5 . . E5 D5 . . . D5 . E5 F#5 B4 . . . G5 . F#5 E5 D5 . B4 . A4 . . . - - - - F#5 . . A5 G5 . F#5 . E5 . D5 . B4 . . . G4 . B4 . D5 . G5 . E5 . C#5 . D5 . . .',
      bass: 'D3 . A2 . B2 . F#2 . G2 . D3 . A2 . A2 .', chords: [['D4', 'F#4', 'A4'], ['B3', 'D4', 'F#4'], ['G3', 'B3', 'D4'], ['A3', 'C#4', 'E4']] },
    hospital: { bpm: 100, lead: 'square', drums: 'soft',
      lead_: 'A4 . C5 . E5 . D5 C5 B4 . . . A4 . - - F4 . A4 . C5 . B4 A4 G#4 . . . E4 . - - A4 . C5 . E5 . A5 . G5 . F5 . E5 . - - D5 . C5 . B4 . C5 . A4 . . . - - - -',
      bass: 'A2 A2 E2 E2 F2 F2 C3 C3 C3 C3 G2 G2 E2 E2 B2 E2', chords: [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['E3', 'G#3', 'B3']] },
    natureza: { bpm: 104, lead: 'triangle', drums: 'shaker',
      lead_: 'B4 D5 G5 . F#5 . D5 . E5 . G5 . B4 . . . C5 E5 G5 . A5 . G5 E5 D5 . . . - - D5 . B4 D5 G5 . A5 . B5 . A5 G5 E5 . . . C5 . E5 . D5 . C5 . A4 . F#4 . G4 . . . - -',
      bass: 'G2 G2 D3 D3 E2 E2 B2 B2 C3 C3 G2 G2 D3 D3 A2 D3', chords: [['G3', 'B3', 'D4'], ['E3', 'G3', 'B3'], ['C4', 'E4', 'G4'], ['D4', 'F#4', 'A4']] },
    gruta: { bpm: 128, lead: 'square', drums: 'drive',
      lead_: 'D5 . F5 D5 A5 . G5 F5 E5 . . . C#5 . - - D5 . F5 D5 Bb5 . A5 G5 A5 . . . - - - - F5 . E5 D5 C#5 . D5 E5 F5 . G5 . A5 . . . Bb5 . A5 G5 F5 . E5 . D5 . . . - - - -',
      bass: 'D2 D2 D3 D2 Bb1 Bb1 Bb2 Bb1 G1 G1 G2 G1 A1 A1 A2 C#3', eighthBass: true, chords: [['D4', 'F4', 'A4'], ['Bb3', 'D4', 'F4'], ['G3', 'Bb3', 'D4'], ['A3', 'C#4', 'E4']] },
    missoes: { bpm: 120, lead: 'square', drums: 'march',
      lead_: 'G4 . C5 . E5 . G5 . F5 . E5 . D5 . . . A4 . D5 . F5 . A5 . G5 . F5 . E5 . . . G5 . E5 . C5 . E5 . F5 . A5 . G5 . F5 . E5 . D5 . B4 . C5 . . . - - - - - -',
      bass: 'C3 G2 C3 G2 F2 C3 F2 C3 G2 D3 G2 D3 C3 G2 C3 C3', chords: [['C4', 'E4', 'G4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4'], ['C4', 'E4', 'G4']] },
  };
  const parsed = {};
  function song(id) {
    if (parsed[id]) return parsed[id];
    const s = SONGS[id]; if (!s) return null;
    const lead = s.lead_.split(/\s+/);
    const bass = s.bass.split(/\s+/);
    parsed[id] = { ...s, leadSeq: lead, bassSeq: bass, steps: lead.length };
    return parsed[id];
  }

  let playing = null; let wanted = null; let timer = null;
  const voices = {}; // id -> { gain, step, next }
  function scheduleSong(id, v) {
    const s = song(id); const spb = 60 / s.bpm / 2; // duração de um passo (colcheia)
    while (v.next < ctx.currentTime + 0.2) {
      const i = v.step % s.steps; const t = v.next;
      const n = s.leadSeq[i];
      if (n && n !== '.' && n !== '-') {
        let len = 1; while (s.leadSeq[(i + len) % s.steps] === '.' && len < 8) len++;
        tone(v.gain, s.lead, freq(n), t, len * spb * 0.92, s.lead === 'square' ? 0.11 : 0.2, { release: 0.08 });
      }
      // baixo: 2 passos por nota (ou 1 em trilhas rápidas)
      const bStep = s.eighthBass ? i % 16 : Math.floor(i / 2) % s.bassSeq.length;
      const bn = s.eighthBass ? s.bassSeq[bStep] : (i % 2 === 0 ? s.bassSeq[bStep] : null);
      if (bn && bn !== '.' && bn !== '-') tone(v.gain, 'triangle', freq(bn), t, spb * (s.eighthBass ? 0.9 : 1.8), 0.22);
      // arpejo do acorde do compasso
      const chord = s.chords[Math.floor(i / 8) % s.chords.length];
      if (i % 2 === 1 || id === 'biblioteca') tone(v.gain, 'square', freq(chord[(i >> (id === 'biblioteca' ? 0 : 1)) % 3]), t, spb * 0.5, id === 'biblioteca' ? 0.025 : 0.035);
      // bateria
      const b = i % 8;
      if (s.drums === 'pop' || s.drums === 'march' || s.drums === 'drive') {
        if (b === 0 || b === 4 || (s.drums === 'drive' && b % 2 === 0)) tone(v.gain, 'sine', 140, t, 0.12, 0.35, { slide: 0.35 });
        if (b === 2 || b === 6) noise(v.gain, t, 0.12, 0.12, { type: 'bandpass', f: 1800, q: 0.8 });
        noise(v.gain, t, 0.03, 0.03);
      } else if (s.drums === 'soft') {
        if (b === 0) tone(v.gain, 'sine', 110, t, 0.15, 0.22, { slide: 0.4 });
        if (b === 4) noise(v.gain, t, 0.06, 0.04, { type: 'bandpass', f: 2500 });
      } else if (s.drums === 'shaker') {
        if (b % 2 === 1) noise(v.gain, t, 0.04, 0.035);
        if (b === 0) tone(v.gain, 'sine', 120, t, 0.1, 0.15, { slide: 0.5 });
      }
      v.step += 1; v.next += spb;
    }
  }
  function tick() {
    if (!ctx) return;
    for (const [id, v] of Object.entries(voices)) {
      if (v.dying && ctx.currentTime > v.dieAt) { v.gain.disconnect(); delete voices[id]; continue; }
      scheduleSong(id, v);
    }
    if (!Object.keys(voices).length) { clearInterval(timer); timer = null; }
  }
  function music(id) {
    wanted = id;
    if (!SONGS[id]) return;
    if (!ensure()) return;
    if (playing === id && voices[id] && !voices[id].dying) return;
    const now = ctx.currentTime;
    Object.entries(voices).forEach(([vid, v]) => { if (vid !== id && !v.dying) { v.dying = true; v.dieAt = now + 1.4; v.gain.gain.setTargetAtTime(0.0001, now, 0.35); } });
    let v = voices[id];
    if (!v) { const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(musicBus); v = voices[id] = { gain: g, step: 0, next: now + 0.08 }; }
    v.dying = false; v.gain.gain.cancelScheduledValues(now); v.gain.gain.setTargetAtTime(1, now, 0.45);
    playing = id;
    if (!timer) timer = setInterval(tick, 40);
    tick();
  }
  function stopMusic() {
    if (!ctx) return;
    const now = ctx.currentTime;
    Object.values(voices).forEach((v) => { v.dying = true; v.dieAt = now + 0.8; v.gain.gain.setTargetAtTime(0.0001, now, 0.15); });
    playing = null;
  }

  /* ---------------- efeitos ---------------- */
  const SFX = {
    passo: (t) => noise(sfxBus, t, 0.035, 0.05, { type: 'bandpass', f: 900, q: 1.2 }),
    porta: (t) => { tone(sfxBus, 'sawtooth', 180, t, 0.22, 0.05, { slide: 1.6 }); tone(sfxBus, 'sine', 90, t + 0.2, 0.1, 0.25, { slide: 0.6 }); },
    portaFecha: (t) => tone(sfxBus, 'sine', 120, t, 0.09, 0.3, { slide: 0.5 }),
    talk: (t) => { tone(sfxBus, 'square', 660, t, 0.05, 0.04); tone(sfxBus, 'square', 880, t + 0.06, 0.05, 0.04); },
    blip: (t) => tone(sfxBus, 'square', 990 + Math.random() * 120, t, 0.025, 0.02),
    select: (t) => tone(sfxBus, 'square', 740, t, 0.04, 0.05),
    confirm: (t) => { tone(sfxBus, 'square', 660, t, 0.06, 0.06); tone(sfxBus, 'square', 990, t + 0.06, 0.09, 0.06); },
    cancel: (t) => { tone(sfxBus, 'square', 520, t, 0.06, 0.05); tone(sfxBus, 'square', 360, t + 0.06, 0.09, 0.05); },
    missao: (t) => ['G4', 'C5', 'E5', 'G5', 'C6'].forEach((n, i) => tone(sfxBus, 'square', freq(n), t + i * 0.08, i === 4 ? 0.35 : 0.08, 0.07)),
    descoberta: (t) => ['E5', 'G#5', 'B5', 'E6', 'B5', 'E6'].forEach((n, i) => tone(sfxBus, 'triangle', freq(n), t + i * 0.06, 0.12, 0.14)),
    conquista: (t) => { ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => tone(sfxBus, 'square', freq(n), t + i * 0.1, 0.1, 0.07)); ['F5', 'A5', 'C6', 'F6'].forEach((n, i) => tone(sfxBus, 'square', freq(n), t + 0.45 + i * 0.07, i === 3 ? 0.5 : 0.08, 0.06)); },
    alerta: (t) => { tone(sfxBus, 'square', 880, t, 0.12, 0.06); tone(sfxBus, 'square', 660, t + 0.15, 0.12, 0.06); },
    // nomes antigos do jogo (mantidos)
    step: (t) => { tone(sfxBus, 'triangle', 440, t, 0.12, 0.07); tone(sfxBus, 'triangle', 586, t + 0.085, 0.12, 0.07); },
    retry: (t) => { tone(sfxBus, 'triangle', 300, t, 0.14, 0.07); tone(sfxBus, 'triangle', 236, t + 0.085, 0.14, 0.07); },
    win: (t) => [523, 659, 784, 1047].forEach((f, i) => tone(sfxBus, 'triangle', f, t + i * 0.085, 0.14, 0.08)),
    hit: (t) => { noise(sfxBus, t, 0.08, 0.15, { type: 'lowpass', f: 2500 }); tone(sfxBus, 'square', 660, t, 0.06, 0.06); tone(sfxBus, 'square', 880, t + 0.06, 0.08, 0.06); },
    hurt: (t) => tone(sfxBus, 'sawtooth', 220, t, 0.25, 0.08, { slide: 0.5 }),
    splash: (t) => { noise(sfxBus, t, 0.3, 0.12, { type: 'lowpass', f: 1400 }); [330, 495, 392].forEach((f, i) => tone(sfxBus, 'triangle', f, t + i * 0.08, 0.12, 0.06)); },
    levelup: (t) => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(sfxBus, 'square', f, t + i * 0.08, 0.12, 0.06)),
    crit: (t) => [880, 1175, 1568].forEach((f, i) => tone(sfxBus, 'square', f, t + i * 0.06, 0.1, 0.07)),
  };
  let lastPasso = 0;
  function sfx(name) {
    if (!SFX[name]) return;
    if (!ensure()) return;
    if (name === 'passo') { if (ctx.currentTime - lastPasso < 0.18) return; lastPasso = ctx.currentTime; }
    try { SFX[name](ctx.currentTime + 0.005); } catch { /* sem áudio, o jogo segue */ }
  }

  /* ---------------- ambiente ---------------- */
  const amb = { water: null, wind: null, birds: 0, birdTimer: null };
  const ambTarget = { water: 0, wind: 0, birds: 0 };
  function loopNoise(type, f, q) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    s.connect(fl).connect(g).connect(ambBus); s.start();
    return { s, g, fl };
  }
  function ambient(levels) {
    Object.assign(ambTarget, levels);
    if (!ensure()) return;
    if (!amb.water) amb.water = loopNoise('bandpass', 1100, 0.6);
    if (!amb.wind) amb.wind = loopNoise('lowpass', 420, 0.5);
    const t = ctx.currentTime;
    amb.water.g.gain.setTargetAtTime(ambTarget.water * 0.16, t, 0.4);
    amb.wind.g.gain.setTargetAtTime(ambTarget.wind * 0.09, t, 0.6);
    amb.birds = ambTarget.birds;
    if (!amb.birdTimer) amb.birdTimer = setInterval(() => {
      if (!ctx || !enabled() || amb.birds < 0.05 || Math.random() > amb.birds * 0.7) return;
      const t0 = ctx.currentTime; const base = 2200 + Math.random() * 1400;
      for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) tone(ambBus, 'sine', base, t0 + i * 0.11, 0.07, 0.04, { slide: 1.25 });
    }, 1300);
  }

  // destrava o áudio no primeiro gesto do jogador
  const unlock = () => { if (enabled()) { ensure(); if (wanted) music(wanted); ambient({}); } };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));

  // trilha de cada tela de atividade (a vila escolhe a trilha pela região)
  const VIEW_MUSIC = { start: 'praca', personagem: 'missoes', ubs: 'saude', case: 'saude', biblioteca: 'biblioteca', horta: 'natureza', gruta: 'gruta', mural: 'missoes' };
  const prevOnView = PQ.onView;
  PQ.onView = (view) => { prevOnView?.(view); if (VIEW_MUSIC[view]) music(VIEW_MUSIC[view]); };

  window.PQAudio = {
    supported, music, stopMusic, sfx, ambient, apply,
    get playing() { return playing; },
    get wanted() { return wanted; },
    get started() { return !!ctx; },
    songs: Object.keys(SONGS),
    sfxNames: Object.keys(SFX),
  };
})();
