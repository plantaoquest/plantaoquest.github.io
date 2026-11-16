/*
 * Plantão Quest — personagens prontos, criados a partir das fichas enviadas pelo autor do jogo.
 * Cada um aparece como morador da vila (com retratos e expressões próprios nos diálogos)
 * e pode ser escolhido como personagem jogável no criador.
 *
 * look.portraits: prefixo dos arquivos de retrato em assets/personagens/ (ex.: "assets/personagens/mauro-").
 * Expressões disponíveis: neutro, sorriso, feliz, serio, aborrecido, surpreso, irritado, pensativo, determinado.
 */
window.PLANTAO_PERSONAGENS = [
  {
    id: 'mauro',
    name: 'Mauro',
    title: 'Dr.',
    cls: 'emergencia',
    trait: 'determinado',
    motto: 'Vamos em frente! Ainda não acabou.',
    body: 'assets/personagens/mauro-corpo.png',
    bio: 'Preceptor do posto. Firme nas decisões, nunca deixa um plantão pela metade.',
    look: { skin: '#d99a6c', hairStyle: 'curto', hairColor: '#1d1a18', eyes: '#3b2a20', outfit: 'camiseta', outfitColor: '#2a2433', pants: '#2a2a33', acc: ['barba'], portraits: 'assets/personagens/mauro-' },
    npc: {
      role: 'preceptor do posto',
      home: { x: [54, 58], y: [38, 41] },
      lines: (t, ctx) => [
        { mood: 'smile', text: '{doc}! Bem-vindo ao plantão na Vila Murici.' },
        { mood: 'thinking', text: `Hoje a vila inteira gira em torno de ${t.name.toLowerCase()}. ${ctx.next.text}` },
        { mood: 'determined', text: 'Vamos em frente! Ainda não acabou.' },
      ],
    },
  },
  {
    id: 'gabrielle',
    name: 'Gabrielle',
    title: 'Dra.',
    cls: 'clinica',
    trait: 'curioso',
    motto: 'Vamos juntos! Eu consigo!',
    body: 'assets/personagens/gabrielle-corpo.png',
    bio: 'Guardiã da Gruta Velha. Observadora, pega a pista que ninguém viu.',
    look: { skin: '#efc4a2', hairStyle: 'longo', hairColor: '#b8894a', eyes: '#5a4a2a', outfit: 'camiseta', outfitColor: '#26335e', pants: '#d9cfb0', acc: ['brinco'], portraits: 'assets/personagens/gabrielle-' },
    npc: {
      role: 'guardiã da Gruta Velha',
      home: { x: [80, 86], y: [65, 70] },
      lines: (t) => [
        { mood: 'smile', text: 'Oi, {doc}! Eu cuido da entrada da Gruta Velha.' },
        { mood: 'serious', text: `O ${t.monster.name} anda rondando por aqui. Lembre: questão de nível 3 tira 18 de vida dele, mas errar faz ele revidar.` },
        { mood: 'thinking', text: 'Antes de entrar, passe na horta e no lago. As dúvidas que você revisa lá entram primeiro na batalha.' },
        { mood: 'determined', text: 'Vamos juntos! Eu consigo!' },
      ],
    },
  },
];
