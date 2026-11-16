# Plantão Quest · regras do projeto (Antigravity, Claude Code, Cursor)

## O que é
RPG de estudo em pixel art para estudantes de medicina (Vila Murici). Site **100% estático**:
HTML + CSS + JavaScript puro, sem framework, sem build, sem backend. O progresso do jogador
fica no `localStorage` do navegador. Funciona offline depois da 1ª visita (service worker `sw.js`).

## Como rodar
- Teste local: `node ferramentas/servidor-local.js` e abra http://localhost:8080
- Não há `npm install`. Não adicione dependências, bundler, React ou servidor.
- Depois de qualquer mudança em arquivos do jogo: `node ferramentas/atualizar-sw.js`
  (sem isso o modo offline continua servindo a versão antiga).

## Mapa dos arquivos
- `index.html` — página única; carrega os scripts com `defer`, na ordem: dados → arte → core → missões → telas.
- `data/acervo.js` — **temas**: ficha, aula, questões, monstro da gruta, fontes (`FONTES`).
- `data/cases.js` — **casos clínicos** da UBS (cada um aponta para um tema pelo campo `theme`).
- `data/npcs.js` — moradores e falas; `data/mapas.js` — mapas em tiles; `data/personagens.js` — retratos.
- `js/core.js` — estado, salvamento, XP/moedas (`PQ.grant`), sorteio de questões (`PQ.pickQuestion`).
- `js/contas.js` — contas de jogador (nome + PIN, por navegador) e código de progresso para trocar de aparelho. Carrega ANTES de `core.js`.
- `js/missoes.js` — missões do dia e sequência. Eventos: `PQ.missionEvent('answer'|'case'|'lesson'|'cave'|'residente')`.
- `js/mundo.js` — mapa andável, diálogos, quiz com moradores. `js/vila.js` — painel lateral e "próxima ação".
- `js/ubs.js` — consulta em 4 etapas. `js/atividades.js` — biblioteca, horta, lago, gruta.
- `js/art.js`, `js/sprites.js`, `js/tiles.js` — arte desenhada por código (inclui monstros da gruta).

## Regras de conteúdo (obrigatórias)
- Português do Brasil.
- Tratamentos de personagem: **somente "Dr." e "Dra."**. Nunca usar "Dre." nem opção neutra.
- Toda questão: 4 alternativas, `correta` de 0 a 3, `explicacao`, `objetivo` existente no tema,
  `dificuldade` 1 a 3 e `fonte` existente em `FONTES`. IDs únicos e estáveis (o progresso salvo usa os IDs).
- Varie a posição da resposta certa (não deixar quase tudo na B).
- Conteúdo clínico baseado nas fontes citadas (Ministério da Saúde, SBD, ADA, consensos). Personagens fictícios.

## Como adicionar um tema
1. Em `data/acervo.js`, copie um bloco de tema, troque `id` e todos os IDs de questão.
2. Em `data/cases.js`, crie ao menos um caso com `theme: '<id do tema>'`.
3. Monstro novo: adicione um `kind` em `drawMonster` (`js/art.js`) e a provocação em `TAUNTS` (`js/atividades.js`).
4. Rode `node ferramentas/atualizar-sw.js` e teste no navegador.

## Publicação
- GitHub Pages em https://plantaoquest.github.io/ pelo workflow `.github/workflows/publicar.yml` (push na `main` publica sozinho).
- Também funciona em Netlify Drop ou Cloudflare Pages arrastando a pasta. Não precisa de servidor ligado.
