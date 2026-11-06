# Site de casamento · React + Vite + Firebase

Site estático com o layout original, RSVP público no Cloud Firestore e painel exclusivo dos noivos. Pode ser publicado no GitHub Pages sem servidor dedicado. As especificações recebidas estão em `TASK1.md`.

## Configuração local e Firebase

1. Use Node.js 22+ e execute `npm ci`.
2. Crie um projeto no Firebase Console e registre um aplicativo **Web**.
3. Copie `.env.example` para `.env.local` e preencha as seis variáveis `VITE_FIREBASE_*` com os valores da configuração Web do projeto. Reinicie o Vite após alterar variáveis.
4. Crie o Cloud Firestore em modo de produção e escolha a região apropriada antes de gravar dados. Não use regras públicas de teste.
5. Em Authentication → Sign-in method, habilite **E-mail/senha**. Em Settings → Authorized domains, adicione `localhost`, o host do GitHub Pages e/ou o domínio próprio.
6. Em Authentication → Users → Add user, crie manualmente cada conta dos noivos. Copie o **UID** exibido na lista/detalhe do usuário.
7. No Firestore Console, crie a coleção `admins` e um documento cujo **ID seja exatamente o UID autorizado**. Pode conter `{ enabled: true }` como metadado: **a existência do documento é a autorização**, não o campo `enabled`. Para revogar acesso, exclua o documento e desabilite a conta no Authentication. Nenhuma interface pública cria usuários ou altera a lista. As regras impedem qualquer gravação de `admins` por clientes, inclusive administradores.
8. Publique o conteúdo de `firestore.rules` na aba Rules do Firestore. Alternativamente, após autenticar a CLI com uma conta autorizada: `npx firebase login` e `npx firebase deploy --only firestore:rules --project SEU_PROJECT_ID`. Esses comandos afetam recursos externos e não são executados automaticamente pelo workflow.
9. Execute `npm run dev`. Sem configuração, o site público renderiza normalmente; envios e login mostram indisponibilidade sem simular sucesso.

Os valores da configuração Web do Firebase são públicos e incorporados ao JavaScript. Nunca coloque senha, service account, chave privada ou credencial do Admin SDK em variáveis `VITE_*`. A autorização depende do Authentication e das regras do Firestore. O SDK inicializa uma única aplicação e usa sua sessão local persistente. O Firebase e as telas administrativas são carregados sob demanda, ao enviar RSVP ou abrir o painel, preservando o carregamento inicial do site público.

## App Check e limites de abuso

Registre o aplicativo Web no **App Check**, usando **reCAPTCHA Enterprise**, e autorize os domínios reais na chave do reCAPTCHA. Preencha `VITE_FIREBASE_APP_CHECK_SITE_KEY` com a chave pública. Faça novo build, acompanhe métricas e só então habilite **enforcement para Cloud Firestore** no Console. Não habilitar enforcement deixa a proteção apenas em monitoramento. Para testes locais com enforcement, use um domínio autorizado ou o procedimento oficial de debug do App Check; não publique tokens de debug.

O formulário tem honeypot e trava contra envio concorrente no mesmo componente. As regras validam campos, tipos, timestamp de servidor e limites (nome 120, mensagem 1000, total de pessoas 1–10 para presença e 0 para ausência). Para alterar limites, sincronize `src/lib/rsvp.js`, `firestore.rules` e testes. O limite é o **total incluindo o convidado**, não uma validação nominal do convite.

Envios são anônimos. App Check, honeypot e regras não impedem completamente automação, duplicatas ou abuso por clientes válidos e não oferecem limite por IP. Configure monitoramento de uso, cotas e alertas de orçamento no Google Cloud; alertas de orçamento não interrompem cobrança. Para limites rigorosos por convite, taxa ou volume será necessário um serviço confiável adicional (fora desta implementação estática). Não há deduplicação entre sessões/dispositivos nem edição/exclusão pelo site.

Referências oficiais: [App Check Web](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider), [testes de regras](https://firebase.google.com/docs/firestore/security/test-rules-emulator).

## RSVP, painel e exportação

- Preencha nome, presença, quantidade e mensagem na seção R.S.V.P. Ausência sempre grava zero pessoas. O sucesso aparece somente depois de o Firestore confirmar a gravação. Falhas mantêm os campos para nova tentativa.
- A coleção `rsvp_responses` recebe apenas `name`, `attendance` (`yes`/`no`), `guests` inteiro, `message` e `createdAt` gerado no servidor. Convidados não podem consultar registros, mesmo por requisições diretas. Atualizações e exclusões são negadas a todos os clientes.
- Acesse `/#/admin/login` (ou `/wedding-worker/#/admin/login` se publicado em subdiretório). A rota `/#/admin` exige sessão e documento `admins/{UID}`. O painel trata contas sem autorização, loading e falhas de leitura. As regras repetem a autorização em cada consulta, independentemente da interface.
- O painel carrega respostas reais ao abrir. Use **Atualizar** para novas confirmações; a tabela oferece busca por nome, filtro de presença, ordenação por data e expansão de mensagens. Os indicadores usam todas as respostas carregadas.
- **Exportar confirmações** baixa todas as respostas carregadas, mesmo com filtro ativo. O CSV é gerado no navegador com UTF-8/BOM, campos entre aspas, escape de aspas/quebras e prefixo de neutralização de fórmulas. O arquivo inclui data/hora ISO UTC; a tabela mostra horário local do navegador. Nenhum dado é enviado a um serviço de exportação.
- A leitura administrativa é uma consulta única, sem listener e sem paginação, adequada ao volume de um casamento. Em bases grandes, adicione paginação/agregação para reduzir transferência e custo.

Faça um envio real no domínio final e confira o documento no Console, login/logout dos noivos, filtros, totais e CSV. Teste também uma conta sem documento `admins`. Configure App Check antes de divulgar o formulário.

## Testes e qualidade

```bash
npm ci
npm run lint
npm test
npm run build
```

`npm test` cobre validação, persistência com SDK simulado, loading/sucesso/falha do formulário, trava de clique repetido, proteção de rota, conta sem autorização, indicadores, filtros e CSV. `npm run check` reúne lint, testes unitários/de componentes e build.

Para testar as regras reais com Firebase Emulator Suite, instale **Java 21+** e execute:

```bash
npm run test:rules
```

A CLI baixa o emulador na primeira execução. Os testes usam o projeto isolado `demo-wedding`, sem credenciais ou acesso à produção. Cobrem criação válida, campos inválidos/ausentes/extras, tipos, limites, timestamp, leituras anônimas e de conta não autorizada, leituras administrativas, proibição de alteração/exclusão e escalada de privilégios.

Para as verificações de navegador:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

O Playwright inicia o Vite e verifica o site público, âncoras, menu móvel, redirecionamento administrativo e atualização da página nas larguras 360, 390, 768, 1024 e 1440 px, além de overflow horizontal e exceções JavaScript. Os testes não exigem projeto Firebase real; login e envio de produção devem ser conferidos separadamente. A tabela administrativa usa rolagem horizontal contida em telas pequenas.

## GitHub Actions e publicação

O workflow `.github/workflows/deploy.yml` usa Node 22 e Java 21, executa `npm ci`, lint, testes unitários, regras no emulador, testes de navegador e build. Só então disponibiliza `casamento-static-dist` para download e publica `dist/` no GitHub Pages. Não publica regras Firebase automaticamente.

1. Em Settings → Pages, selecione **GitHub Actions** como Source.
2. Em Settings → Secrets and variables → Actions → **Variables**, configure os seis nomes `VITE_FIREBASE_*` de `.env.example` e `VITE_FIREBASE_APP_CHECK_SITE_KEY`. São configurações públicas Web; nenhuma service account é necessária no build.
3. Configure `PAGES_BASE_PATH`: `/` para domínio próprio ou repositório `usuario.github.io`; `/wedding-worker/` para publicação no subdiretório deste repositório. Sem variável, `actions/configure-pages` detecta o caminho pela configuração real do Pages, inclusive domínio próprio na raiz.
4. Faça push para `main` ou execute **Run workflow**. Confira os jobs build/deploy e o endereço em Settings → Pages.
5. Verifique que o HTML publicado referencia JS compilado em `assets/`, nunca `src/main.jsx`. O HashRouter preserva atualização direta das rotas sem fallback de servidor. Os links públicos usam `#/#secao`; links antigos `#secao` são convertidos ao carregar.

### Domínio test.ondadeideias.com

Em Settings → Pages, informe `test.ondadeideias.com` como Custom domain. No DNS, configure CNAME `test` → `renanberto.github.io`, sem protocolo ou caminho. O workflow detecta a raiz automaticamente; opcionalmente configure `PAGES_BASE_PATH=/`. Execute novo workflow, aguarde validação/certificado e habilite Enforce HTTPS. Autorize também esse domínio em Authentication e reCAPTCHA/App Check. O arquivo `CNAME` existente foi preservado; a configuração efetiva do domínio é feita em Settings → Pages.

Para outra hospedagem estática, publique `dist/`. Para gerar build em subpasta localmente: `GITHUB_PAGES_BASE=/subpasta/ npm run build`.

## Conteúdo e privacidade antes de divulgar

Edite `src/content.js` com nomes, data, endereços, prazo RSVP, mapas, hospedagem e presentes oficiais. Dados atuais são demonstrativos; links vazios aparecem como “Em breve”. Os arquivos de monograma e igreja em `public/images/` vieram da referência visual e devem ser substituídos pelos arquivos oficiais autorizados. Fontes continuam carregadas do Google Fonts.

As confirmações são armazenadas no Firebase/Google. Defina aviso de privacidade apropriado ao evento, acesso restrito aos noivos e prazo de retenção/exclusão pelo Console. Evite solicitar dados sensíveis no campo livre.

Consulte [preços do Firestore](https://firebase.google.com/docs/firestore/pricing) e [cotas](https://firebase.google.com/docs/firestore/quotas) antes de publicar: leituras, gravações, armazenamento, transferência, Authentication e reCAPTCHA podem ter limites/custos conforme plano, região e uso. O projeto não pressupõe gratuidade permanente. Falhas de quota são apresentadas como erro de envio/leitura, nunca como confirmação de sucesso.

## Arquivos principais

- `src/App.jsx`, `src/content.js`, `src/styles.css`: site público e identidade visual existente.
- `src/lib/firebase.js`: SDK modular e App Check; `src/services/rsvpService.js`: persistência e leitura.
- `src/lib/rsvp.js`, `src/lib/csv.js`: validação, cálculos, filtros e exportação.
- `src/contexts/AuthContext.jsx`, `src/components/admin/`, `src/pages/admin/`: sessão, proteção e painel.
- `firestore.rules`, `firebase.json`, `tests/rules/`: segurança e emulador.
- `tests/`, `vitest.config.js`, `playwright.config.js`: testes automatizados.

A configuração do projeto Firebase real, contas/UIDs, regras publicadas, enforcement App Check, domínio e publicação são ações externas manuais. Os testes locais não comprovam essas configurações de produção.

A dependência transitiva `@grpc/grpc-js` tem um override para uma versão corrigida compatível, validada nos testes do emulador. A auditoria executada apontou zero vulnerabilidades altas/críticas e 15 moderadas restritas às ferramentas de desenvolvimento da CLI Firebase; essas dependências não são incluídas no site publicado. Revise futuras atualizações da CLI sem aplicar downgrades/alterações incompatíveis automaticamente.

## Validação desta implementação

Executados em 06/11/2026: `npm ci` em cópia limpa em `/tmp`, lint sem erros/avisos, 39 testes unitários/de componentes, 20 testes das regras no Firestore Emulator e 10 testes de navegador nas cinco larguras especificadas, todos aprovados. O build foi validado para raiz e subdiretório `/wedding-worker/`. O bundle inicial público foi reduzido de aproximadamente 937 kB para 206 kB (sem gzip); o chunk do SDK Firestore, carregado sob demanda, ainda gera o aviso do Vite de tamanho acima de 500 kB.

O ambiente local precisou de Java 21 e Chromium/bibliotecas Linux temporários; no GitHub Actions esses pré-requisitos estão nos passos de setup. Não foi realizado deploy, execução remota do workflow ou teste com credenciais/projeto Firebase de produção. Login real dos noivos, envio no domínio final, regras publicadas e enforcement App Check dependem das configurações externas acima.

## Inventário das alterações

Arquivos criados:

- `src/lib/firebase.js`, `src/lib/firestoreApi.js`, `src/lib/rsvp.js`, `src/lib/csv.js`.
- `src/services/rsvpService.js` e `src/contexts/AuthContext.jsx`.
- `src/components/admin/ProtectedRoute.jsx`, `StatsCards.jsx`, `GuestFilters.jsx`, `GuestTable.jsx`.
- `src/pages/admin/AdminLayout.jsx`, `Login.jsx`, `Dashboard.jsx`.
- `firestore.rules`, `firebase.json`, `vitest.config.js`, `playwright.config.js`.
- `tests/setup.js`, `tests/auth.test.jsx`, `tests/components.test.jsx`, `tests/rsvp.test.js`, `tests/rsvpService.test.js`, `tests/rules/firestore.test.js`.
- `tests/e2e/responsive.spec.js`, `tests/e2e/admin-fixture.html`, `tests/e2e/admin-fixture.jsx`.

Arquivos modificados: `src/App.jsx`, `src/main.jsx`, `src/styles.css`, `.env.example`, `.gitignore`, `package.json`, `package-lock.json`, `.github/workflows/deploy.yml` e `README.md`. O arquivo de especificações `TASK1.md` recebido foi preservado.

## Ambiente preparado para configuração Firebase

O arquivo local `.env.local` está ignorado pelo Git e pode receber os valores da configuração **Web** do Firebase. Execute `npm run env:check` para ver apenas quais nomes estão preenchidos, sem imprimir seus valores. Nenhum valor preenchido permite publicar o site público com RSVP/login indisponíveis; preenchimento parcial falha na checagem. Depois de preencher os seis campos, reinicie `npm run dev` para aplicá-los. A chave pública App Check é opcional para build e necessária para usar o provedor com enforcement.

Para produção, cadastre os mesmos sete nomes em Actions **Variables** (preferencial para a configuração Web pública) ou **Secrets**; o workflow aceita ambos, dando prioridade a Variables. Depois execute novamente o workflow, pois o Vite incorpora os valores no build. A leitura de nomes/valores das variáveis via CLI depende de permissões próprias do token; não é necessária para o build executado pelo GitHub Actions. A configuração Web/objeto `firebaseConfig` pode ser compartilhada para esse ajuste; não inclua senhas, contas de serviço ou chaves privadas.
