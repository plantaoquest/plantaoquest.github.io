# Plantão Quest — como rodar e publicar

O jogo é um **site estático**: só arquivos (HTML, CSS, JS e imagens). Não tem servidor,
banco de dados nem mensalidade. Depois de publicado, ele fica no ar sozinho, e o progresso
de cada jogador fica salvo no navegador dele.

## 1. Abrir no Antigravity
1. Descompacte `plantao-quest.zip` numa pasta, por exemplo `Documentos\plantao-quest`.
2. No Antigravity: **File → Open Folder** e escolha essa pasta.
3. O agente já lê o arquivo `AGENTS.md`, que explica o projeto e as regras (ex.: só "Dr." e "Dra.").
4. Para testar, peça ao agente ou rode no terminal:
   ```
   node ferramentas/servidor-local.js
   ```
   e abra http://localhost:8080. (Precisa do Node instalado; o Antigravity normalmente já tem.)
   Sem Node: dá para abrir o `index.html` direto com dois cliques. Só o modo offline não liga assim.

## 2. Colocar num site próprio (grátis, sem servidor ligado)

### Opção A — GitHub Pages (recomendada: atualiza sozinho)
1. Crie uma conta em github.com e um repositório **público** chamado `plantao-quest`.
2. No Antigravity, peça: *"inicialize o git, faça o commit e envie para github.com/SEU-USUARIO/plantao-quest na branch main"*.
3. No GitHub: **Settings → Pages → Source: GitHub Actions**.
4. Em 1–2 minutos o jogo estará em `https://SEU-USUARIO.github.io/plantao-quest/`.
5. Toda vez que você mudar algo e enviar (push), o site se atualiza sozinho.

### Opção B — Netlify Drop (mais rápida, sem Git)
1. Abra https://app.netlify.com/drop
2. Arraste a pasta inteira do jogo para a página.
3. Pronto: ele gera um link `https://nome-aleatorio.netlify.app` (dá para renomear nas configurações).
   Para atualizar, rode `node ferramentas/atualizar-sw.js` e arraste a pasta de novo.

### Domínio próprio (opcional)
Se comprar um domínio (ex.: `plantaoquest.com.br` no Registro.br), configure em
**Settings → Pages → Custom domain** (GitHub) ou **Domain settings** (Netlify) e siga as instruções de DNS.
O HTTPS é gratuito nos dois.

## 3. Depois de mudar o jogo
Sempre rode:
```
node ferramentas/atualizar-sw.js
```
Isso avisa o modo offline que existe versão nova. (No GitHub Pages o workflow já faz isso sozinho.)

## Observações
- O progresso fica no navegador de cada pessoa. Trocar de navegador, de celular ou limpar os dados apaga o progresso.
- No celular, abra o site e use "Adicionar à tela inicial": vira um app que abre offline.
