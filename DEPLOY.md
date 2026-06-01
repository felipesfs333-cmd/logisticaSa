# Deploy no Railway + Autenticação JWT

## Parte 1 — Autenticação JWT (NOVO)

O sistema agora tem login com **access token** (curto, 15 min) e **refresh
token** (longo, 7 dias, rotativo). As rotas administrativas (gestão de
transportadoras, regras, frete grátis, importador) agora **exigem login**.
As rotas públicas (`/api/cotacao` e `/nuvemshop/rates`) seguem abertas, porque
a loja e a Nuvemshop precisam acessá-las.

### Variáveis de ambiente novas (.env)
Adicione ao seu `.env` (e configure também no Railway):
```
JWT_ACCESS_SECRET=uma-frase-secreta-longa-e-aleatoria-troque-isto
JWT_REFRESH_SECRET=outra-frase-secreta-diferente-da-primeira-troque
```
Use frases longas e diferentes entre si. Nunca compartilhe.

### Como usar (fluxo)
1. **Criar o primeiro usuário** (faça uma vez):
   ```
   POST /auth/registrar   body: { "email": "voce@email.com", "senha": "suaSenha" }
   ```
   Retorna `access_token` e `refresh_token`.

2. **Login** (nas próximas vezes):
   ```
   POST /auth/login   body: { "email": "...", "senha": "..." }
   ```

3. **Acessar rotas protegidas**: mande o access token no cabeçalho:
   ```
   Authorization: Bearer SEU_ACCESS_TOKEN
   ```

4. **Renovar quando o access expira** (a cada ~15 min):
   ```
   POST /auth/refresh   body: { "refresh_token": "SEU_REFRESH_TOKEN" }
   ```
   Retorna um novo par. O refresh antigo deixa de valer (rotação).

5. **Logout**:
   ```
   POST /auth/logout   (com Authorization: Bearer ...)
   ```

> ⚠️ Após subir, **registre seu usuário e depois considere desabilitar a rota
> `/auth/registrar`** (ou protegê-la), para ninguém criar contas livremente.

## Parte 2 — Deploy no Railway

Railway roda o NestJS + PostgreSQL como estão. Sem migrar nada.

### Pré-requisitos
- Conta no Railway (railway.app) — login com GitHub é o mais fácil.
- Seu projeto num repositório no GitHub (o jeito mais simples de subir).

### Passo a passo
1. **Suba o projeto pro GitHub** (se ainda não está):
   - Crie um repositório novo no github.com
   - No VS Code, com a pasta aberta, use o controle de versão (ícone de ramificação)
     para publicar, OU rode no terminal:
     ```
     git init
     git add .
     git commit -m "primeira versao"
     git branch -M main
     git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
     git push -u origin main
     ```

2. **No Railway**, clique em **New Project → Deploy from GitHub repo** e escolha
   seu repositório. Ele detecta o NestJS sozinho.

3. **Adicione o banco**: no projeto Railway, **New → Database → PostgreSQL**.
   O Railway cria a variável `DATABASE_URL` automaticamente — o código já está
   preparado para usá-la (não precisa configurar host/senha à mão).

4. **Configure as variáveis** (aba Variables do serviço):
   ```
   JWT_ACCESS_SECRET=...
   JWT_REFRESH_SECRET=...
   ```
   (a `DATABASE_URL` e a `PORT` o Railway injeta sozinho)

5. **Deploy**: o Railway builda e sobe. Em **Settings → Networking →
   Generate Domain**, você ganha uma URL HTTPS pública, tipo
   `https://seu-projeto.up.railway.app`.

6. **Pronto para a Nuvemshop**: seu callback será
   `https://seu-projeto.up.railway.app/nuvemshop/rates`. É essa URL HTTPS que
   faltava para configurar o app na Nuvemshop.

### Importar as planilhas depois do deploy
Como o banco do Railway começa vazio, reimporte as tabelas apontando para a URL
nova (precisa do token de login):
```
curl.exe -X POST https://seu-projeto.up.railway.app/importador/Quick ^
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" ^
  -F "arquivo=@QuickDelivery_atualizada.xlsx"
```

### Sobre o painel
O `painel/index.html` precisa apontar para a URL nova. No arquivo, troque a
linha `const API = 'http://localhost:3000';` pela sua URL do Railway. O painel
pode ser aberto localmente ou hospedado (ele é só um arquivo estático).
