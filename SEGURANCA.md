# Correções de Segurança Aplicadas

Este documento resume os 7 pontos corrigidos e o que você precisa fazer
no Railway pra ativá-los.

## O que foi corrigido

1. **Segredos JWT sem fallback inseguro** — o código não usa mais senha
   "reserva". Se `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` faltarem, o
   sistema recusa em vez de usar algo previsível. (Você já tem essas
   variáveis no Railway, então nada muda na prática.)

2. **Tokens/senhas de transportadoras criptografados** — os campos
   sensíveis (token, senha de login da transportadora) agora são
   criptografados (AES-256-GCM) antes de salvar no banco. Precisa da
   variável `CRYPTO_KEY`.

3. **CORS restrito** — defina `CORS_ORIGINS` com o endereço do seu painel
   pra que só ele possa chamar a API. Sem isso, fica liberado (use só em dev).

4. **Rate limiting** — no máximo 60 requisições por minuto por IP, contra
   força bruta no login. Já ativo, não precisa configurar.

5. **synchronize desligado por padrão** — o banco não altera mais a
   estrutura sozinho em produção. Liga com `DB_SYNC=true` só quando precisar
   criar tabelas novas. (Veja instrução abaixo!)

6. **Validação de entrada** — login e cadastro agora validam e-mail e
   tamanho de senha antes de processar.

7. **Headers de segurança (helmet)** — proteções básicas de navegador
   ativadas automaticamente.

## Variáveis pra configurar no Railway

Adicione na aba Variables do serviço logisticaSa:

```
CRYPTO_KEY=<uma frase longa e aleatoria, ex: superadega-cripto-9f3k2j8x...>
CORS_ORIGINS=<endereco do seu painel, se hospedado; senao deixe sem criar>
DB_SYNC=true
```

> **IMPORTANTE sobre DB_SYNC:** como adicionamos uma tabela nova
> (`lojas_nuvemshop`) e colunas novas em transportadoras, deixe
> `DB_SYNC=true` no **primeiro deploy** desta versão, pra ele criar tudo.
> Depois que subir e funcionar uma vez, **troque para `DB_SYNC=false`**
> (mais seguro). Suas tabelas e dados não se perdem.

> **IMPORTANTE sobre CRYPTO_KEY:** depois de definir essa chave, as
> credenciais que você cadastrar de transportadoras serão criptografadas
> com ela. **Não troque essa chave depois**, senão o sistema não consegue
> mais ler as credenciais já salvas. Guarde-a num lugar seguro.

## Ação manual recomendada (fora do código)

- **Regenere o Client Secret** do app na Nuvemshop (apareceu em prints).
- **Considere trocar a senha** do seu usuário do painel, se ela apareceu
  em alguma captura de tela.
