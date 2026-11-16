/*
 * Plantão Quest — moradores e profissionais da Vila Murici (dados separados do motor).
 * Cada NPC: id, nome, função, mapa, posição (tiles, pés), direção, aparência, rota opcional e falas.
 * As falas recebem `ctx` (tema, próxima ação e ações do jogo) e devolvem linhas de diálogo com escolhas.
 * O conteúdo clínico sai do acervo do tema (ficha, objetivos, questões e fontes) — nada é inventado aqui.
 */
(function npcs() {
  'use strict';
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const P = window.PLANTAO_PERSONAGENS || [];
  const preset = (id) => P.find((p) => p.id === id);

  const LOOKS = {
    celia: { skin: '#c98e63', hairStyle: 'coque', hairColor: '#3b2a20', eyes: '#2b1d14', outfit: 'scrub', outfitColor: '#2f7d6b', acc: ['cracha', 'estetoscopio'] },
    joana: { skin: '#f3d2b3', hairStyle: 'longo', hairColor: '#6a4428', eyes: '#3a6ea8', outfit: 'jaleco', outfitColor: '#2f68b0', acc: ['mascara', 'cracha'] },
    jussara: { skin: '#a8714a', hairStyle: 'cacheado', hairColor: '#1d1a18', eyes: '#2b1d14', outfit: 'colete', outfitColor: '#3a6ea8', inner: '#f1efe6', acc: ['bone'] },
    ze: { skin: '#9b6a45', hairStyle: 'raspado', hairColor: '#d9d9d9', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#c96a3a', acc: ['chapeu'] },
    rita: { skin: '#e5b48c', hairStyle: 'curto', hairColor: '#c94f3d', eyes: '#3f8a3e', outfit: 'avental', outfitColor: '#3f8a3e', inner: '#d36a8a', acc: ['brinco'] },
    pedrinho: { skin: '#8a5636', hairStyle: 'moicano', hairColor: '#1d1a18', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#e9b949', pants: '#3a6ea8', acc: [] },
    benedita: { skin: '#c98e63', hairStyle: 'coque', hairColor: '#d9d9d9', eyes: '#2b1d14', outfit: 'avental', outfitColor: '#8e5bb9', inner: '#d36a8a', acc: ['oculos'] },
    lourival: { skin: '#e5b48c', hairStyle: 'raspado', hairColor: '#d9d9d9', eyes: '#3a6ea8', outfit: 'camiseta', outfitColor: '#7a2e3a', pants: '#6b5a44', acc: ['oculos', 'chapeu'] },
    marlene: { skin: '#5e3a26', hairStyle: 'trancas', hairColor: '#1d1a18', eyes: '#2b1d14', outfit: 'scrub', outfitColor: '#d36a8a', acc: ['cracha'] },
    iracema: { skin: '#a8714a', hairStyle: 'coque', hairColor: '#d9d9d9', eyes: '#2b1d14', outfit: 'jaleco', outfitColor: '#34508a', acc: ['oculos', 'cracha'] },
    lurdes: { skin: '#f3d2b3', hairStyle: 'curto', hairColor: '#b5733a', eyes: '#3f8a3e', outfit: 'colete', outfitColor: '#34508a', inner: '#f1efe6', acc: ['oculos'] },
    otavio: { skin: '#5e3a26', hairStyle: 'curto', hairColor: '#1d1a18', eyes: '#2b1d14', outfit: 'jaleco', outfitColor: '#2a2a33', acc: ['oculos', 'barba'] },
    bruno: { skin: '#c98e63', hairStyle: 'raspado', hairColor: '#3b2a20', eyes: '#2b1d14', outfit: 'scrub', outfitColor: '#c96a4a', acc: ['estetoscopio'] },
    caio: { skin: '#e5b48c', hairStyle: 'curto', hairColor: '#e0bf72', eyes: '#3a6ea8', outfit: 'scrub', outfitColor: '#3a6ea8', acc: ['cracha'] },
    duda: { skin: '#8a5636', hairStyle: 'cacheado', hairColor: '#3b2a20', eyes: '#2b1d14', outfit: 'scrub', outfitColor: '#8e5bb9', acc: ['oculos'] },
    akira: { skin: '#f3d2b3', hairStyle: 'curto', hairColor: '#1d1a18', eyes: '#2b1d14', outfit: 'jaleco', outfitColor: '#3f8a3e', acc: ['cracha'] },
    helena: { skin: '#e5b48c', hairStyle: 'longo', hairColor: '#1d1a18', eyes: '#7a5a2a', outfit: 'jaleco', outfitColor: '#2f6f9a', acc: ['estetoscopio', 'cracha'] },
    sonia: { skin: '#a8714a', hairStyle: 'curto', hairColor: '#4f2a20', eyes: '#2b1d14', outfit: 'colete', outfitColor: '#2f6f9a', inner: '#f1efe6', acc: ['cracha'] },
    kelly: { skin: '#c98e63', hairStyle: 'trancas', hairColor: '#1d1a18', eyes: '#2b1d14', outfit: 'scrub', outfitColor: '#d63b3b', acc: ['touca', 'cracha'] },
    moacir: { skin: '#9b6a45', hairStyle: 'raspado', hairColor: '#9a9a9a', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#7fb6ea', pants: '#7fb6ea', acc: [] },
    lucia: { skin: '#8a5636', hairStyle: 'coque', hairColor: '#1d1a18', eyes: '#2b1d14', outfit: 'jaleco', outfitColor: '#8e5bb9', acc: ['estetoscopio', 'cracha'] },
    paula: { skin: '#e5b48c', hairStyle: 'longo', hairColor: '#6a4428', eyes: '#3f8a3e', outfit: 'camiseta', outfitColor: '#f08bb4', acc: ['brinco'] },
    juca: { skin: '#a8714a', hairStyle: 'curto', hairColor: '#3b2a20', eyes: '#2b1d14', outfit: 'avental', outfitColor: '#e8455a', inner: '#f1efe6', acc: ['bone'] },
    cida: { skin: '#f3d2b3', hairStyle: 'cacheado', hairColor: '#c94f3d', eyes: '#3a6ea8', outfit: 'avental', outfitColor: '#f08a24', inner: '#e9b949', acc: ['brinco'] },
    patricia: { skin: '#c98e63', hairStyle: 'coque', hairColor: '#3b2a20', eyes: '#2b1d14', outfit: 'jaleco', outfitColor: '#2f68b0', acc: ['touca', 'cracha'] },
    rafa: { skin: '#c98e63', hairStyle: 'trancas', hairColor: '#3b2a20', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#3f8a6a', acc: ['oculos'] },
  };

  // linha de diálogo de um NPC
  const L = (n, text, mood = 'happy', extra = {}) => ({ who: n.name, role: n.role, look: n.look, mood, text, ...extra });

  const list = [
    /* ---------------- UBS Murici ---------------- */
    { id: 'celia', name: 'Enfermeira Célia', role: 'enfermeira da UBS', map: 'int-ubs', x: 13, y: 9.1, dir: 'down', look: LOOKS.celia, reach: 46, mission: (ctx) => ctx.next.place === 'ubs',
      talk(ctx) {
        const n = this; const c = ctx.case; const s = c && ctx.state.cases[c.id];
        const sobre = () => [
          L(n, 'A UBS Murici tem recepção, sala de vacinação, sala de procedimentos e o consultório 1.', 'smile'),
          L(n, 'Na vacinação a Joana confere a caderneta de cada morador. No consultório ficam os prontuários dos plantões.', 'happy'),
          L(n, 'Precisando, é só voltar aqui na recepção.', 'smile', { choices: [{ label: 'Voltar às opções', onPick: () => n.talk(ctx) }, { label: 'Obrigado(a)!', cancel: true }] }),
        ];
        const iniciar = () => {
          if (c && s && !s.completions) return [L(n, `${c.patient.name} já está na sala de espera. Vou chamar para o consultório!`, 'smile', { choices: [{ label: 'Vamos lá!', onPick: () => { ctx.openCase(c.id); } }] })];
          if (c) return [L(n, `O atendimento de ${c.patient.name} já foi concluído. Você pode rejogar pelo quadro de plantões.`, 'smile', { choices: [{ label: 'Abrir quadro de plantões', onPick: () => { ctx.go('ubs'); } }, { label: 'Depois', cancel: true }] })];
          return [L(n, 'Ainda não chegou paciente deste tema. Veja o quadro de plantões.', 'neutral', { choices: [{ label: 'Abrir quadro', onPick: () => { ctx.go('ubs'); } }] })];
        };
        return [L(n, PQ.fill('Olá, {doc}! Seja bem-vindo(a) à UBS Murici. Como posso ajudar?'), 'smile', { choices: [
          { label: 'Iniciar atendimento', onPick: iniciar },
          { label: 'Ver pacientes do dia', onPick: () => { ctx.go('ubs'); } },
          { label: 'Perguntar sobre a unidade', onPick: sobre },
          { label: 'Sair', cancel: true },
        ] })];
      } },
    { id: 'joana', name: 'Joana', role: 'sala de vacinação', map: 'int-ubs', x: 4.5, y: 7.4, dir: 'down', look: LOOKS.joana,
      talk(ctx) {
        const n = this;
        return [L(n, PQ.fill('Oi, {doc}! Aqui na vacinação eu confiro a caderneta de quem passa pelo posto.'), 'smile'),
          L(n, 'Quer revisar com uma pergunta rápida do tema enquanto organizo as doses do dia?', 'happy', { choices: [{ label: 'Quero uma pergunta', onPick: () => ctx.quiz(n, 1) }, { label: 'Agora não', cancel: true }] })];
      } },
    { id: 'paciente', name: '', role: 'paciente do dia', map: 'int-ubs', x: 5, y: 14.1, dir: 'up', look: null, patient: true, mood: 'sick', mission: (ctx) => ctx.next.place === 'ubs',
      talk(ctx) {
        const c = ctx.case; if (!c) return [];
        const n = { ...this, name: c.patient.name, look: c.look };
        return [L(n, PQ.fill(c.arrival || `Doutor(a), vim por causa de ${ctx.t.short.toLowerCase()}...`), 'sick'),
          L(n, 'Posso entrar para a consulta?', 'sad', { choices: [{ label: 'Iniciar atendimento', onPick: () => { ctx.openCase(c.id); } }, { label: 'Aguarde um pouco', cancel: true }] })];
      } },

    { id: 'patricia', name: 'Enf.ª Patrícia', role: 'vacinadora', map: 'int-vacinacao', x: 7, y: 6.2, dir: 'down', look: LOOKS.patricia,
      talk(ctx) {
        const n = this;
        return [L(n, PQ.fill('Bem-vindo(a) à Sala de Vacinação, {doc}! Aqui a gente confere a caderneta e organiza as doses do dia.'), 'smile'),
          L(n, 'Topa uma pergunta rápida do tema enquanto a geladeira está aberta?', 'happy', { choices: [{ label: 'Quero uma pergunta', onPick: () => ctx.quiz(n, 1) }, { label: 'Agora não', cancel: true }] })];
      } },

    /* ---------------- vila: moradores ---------------- */
    { id: 'jussara', name: 'Jussara', role: 'agente comunitária', map: 'vila', x: 22, y: 30.6, dir: 'down', look: LOOKS.jussara, speed: 26,
      route: [[22, 30.6], [34, 30.6], [22, 30.6], [12.5, 30.6]],
      talk(ctx) {
        const n = this; const t = ctx.t;
        return [L(n, PQ.fill('Oi, {doc}! Eu visito as famílias da vila todos os dias.')), L(n, `Uma dica de ${t.short.toLowerCase()} que eu sempre repito: ${pick(t.ficha.pontos)}`, 'smile'),
          L(n, `Próximo passo para você: ${ctx.next.text}`, 'happy', { choices: [{ label: `Mostrar o caminho (${ctx.next.label})`, onPick: () => { ctx.guide(ctx.next.place); } }, { label: 'Valeu, Jussara!', cancel: true }] })];
      } },
    { id: 'pedrinho', name: 'Pedrinho', role: 'criança da vila', map: 'vila', x: 41.4, y: 35.6, dir: 'down', look: LOOKS.pedrinho, speed: 40,
      route: [[41.4, 35.6], [41.4, 27.3], [53, 27.3], [53, 35.6]],
      talk(ctx) {
        const n = this;
        return [L(n, PQ.fill('Ê, {doc}! Aposto que eu dou a volta no chafariz mais rápido que você!'), 'happy'),
          L(n, 'Minha vó mora na Casa do Idoso. Ela diz que lá todo mundo tem a hora certa do remédio.', 'smile')];
      } },
    { id: 'ze', name: 'Seu Zé', role: 'pescador', map: 'vila', x: 25.8, y: 48.4, dir: 'down', look: LOOKS.ze,
      talk(ctx) {
        const n = this;
        return [L(n, PQ.fill('Ô {doc}! O lago tá cheio de tambaqui hoje.')),
          L(n, `Cada peixe que morde a isca traz uma pergunta de ${ctx.t.short.toLowerCase()}. Errou, ele foge… mas a dúvida volta para você revisar.`, 'smile', { choices: [{ label: 'Quero pescar', onPick: () => { ctx.go('horta'); } }, { label: 'Depois, Seu Zé', cancel: true }] })];
      } },
    { id: 'rafa', name: 'Rafa', role: 'estudante de medicina', map: 'vila', x: 29.5, y: 41.3, dir: 'down', look: LOOKS.rafa,
      talk(ctx) {
        const n = this; const o = pick(ctx.t.objetivos || ['revisar o tema']);
        return [L(n, PQ.fill('Fala, {doc}! Tô estudando para a prova da Escola da Saúde.'), 'smile'), L(n, `Meu objetivo de hoje: ${o.charAt(0).toLowerCase()}${o.slice(1)}`, 'thinking')];
      } },
    { id: 'lourival', name: 'Seu Lourival', role: 'morador da Casa do Idoso', map: 'vila', x: 24.5, y: 42.8, dir: 'down', look: LOOKS.lourival, speed: 16,
      route: [[24.5, 42.8], [29.5, 42.8], [34.5, 42.8], [29.5, 42.8]],
      talk(ctx) {
        const n = this;
        return [L(n, 'Bom dia! Eu faço minha caminhada aqui na frente todo dia, devagarinho.', 'smile'), L(n, 'Depois tem damas com a Benedita. Ela sempre ganha!', 'happy')];
      } },
    { id: 'juca', name: 'Seu Juca', role: 'feirante (frutas)', map: 'vila', x: 64, y: 30.4, dir: 'down', look: LOOKS.juca,
      talk(ctx) {
        const n = this; const inv = Object.keys(ctx.state.inventory || {}).length;
        return [L(n, 'Olha a fruta fresquinha da feira! Mas pra você, doutor(a), o pagamento é em conhecimento.', 'happy'),
          L(n, inv ? `Vi que seu cesto já tem ${inv} tipo${inv > 1 ? 's' : ''} de colheita. Capricha na horta!` : 'Seu cesto tá vazio! A horta comunitária dá colheita a cada pergunta certa.', 'smile')];
      } },
    { id: 'cida', name: 'Dona Cida', role: 'feirante (pastel)', map: 'vila', x: 70, y: 30.4, dir: 'down', look: LOOKS.cida,
      talk(ctx) {
        const n = this;
        return [L(n, 'Pastel quentinho saindo! Aqui na praça de alimentação todo mundo se encontra no fim do plantão.', 'happy'),
          L(n, 'Lava bem as mãos antes de comer, viu? Aprendi isso com a Jussara.', 'smile')];
      } },

    /* ---------------- interiores ---------------- */
    { id: 'rita', name: 'Dona Rita', role: 'dona da quitanda', map: 'int-quitanda', x: 7, y: 3.35, dir: 'down', look: LOOKS.rita, reach: 44,
      talk(ctx) {
        const n = this; const st = ctx.state;
        return [L(n, st.purchases.fachada ? 'O posto ficou um brinco com a reforma!' : 'Sabia que dá para reformar o posto com as suas moedas? A fachada nova custa 60.'),
          L(n, 'E não esquece de regar a horta. Planta com sede não dá fruto!', 'smile', { choices: [{ label: 'Ver reformas do posto', onPick: () => { ctx.go('ubs'); } }, { label: 'Tchau, Dona Rita', cancel: true }] })];
      } },
    { id: 'iracema', name: 'Prof.ª Iracema', role: 'professora da biblioteca', map: 'int-biblioteca', x: 10.5, y: 3.9, dir: 'down', look: LOOKS.iracema, mission: (ctx) => ctx.next.place === 'biblioteca',
      talk(ctx) {
        const n = this; const l = ctx.state.lessons[ctx.t.id];
        return [L(n, PQ.fill(`Bem-vindo(a), {doc}. Hoje a lousa é sobre ${ctx.t.short.toLowerCase()}.`), 'smile'),
          L(n, l?.done ? 'Você já concluiu a aula. Quer rever o esquema?' : 'A aula tem a ficha do tema, o esquema na lousa e uma pergunta no meio.', 'happy', { choices: [{ label: l?.done ? 'Rever a aula' : 'Começar a aula', onPick: () => { ctx.go('biblioteca'); } }, { label: 'Vou ler as estantes primeiro', cancel: true }] })];
      } },
    { id: 'lurdes', name: 'Dona Lurdes', role: 'bibliotecária', map: 'int-biblioteca', x: 4, y: 10.25, dir: 'down', look: LOOKS.lurdes, reach: 44,
      talk(ctx) {
        const n = this;
        return [L(n, 'Silêncio na biblioteca, por favor… mas pode perguntar baixinho!', 'smile'),
          L(n, 'Cada estante tem um livro: a ficha do tema, as fontes oficiais, as suas dúvidas e a caderneta. Chegue perto e aperte E.', 'happy')];
      } },
    { id: 'otavio', name: 'Prof. Otávio', role: 'professor da Escola da Saúde', map: 'int-escola', x: 7.5, y: 3.9, dir: 'down', look: LOOKS.otavio,
      talk(ctx) {
        const n = this;
        return [L(n, PQ.fill('Olá, {doc}! Topa um simulado relâmpago de três perguntas?'), 'determined', { choices: [{ label: 'Topo! Começar simulado', onPick: () => ctx.quiz(n, 3) }, { label: 'Hoje não, professor', cancel: true }] })];
      } },
    { id: 'caio', name: 'Caio', role: 'estudante', map: 'int-escola', x: 4, y: 9, dir: 'up', look: LOOKS.caio,
      talk() { return [L(this, 'O Prof. Otávio faz simulado relâmpago. Errou? A dúvida vai para a fila de revisão.', 'thinking')]; } },
    { id: 'duda', name: 'Duda', role: 'estudante', map: 'int-escola', x: 10, y: 9, dir: 'up', look: LOOKS.duda,
      talk() { return [L(this, 'No treinamento tem boneco e maca. Eu sempre treino antes do plantão!', 'happy')]; } },
    { id: 'bruno', name: 'Bruno', role: 'instrutor do treinamento', map: 'int-escola', x: 18.5, y: 6.6, dir: 'down', look: LOOKS.bruno,
      talk() { return [L(this, 'Aqui é o centro de treinamento: boneco, maca e cadeira de rodas para praticar com calma.', 'smile'), L(this, 'As estações práticas entram numa próxima expansão, com revisão clínica do conteúdo.', 'neutral')]; } },
    { id: 'benedita', name: 'Dona Benedita', role: 'moradora da Casa do Idoso', map: 'int-idoso', x: 14, y: 5, dir: 'down', look: LOOKS.benedita,
      talk() { return [L(this, 'Ah, que visita boa! Senta um pouquinho, meu filho.', 'happy'), L(this, 'Meu neto Pedrinho vive correndo na praça. Diz que vai ser médico igual a você!', 'smile')]; } },
    { id: 'marlene', name: 'Marlene', role: 'cuidadora', map: 'int-idoso', x: 10, y: 8.5, dir: 'down', look: LOOKS.marlene,
      talk() { return [L(this, 'Aqui na Casa do Idoso Viver Bem a rotina é tudo: horário de remédio, refeição e passeio.', 'smile'), L(this, 'Quando alguém precisa de consulta, a gente leva até a UBS.', 'happy')]; } },
    { id: 'akira', name: 'Sr. Akira', role: 'farmacêutico', map: 'int-farmacia', x: 7, y: 4.85, dir: 'down', look: LOOKS.akira, reach: 44,
      talk(ctx) {
        const n = this; const f = ctx.t.ficha;
        return [L(n, PQ.fill('Boa tarde, {doc}! Receita na mão? Brincadeira, aqui a gente orienta também.'), 'smile'),
          L(n, `Sobre ${ctx.t.short.toLowerCase()}: ${f.resumo}`, 'thinking')];
      } },
    { id: 'helena', name: 'Dra. Helena', role: 'plantonista do hospital', map: 'int-hospital', x: 15, y: 8.4, dir: 'down', look: LOOKS.helena,
      talk(ctx) {
        const n = this; const t = ctx.t;
        const desafio = () => ctx.quiz(n, 5, { minLevel: 3, source: 'residente', onEnd: (total, count) => {
          PQ.missionEvent?.('residente');
          const perfect = total === count;
          if (perfect) PQ.grant(`residente:${t.id}`, { xp: 40, coins: 30, label: `Desafio do Residente gabaritado · ${t.short}` });
          PQ.play(perfect ? 'conquista' : 'missao'); PQ.renderHeader();
          return [L(n, `Plantão encerrado: ${total} de ${count}. ${perfect ? 'Gabaritou! Você já raciocina como residente.' : total >= 3 ? 'Bom raciocínio. As que você errou foram para a fila de revisão.' : 'Casos difíceis mesmo. Revise as dúvidas na horta e no lago e volte aqui.'}`, perfect ? 'happy' : 'smile')];
        } });
        return [L(n, 'Bem-vindo(a) ao Hospital Comunitário Antonella! A ala de casos complexos acabou de abrir.', 'smile'),
          L(n, PQ.fill(`Topa o Desafio do Residente, {doc}? São 5 questões difíceis de ${t.short.toLowerCase()}, sem dicas. Gabaritando, você ganha um bônus.`), 'serious', { choices: [{ label: 'Encarar o desafio', onPick: desafio }, { label: 'Agora não', cancel: true }] })];
      } },
    { id: 'sonia', name: 'Sônia', role: 'recepção do hospital', map: 'int-hospital', x: 15, y: 10.45, dir: 'down', look: LOOKS.sonia, reach: 44,
      talk() { return [L(this, 'Recepção do Hospital Antonella, bom dia! A triagem fica logo à frente, por classificação de risco.', 'smile')]; } },
    { id: 'kelly', name: 'Kelly', role: 'enfermeira da triagem', map: 'int-hospital', x: 13, y: 6.6, dir: 'down', look: LOOKS.kelly,
      talk(ctx) { const n = this; return [L(n, 'Na triagem a cor da pulseira mostra a prioridade de cada paciente.', 'serious'), L(n, 'Quer treinar raciocínio com uma pergunta do tema?', 'smile', { choices: [{ label: 'Quero!', onPick: () => ctx.quiz(n, 1) }, { label: 'Agora não', cancel: true }] })]; } },
    { id: 'moacir', name: 'Seu Moacir', role: 'paciente internado', map: 'int-hospital', x: 4.5, y: 6.5, dir: 'down', look: LOOKS.moacir, mood: 'sick',
      talk() { return [L(this, 'Tô me recuperando, doutor(a). A comida daqui até que é boa!', 'sad'), L(this, 'A enfermeira passa de hora em hora. Me sinto seguro.', 'smile')]; } },
    { id: 'lucia', name: 'Enf.ª Lúcia', role: 'Saúde da Mulher', map: 'int-mulher', x: 11, y: 5.5, dir: 'down', look: LOOKS.lucia,
      talk() { return [L(this, 'Aqui no ambulatório de Saúde da Mulher fazemos acolhimento, pré-natal e prevenção.', 'smile'), L(this, 'Os casos desta área entram numa próxima expansão do acervo, com revisão clínica.', 'neutral')]; } },
    { id: 'paula', name: 'Paula', role: 'paciente em espera', map: 'int-mulher', x: 3, y: 5, dir: 'down', look: LOOKS.paula,
      talk() { return [L(this, 'Vim para a consulta de rotina. A enfermeira Lúcia é muito atenciosa!', 'happy')]; } },
  ];

  // personagens prontos (Mauro e Gabrielle) também moram na vila
  const mauro = preset('mauro'); const gabi = preset('gabrielle');
  if (mauro) list.push({ id: 'mauro', name: mauro.name, role: mauro.npc.role, map: 'vila', x: 44.5, y: 19.7, dir: 'down', look: mauro.look, preset: true, talk(ctx) { return mauro.npc.lines(ctx.t, ctx).map((ln) => (typeof ln === 'string' ? L(this, PQ.fill(ln)) : L(this, PQ.fill(ln.text), ln.mood))); } });
  if (gabi) list.push({ id: 'gabrielle', name: gabi.name, role: gabi.npc.role, map: 'vila', x: 86.6, y: 61, dir: 'down', look: gabi.look, preset: true, talk(ctx) { return gabi.npc.lines(ctx.t, ctx).map((ln) => (typeof ln === 'string' ? L(this, PQ.fill(ln)) : L(this, PQ.fill(ln.text), ln.mood))); } });

  // textos de objetos e placas
  const SAY = {
    chafariz: (ctx) => [{ who: 'Chafariz', role: 'Praça Central', look: null, text: 'A água canta no chafariz. Moradores jogam moedas e fazem pedidos para um bom plantão.', sign: true }],
    'placa-praca': () => [{ who: 'Placa', role: 'Praça Central', text: 'PRAÇA CENTRAL · Norte: UBS Murici e Distrito da Saúde · Leste: Feira · Oeste: bairro · Sul: horta, lago e cachoeira.', sign: true }],
    feira: () => [{ who: 'Placa', role: 'Feira da Vila', text: 'FEIRA DA VILA · frutas, verduras, pastel, peixe, açaí e ervas. Praça de alimentação logo ao lado.', sign: true }],
    trilha: () => [{ who: 'Placa', role: 'Trilha', text: 'TRILHA DA CACHOEIRA · siga as pontes para o leste. A Gruta Velha fica no fim da trilha.', sign: true }],
    cachoeira: () => [{ who: 'Cachoeira', role: 'Natureza', text: 'O barulho da água acalma. Respire fundo: uma pausa curta também faz parte do estudo.', sign: true }],
    pomar: (ctx) => [{ who: 'Pomar', role: 'Natureza', text: 'As frutas ainda estão verdes. A colheita de verdade é na horta comunitária, a cada pergunta certa.', sign: true }],
    boneco: () => [{ who: 'Boneco de treino', role: 'Escola da Saúde', text: 'Um boneco de treinamento. As estações práticas chegam numa próxima expansão, com revisão clínica.', sign: true }],
    vacinas: () => [{ who: 'Geladeira de vacinas', role: 'Sala de vacinação', text: 'Termômetro marcando a temperatura certinha. A Joana anota tudo na planilha da sala.', sign: true }],
    obras: () => [{ who: 'Aviso', role: 'Hospital Antonella', text: 'ALA DE CASOS COMPLEXOS EM OBRAS. Casos de maior complexidade entram numa próxima expansão.', sign: true }],
    damas: () => [{ who: 'Tabuleiro', role: 'Casa do Idoso', text: 'Uma partida de damas pela metade. As pedras brancas estão ganhando.', sign: true }],
    esporte: () => [{ who: 'Esporte e Lazer', role: 'Bairro', text: 'Quadra, traves e aparelhos de ginástica. À tarde a vila inteira joga bola aqui.', sign: true }],
    moinho: () => [{ who: 'Moinho do rio', role: 'Natureza', text: 'A roda d’água gira devagar. A ponte de madeira liga a trilha ao pomar.', sign: true }],
    capela: () => [{ who: 'Capela de São Murici', role: 'Altar', text: 'Um lugar silencioso para respirar antes do plantão.', sign: true }],
    bilhete: () => [{ who: 'Bilhete', role: 'Casa de moradores', text: '"Fui à feira, volto já. A chave está com a Jussara."', sign: true }],
  };

  window.PLANTAO_NPCS = list;
  window.PLANTAO_SAY = SAY;
})();
