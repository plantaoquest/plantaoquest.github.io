// Servidor local mínimo, sem instalar nada: node ferramentas/servidor-local.js  → http://localhost:8080
// Só serve para testar no seu computador. O site publicado não precisa de servidor ligado.
const http = require('http');
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.json': 'application/json' };
const porta = Number(process.env.PORT) || 8080;
http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const arq = path.normalize(path.join(raiz, rel));
  if (!arq.startsWith(raiz)) { res.writeHead(403); return res.end(); }
  fs.readFile(arq, (err, dados) => {
    if (err) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(arq).toLowerCase()] || 'application/octet-stream' });
    res.end(dados);
  });
}).listen(porta, () => console.log(`Plantão Quest rodando em http://localhost:${porta}`));
