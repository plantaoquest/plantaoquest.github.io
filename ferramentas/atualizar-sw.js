// Atualiza a lista de arquivos e a VERSAO do sw.js. Rode depois de qualquer mudança no jogo:
//   node ferramentas/atualizar-sw.js
// Sem isso, quem já abriu o jogo continua vendo a versão antiga guardada no navegador.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const raiz = path.join(__dirname, '..');
const ignorar = (p) => p === 'sw.js' || p.endsWith('.md') || p.startsWith('.') || p.startsWith('ferramentas/') || p.includes('LICENSE') || p.startsWith('node_modules/');
const lista = [];
(function andar(dir) {
  for (const nome of fs.readdirSync(dir)) {
    const abs = path.join(dir, nome);
    const rel = path.relative(raiz, abs).split(path.sep).join('/');
    if (fs.statSync(abs).isDirectory()) { if (!ignorar(rel + '/')) andar(abs); } else if (!ignorar(rel)) lista.push(rel);
  }
})(raiz);
lista.sort();
const hash = crypto.createHash('sha256');
lista.forEach((f) => hash.update(fs.readFileSync(path.join(raiz, f))));
const versao = 'pq-' + hash.digest('hex').slice(0, 10);
const swPath = path.join(raiz, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const VERSAO = '[^']*';/, `const VERSAO = '${versao}';`);
sw = sw.replace(/const ARQUIVOS = \[[\s\S]*?\];/, `const ARQUIVOS = ${JSON.stringify(['./', ...lista]).replace(/"/g, "'").replace(/,/g, ', ')};`);
fs.writeFileSync(swPath, sw);
console.log(`sw.js atualizado: ${versao} · ${lista.length} arquivos`);
