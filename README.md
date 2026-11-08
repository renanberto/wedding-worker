# Sites de casamento · Onda de Ideias

Layouts independentes, com formulário RSVP, login e painel compartilhados. Código no GitHub; hospedagem no Cloudflare Pages; Firebase exclusivo para cada casamento real.

| Site | Identidade | Dados | Publicação |
| --- | --- | --- | --- |
| `test` | Bruna e Rai, clássico | Firebase `wedding-app-onda` | https://test.ondadeideias.com |
| `demo-moderno` | Helena & Tomás, editorial | Exemplos e respostas somente nesta aba | https://onda-wedding-demo-moderno.pages.dev |

O segundo site é uma demonstração: personagens e evento fictícios, sem pagamentos, sem backend e sem acesso a convidados reais. Seu subdomínio `demo-moderno.ondadeideias.com` depende do CNAME no Squarespace. Para ativar um Firebase real nele, é necessário um projeto Google separado; a conta de serviço local não tem autorização para criar projetos sem organização/pasta.

## Estrutura

```text
sites.json                         cadastro de sites e configuração de deploy
sites/test/                        layout clássico e configuração local do Firebase
sites/demo-moderno/                 layout editorial e conteúdo fictício
packages/wedding-core/              formulário, login, painel, validações e roteamento
scripts/                           criação de sites, ambiente, backup e operação
.github/workflows/                  testes, prévias, deploy, diagnóstico e rollback
```

## Desenvolvimento

Use Node.js 22. Na raiz:

```bash
npm ci
npm run dev              # site clássico
npm run dev:demo         # segundo exemplo
npm run build:all
```

O site clássico usa `sites/test/.env.local`, baseado em `.env.example` da mesma pasta. Os seis valores `VITE_FIREBASE_*` são configurações Web públicas. Nunca use chave administrativa, senha ou token em variáveis VITE_*.

O modo demo vem de `site.json`; não precisa de credenciais. O formulário demonstra os estados de validação, envio e confirmação; as respostas são guardadas no sessionStorage. O painel possui uma entrada demonstrativa explícita, sem senha, e mostra apenas esses exemplos locais.

## Criar outro site

```bash
npm run site:create -- nome-do-casal --domain casal.ondadeideias.com
npm install
npm run dev --workspace @wedding/nome-do-casal
```

O gerador não sobrescreve pastas, não copia `.env.local` ou credenciais e cadastra o site no pipeline. Personalize `src/content.js`, `src/App.jsx`, estilos, imagens e `index.html` antes de entregar. O modo inicial é demo. Use `--firebase-project PROJETO_EXCLUSIVO` para preparar um casamento real e configure seus Secrets no ambiente GitHub próprio.

## Verificação

```bash
npm run lint
npm test
npm run test:rules                    # requer Java 21 e o emulador Firestore
npm run test:e2e                     # site clássico
E2E_SITE=demo-moderno npm run test:e2e
E2E_SITE=demo-moderno E2E_PREVIEW=1 npm run test:e2e
npm audit
```

Os testes incluem validação de RSVP, autorização, isolamento da demonstração, navegador em cinco larguras e verificações automáticas WCAG. A análise automatizada não substitui a revisão manual de teclado, leitura e conteúdo.

Para testar o Firebase real, defina `E2E_FIREBASE_LIVE=1`, `E2E_FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` e, para uma publicação, `E2E_BASE_URL`. Execute apenas `tests/e2e/firebase.spec.js`. O teste cria contas e resposta identificadas por UUID e remove apenas seus próprios dados. Não envie screenshots, traces ou backups com dados reais a artefatos públicos.

## Revisão e publicação

Abra um pull request. O check `quality` reúne lint, unitários, regras, auditoria de produção, testes e build dos dois layouts. PRs do próprio repositório recebem prévias Cloudflare em modo demo, sem dados reais. O merge em main publica cada site no seu próprio projeto Pages.

A configuração vem de `sites.json`: não é necessário editar a matriz YAML ao adicionar um site. Projetos Firebase e domínios duplicados são recusados. Configure em GitHub Actions:

- Variable `CLOUDFLARE_ACCOUNT_ID` e Secret `CLOUDFLARE_API_TOKEN` com Account → Cloudflare Pages → Edit.
- Em `site-<id>`, os seis Secrets VITE_FIREBASE_* e a chave pública de App Check, quando aplicável, para sites reais.
- Confira se VITE_FIREBASE_PROJECT_ID corresponde ao cadastro. O build falha em caso de projeto diferente, configuração incompleta ou credenciais em um build demonstrativo.

O deploy do site não publica regras Firestore. Para cada novo Firebase, publique `firestore.rules` explicitamente com `npm run firebase:rules:deploy -- --project PROJETO`. As regras validam campos, tipos, limites e timestamp, bloqueiam alterações de respostas e restringem leitura aos administradores.

## Operação

[A documentação operacional](docs/OPERACAO.md) explica cadastro e recuperação de acesso, revogação, backup privado, restauração sem sobrescrita, rollback da publicação, privacidade e encerramento do evento.

O workflow **Site health and rollback** verifica disponibilidade a cada seis horas e permite consultar/restaurar deployments. **Diagnose Cloudflare custom domain** consulta o estado do certificado sem expor o token. Dependabot prepara atualizações semanais. Falhas e relatórios ficam no GitHub Actions; uma ferramenta externa de erros de navegador exige configuração própria.

As fotografias ilustrativas e suas fontes estão em [ASSETS.md](sites/demo-moderno/ASSETS.md). `TASK1.md` preserva a especificação original.
