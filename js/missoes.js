/*
 * Plantão Quest — missões do dia e sequência de dias.
 *
 * Cada dia sorteia 3 missões (sempre uma difícil). O progresso vem dos eventos do jogo:
 *   PQ.missionEvent('answer', { ok, source, level, resolved }) · 'case' · 'lesson' · 'cave' · 'residente'
 * As recompensas entram no livro-caixa (state.ledger) com chave única por dia, então não duplicam.
 */
(function missoes() {
  'use strict';
  const { state, esc, today } = PQ;

  const KINDS = {
    acertos: { label: 'Acerte 6 questões em qualquer atividade', target: 6, on: (e, d) => e === 'answer' && d.ok },
    dificeis: { label: 'Acerte 2 questões difíceis (nível 3)', target: 2, hard: true, on: (e, d) => e === 'answer' && d.ok && d.level >= 3 },
    residente: { label: 'Encare o Desafio do Residente no hospital', target: 1, hard: true, on: (e) => e === 'residente' },
    horta: { label: 'Responda 3 perguntas na horta', target: 3, on: (e, d) => e === 'answer' && d.source === 'harvest' },
    lago: { label: 'Responda 3 perguntas pescando no lago', target: 3, on: (e, d) => e === 'answer' && d.source === 'fish' },
    moradores: { label: 'Responda 2 perguntas de moradores da vila', target: 2, on: (e, d) => e === 'answer' && d.source === 'npc' },
    duvida: { label: 'Resolva 1 dúvida da fila de revisão', target: 1, on: (e, d) => e === 'answer' && d.resolved },
    caso: { label: 'Conclua ou rejogue 1 plantão na UBS', target: 1, on: (e) => e === 'case' },
    gruta: { label: 'Vença o chefe da Gruta Velha', target: 1, hard: true, on: (e) => e === 'cave' },
    aula: { label: 'Assista a uma aula completa na biblioteca', target: 1, on: (e) => e === 'lesson' },
  };
  const REWARD = { xp: 10, coins: 10 };
  const BONUS = { xp: 20, coins: 25 };

  function seeded(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; return (h >>> 0) / 4294967296; }; }
  function draw(date) {
    const rnd = seeded(`pq-${date}`);
    const pick = (list) => list.splice(Math.floor(rnd() * list.length), 1)[0];
    const hard = Object.keys(KINDS).filter((k) => KINDS[k].hard);
    const easy = Object.keys(KINDS).filter((k) => !KINDS[k].hard);
    return [pick(hard), pick(easy), pick(easy)].map((id) => ({ id, progress: 0 }));
  }
  const dayBefore = (date) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  function daily() {
    const d = today();
    let s = state.daily;
    const valid = s && typeof s === 'object' && Array.isArray(s.missions) && s.missions.every((m) => KINDS[m?.id]);
    if (!valid) s = state.daily = { date: d, missions: draw(d), streak: 0, lastFull: null };
    if (s.date !== d) {
      if (s.lastFull && s.lastFull !== dayBefore(d) && s.lastFull !== d) s.streak = 0;
      s.date = d; s.missions = draw(d);
    }
    return s;
  }

  function missionEvent(kind, detail = {}) {
    const s = daily(); let changed = false;
    s.missions.forEach((m) => {
      const k = KINDS[m.id];
      if (m.progress >= k.target || !k.on(kind, detail)) return;
      m.progress += 1; changed = true;
      if (m.progress >= k.target) PQ.grant(`daily:${s.date}:${m.id}`, { ...REWARD, label: `Missão do dia: ${k.label}` });
    });
    if (changed && s.missions.every((m) => m.progress >= KINDS[m.id].target) && s.lastFull !== s.date) {
      s.streak = s.lastFull === dayBefore(s.date) ? (s.streak || 0) + 1 : 1;
      s.lastFull = s.date;
      PQ.grant(`daily:${s.date}:bonus`, { ...BONUS, label: `Missões do dia completas · ${s.streak} ${s.streak === 1 ? 'dia' : 'dias'} seguidos` });
      PQ.play?.('conquista');
    }
    if (changed) PQ.save();
  }

  function missionsHTML() {
    const s = daily();
    const done = s.missions.filter((m) => m.progress >= KINDS[m.id].target).length;
    return `<div class="side-card missions-card">
      <div class="eyebrow">MISSÕES DO DIA · ${done}/3</div>
      <ul class="mission-list">${s.missions.map((m) => {
        const k = KINDS[m.id]; const p = Math.min(m.progress, k.target); const ok = p >= k.target;
        return `<li class="mission-row${ok ? ' done' : ''}${k.hard ? ' hard' : ''}">
          <span class="mission-check" aria-hidden="true">${ok ? '✓' : k.hard ? '★' : '•'}</span>
          <span class="mission-text">${esc(k.label)}<small>${p}/${k.target} · +${REWARD.xp} XP · +${REWARD.coins} moedas</small>
            <i class="mission-bar"><b style="width:${(p / k.target) * 100}%"></b></i></span></li>`;
      }).join('')}</ul>
      <p class="mission-foot">${s.lastFull === s.date ? `Baú do dia aberto! Sequência: ${s.streak} ${s.streak === 1 ? 'dia' : 'dias'}.` : `Complete as 3 para abrir o baú (+${BONUS.xp} XP · +${BONUS.coins} moedas).${s.streak ? ` Sequência atual: ${s.streak} ${s.streak === 1 ? 'dia' : 'dias'}.` : ''}`}</p>
    </div>`;
  }

  Object.assign(PQ, { missionEvent, missionsHTML, dailyMissions: daily, MISSION_KINDS: KINDS });
})();
