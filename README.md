# Plataforma Logística — Setup

Backend em NestJS + PostgreSQL + Redis, rodando com Docker.

## Pré-requisitos (instalar uma vez)

1. **Node.js 20+** — https://nodejs.org
2. **Docker Desktop** — https://docker.com (deixe ele aberto/rodando)
3. **VS Code** — https://code.visualstudio.com

## Como rodar (passo a passo)

Abra o terminal dentro da pasta do projeto e execute, **em ordem**:

### 1. Subir o banco de dados e o cache
```bash
docker compose up -d
```
Isso liga o Postgres (porta 5432) e o Redis (porta 6379) em segundo plano.
Para conferir se subiram: `docker ps` (devem aparecer 2 containers).

### 2. Instalar as dependências do projeto
```bash
npm install
```
Roda uma vez só (e de novo quando adicionar bibliotecas novas).

### 3. Ligar a API em modo desenvolvimento
```bash
npm run start:dev
```
Quando aparecer `API rodando em http://localhost:3000`, está pronto.

### 4. Testar
Abra no navegador: http://localhost:3000

Você deve ver:
```json
{ "status": "ok", "mensagem": "Plataforma logistica rodando!", "data": "..." }
```

As tabelas (`transportadoras`, `tabelas_frete`, `regras_comerciais`) são criadas
**automaticamente** no banco na primeira vez que a API sobe.

## Comandos úteis

| Comando | O que faz |
|---|---|
| `docker compose up -d` | Liga banco + cache |
| `docker compose down` | Desliga banco + cache |
| `npm run start:dev` | Liga a API (recarrega ao salvar) |
| Ctrl + C | Para a API no terminal |

## Estrutura de pastas

```
logistica/
├── docker-compose.yml      → define Postgres e Redis
├── .env                    → senhas e configurações
├── package.json            → dependências
└── src/
    ├── main.ts             → liga o servidor
    ├── app.module.ts       → conecta tudo ao banco
    ├── app.controller.ts   → rota de teste (/)
    └── database/entities/  → as tabelas do banco
        ├── transportadora.entity.ts
        ├── tabela-frete.entity.ts
        └── regra-comercial.entity.ts
```

## Importador de Excel (NOVO)

Com a API rodando (`npm run start:dev`), você sobe as tabelas de frete assim.

### Pelo terminal (jeito rápido de testar)

Quick:
```bash
curl -X POST http://localhost:3000/importador/Quick \
  -F "arquivo=@QuickDelivery_atualizada.xlsx"
```

Azul (arquivo grande, ~216 mil linhas — pode levar um minuto):
```bash
curl -X POST http://localhost:3000/importador/Azul \
  -F "arquivo=@AzulCargo_atualizada.xlsx"
```

Resposta esperada:
```json
{ "transportadora": "Quick", "transportadora_id": 1, "linhas_importadas": 17497 }
```

### Como funciona
- A rota é `POST /importador/{nome-da-transportadora}`.
- O arquivo vai no campo chamado `arquivo`.
- O sistema cria a transportadora no banco se ela ainda não existir.
- Reimportar a mesma transportadora **apaga as tabelas antigas** e sobe as novas
  (assim você atualiza preços sem duplicar).
- Os dados ficam salvos na tabela `tabelas_frete` do Postgres, prontos para o
  motor de cotação usar.

### Formato esperado da planilha
As colunas precisam ter exatamente estes nomes (que é o formato dos seus arquivos):

`CEP Início` · `CEP Fim` · `Peso Início (g)` · `Peso Fim (g)` · `Frete Base (R$)` · `Ad Valorem (fração)` · `Extra/kg (R$)` · `Prazo (dias)`

## Motor de Cotação (NOVO)

Com as tabelas importadas, você cota o frete assim:

```bash
curl -X POST http://localhost:3000/api/cotacao \
  -H "Content-Type: application/json" \
  -d '{"cep_destino":"29010000","peso":3,"valor_nf":500}'
```

Resposta (exemplo real com seus dados):
```json
{
  "cep_destino": "29010000",
  "peso_kg": 3,
  "valor_nf": 500,
  "opcoes": [
    { "transportadora": "Azul", "valor": 28.63, "prazo": 4 },
    { "transportadora": "Quick", "valor": 66.58, "prazo": 2 }
  ],
  "mais_barato": { "transportadora": "Azul", "valor": 28.63, "prazo": 4 },
  "mais_rapido": { "transportadora": "Quick", "valor": 66.58, "prazo": 2 }
}
```

### Como o cálculo funciona
Para cada transportadora **ativa**, o motor busca no banco a faixa que cobre o
CEP **e** o peso informados, e calcula:

```
total = frete_base + (ad_valorem × valor_nf) + (extra_kg × peso)
```

Depois ordena da mais barata para a mais cara e já entrega dois atalhos prontos
para o checkout: `mais_barato` e `mais_rapido`.

- O peso entra em **KG** (ex: `3` = 3kg) e o motor converte para gramas internamente.
- O CEP pode vir com ou sem traço (`29010-000` ou `29010000`).
- Se nenhuma transportadora atender, `opcoes` volta vazio com um aviso.

## Regras Comerciais (NOVO)

Permitem ajustar o frete **sem mexer na tabela da transportadora**. Cada regra
pode ter: markup (% de acréscimo), dias extras no prazo, e frete mínimo. E pode
ser filtrada por **estado** e/ou **transportadora**.

### Cadastrar uma regra
```bash
Invoke-RestMethod -Uri http://localhost:3000/regras -Method Post -ContentType "application/json" -Body '{"estado":"ES","markup":12,"dias_extras":2,"frete_minimo":19.90}'
```

Campos (todos opcionais):
- `estado`: UF onde a regra vale (ex: "MG"). Vazio = todos os estados.
- `transportadora`: nome (ex: "Quick"). Vazio = todas.
- `markup`: % de acréscimo (ex: 12 = +12%).
- `dias_extras`: dias somados ao prazo.
- `frete_minimo`: piso do frete (ex: 19.90).

### Listar regras
```bash
Invoke-RestMethod -Uri http://localhost:3000/regras
```

### Remover uma regra (pelo id)
```bash
Invoke-RestMethod -Uri http://localhost:3000/regras/1 -Method Delete
```

### Como afeta a cotação
A `/api/cotacao` agora descobre o **estado** pelo CEP, aplica todas as regras que
casam (markup → prazo extra → frete mínimo, nessa ordem) e só então ordena por
preço. Ou seja, o markup pode mudar quem é o "mais barato". A resposta passa a
incluir o campo `estado`.

Quando não há nenhuma regra cadastrada, a cotação funciona igual a antes
(valores brutos da transportadora).

## Painel Visual (NOVO)

Uma interface web para ver tudo: dashboard, transportadoras e simulador.

### Como abrir
1. Deixe a API rodando (`npm run start:dev`).
2. Abra o arquivo `painel/index.html` no navegador — é só dar **duplo clique**
   nele pelo Explorador de Arquivos, ou arrastar pra uma aba do Chrome.

O painel conecta sozinho na API em `localhost:3000`. No canto superior direito
há um indicador: verde = API conectada, vermelho = API offline.

### O que cada tela faz
- **Dashboard**: números reais (transportadoras ativas, faixas importadas, prazo
  e frete médios) + gráficos de frete por transportadora e cobertura por estado.
  Os cards de faturamento, lead time, pedidos e SLA aparecem marcados como
  "Aguardando pedidos" — eles ganham vida quando a integração Nuvemshop estiver
  ligada e houver pedidos reais para medir.
- **Transportadoras**: lista todas com quantas faixas de frete cada uma tem.
  Você pode: ligar/desligar globalmente, **cadastrar nova** (botão no topo,
  cria vazia — depois você importa o Excel), **excluir** (apaga tabelas e regras
  junto), e **editar regras por estado** (link "editar estados").
  Na edição por estado, cada UF tem markup, lead time extra, frete mínimo e um
  liga/desliga — desativar um estado remove a transportadora das cotações de lá.
  Tudo salva automaticamente ao sair do campo.
- **Simulador**: o mesmo `/api/cotacao`, mas visual. Digite CEP, peso e valor da
  nota e veja as opções ordenadas, com selo de "+ barato" e "+ rápido".

### Por que os cards de pedidos estão vazios
Lead time e faturamento dependem de pedidos reais já processados. O sistema
ainda não recebe pedidos (isso vem com a Nuvemshop). Em vez de mostrar números
inventados, o painel é honesto e marca esses cards como pendentes — quando os
dados existirem, eles preenchem automaticamente.

## Frete Grátis (NOVO)

Aba "Frete Grátis" no painel. Cada regra libera frete zero quando o pedido casa
com **todas** as condições: transportadora (ou todas), faixa de CEP, valor mínimo
do pedido e período (datas opcionais). Na cotação, quem casar aparece como GRÁTIS.

## Importar planilha nova por transportadora (NOVO)

Na aba Transportadoras, cada linha tem o botão "↑ nova planilha". Ele abre o
seletor de arquivo e **substitui** toda a tabela de frete daquela transportadora
pela nova (reimport limpo). É o mesmo que o `curl` de importação, mas pelo painel.

## Integração Nuvemshop (NOVO — endpoint pronto)

O endpoint de callback que a Nuvemshop chama no checkout já existe:

```
POST /nuvemshop/rates
```

Ele recebe o formato oficial da Nuvemshop (origem, destino, itens), soma peso e
valor dos itens, chama o motor de cotação interno e responde no formato `rates`
que eles esperam (name, code, price, currency, type, datas de entrega). Aplica
regras comerciais e frete grátis automaticamente. Quando não há cobertura,
responde 422 (4xx) — conforme a doc recomenda, para não penalizar a saúde do carrier.

### ⚠️ O que falta para conectar de verdade (HTTPS)

A Nuvemshop exige que o `callback_url` seja **HTTPS e público** — `localhost` não
funciona, porque o servidor deles precisa alcançar o seu pela internet. Há dois
caminhos:

1. **Para testar agora (túnel):** instale o `ngrok` (ngrok.com), e com a API
   rodando, rode `ngrok http 3000`. Ele te dá uma URL HTTPS pública (algo como
   `https://abc123.ngrok.io`). Seu callback vira `https://abc123.ngrok.io/nuvemshop/rates`.
2. **Para produção:** hospede a API num servidor (Render, Railway, VPS) com HTTPS.
   O callback será `https://seu-dominio.com/nuvemshop/rates`.

Depois, com a URL HTTPS em mãos, registra-se o carrier na loja via API da
Nuvemshop (precisa antes do cadastro de App no Partners Portal e do formulário
que a doc menciona, para o time deles liberar os endpoints de shipping). Aí é
um POST para `/shipping_carriers` com `{ name, callback_url, types: "ship" }`.

Como esse registro depende das suas credenciais de App (que você ainda vai obter
no Partners Portal), deixei o endpoint pronto e testável. Quando tiver as
credenciais e a URL HTTPS, o último passo é só o registro do carrier.

## Próximo passo

O próximo módulo do documento é a **Integração Nuvemshop**: fazer a loja
consumir o `/api/cotacao` no checkout e receber os pedidos via webhook.

#   l o g i s t i c a S a  
 "# logisticaSa"  
"# logisticaSa"  
