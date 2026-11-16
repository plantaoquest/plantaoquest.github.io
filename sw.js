/*
 * Plantão Quest — service worker (modo offline).
 * Na primeira visita guarda todos os arquivos do jogo no navegador. Depois o jogo abre mesmo sem internet.
 * Ao publicar uma versão nova, rode `node ferramentas/atualizar-sw.js` para trocar a VERSAO e a lista.
 */
const VERSAO = 'pq-d573dac877';
const ARQUIVOS = ['./', 'assets/cenarios/natureza.jpg', 'assets/cenarios/praca.jpg', 'assets/cenarios/saude.jpg', 'assets/cenarios/vila.jpg', 'assets/fontes/fontes.css', 'assets/fontes/silkscreen-latin-400-normal.woff2', 'assets/fontes/silkscreen-latin-700-normal.woff2', 'assets/icone-192.png', 'assets/icone-512.png', 'assets/personagens/gabrielle-aborrecido.png', 'assets/personagens/gabrielle-corpo.png', 'assets/personagens/gabrielle-determinado.png', 'assets/personagens/gabrielle-feliz.png', 'assets/personagens/gabrielle-irritado.png', 'assets/personagens/gabrielle-neutro.png', 'assets/personagens/gabrielle-pensativo.png', 'assets/personagens/gabrielle-retrato.png', 'assets/personagens/gabrielle-serio.png', 'assets/personagens/gabrielle-sorriso.png', 'assets/personagens/gabrielle-surpreso.png', 'assets/personagens/mauro-aborrecido.png', 'assets/personagens/mauro-corpo.png', 'assets/personagens/mauro-determinado.png', 'assets/personagens/mauro-feliz.png', 'assets/personagens/mauro-irritado.png', 'assets/personagens/mauro-neutro.png', 'assets/personagens/mauro-pensativo.png', 'assets/personagens/mauro-retrato.png', 'assets/personagens/mauro-serio.png', 'assets/personagens/mauro-sorriso.png', 'assets/personagens/mauro-surpreso.png', 'assets/predios/biblioteca.png', 'assets/predios/capela.png', 'assets/predios/escola.png', 'assets/predios/esporte.png', 'assets/predios/farmacia.png', 'assets/predios/feira.png', 'assets/predios/gruta.png', 'assets/predios/horta.png', 'assets/predios/hospital.png', 'assets/predios/idoso.png', 'assets/predios/moinho.png', 'assets/predios/mulher.png', 'assets/predios/quadro.png', 'assets/predios/treino.png', 'assets/predios/ubs.png', 'assets/predios/vacinacao.png', 'assets/ubs.png', 'data/acervo.js', 'data/cases.js', 'data/mapas.js', 'data/npcs.js', 'data/personagens.js', 'game.css', 'index.html', 'js/art.js', 'js/atividades.js', 'js/audio.js', 'js/core.js', 'js/dialogo.js', 'js/main.js', 'js/missoes.js', 'js/mundo.js', 'js/personagem.js', 'js/sprites.js', 'js/tiles.js', 'js/ubs.js', 'js/vila.js', 'manifest.webmanifest', 'plantao-quest.zip'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copia = res.clone(); caches.open(VERSAO).then((c) => c.put(e.request, copia)); }
    return res;
  })));
});
