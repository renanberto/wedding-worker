# Operação dos sites

## Onde configurar cada casamento

`sites.json` é o cadastro que alimenta testes, prévias e deploy. Cada entrada define workspace, projeto Cloudflare, domínio, modo e projeto Firebase exclusivo. `sites/<id>/site.json` define o modo padrão e se o site pode ser indexado. Prévia de pull request sempre roda como demonstração, sem Secrets Firebase.

O site `test` usa Firebase real. `demo-moderno` é uma demonstração isolada: sessão e respostas existem apenas no sessionStorage dessa aba, com exemplos fictícios. O painel demonstrativo não é autenticação nem dá acesso a dados reais. O site não inicializa Firebase nesse modo. Um contexto novo inicia outra demonstração.

A conta de serviço disponível não pode criar projetos Google sem uma organização/pasta. Para ativar o segundo Firebase, crie um projeto Spark próprio, configure Authentication por e-mail/senha, Firestore e suas regras, e configure os seis Secrets VITE_FIREBASE_* no ambiente GitHub `site-demo-moderno`. Mude `mode` para `firebase` em `sites.json` e no site.json, preencha `firebaseProject`, e personalize `.env.local` sem copiar a configuração de outro casamento. O validador recusa projetos compartilhados. Não envie senhas/chaves privadas em VITE_*.

## Criar outro site

Use `npm run site:create -- nome-do-casal --domain casal.ondadeideias.com`. O comando recusa nomes inseguros e pastas existentes; cria um exemplo em modo demo, adiciona o cadastro e nunca copia .env.local, node_modules, dist ou credenciais. Em seguida execute npm install, personalize conteúdo, imagens e metadados e abra um PR. Para produção real, acrescente --firebase-project PROJETO_EXCLUSIVO e configure o ambiente próprio antes de publicar.

## Revisão e publicação

Trabalhe em uma branch. O PR executa lint, testes unitários, auditoria de produção, regras Firestore e testes de navegador nos dois sites, inclusive no build compilado. O check `quality` reúne esses resultados. Em PRs de branches do próprio repositório, os ambientes `preview-<site>` mostram uma URL pr-N.PROJETO.pages.dev com dados somente demonstrativos. Forks não recebem o token Cloudflare e não publicam prévias.

A branch main publica após os checks. O ambiente `site-<site>` separa a configuração Firebase. O projeto declarado no cadastro deve corresponder ao Secret VITE_FIREBASE_PROJECT_ID; o build falha se forem diferentes. Para novos sites reais, configure os Secrets no ambiente específico: não confie no fallback de Secrets globais do repositório.

O workflow cadastra o domínio no Pages. Enquanto o DNS estiver no Squarespace, crie manualmente o CNAME após confirmar a URL *.pages.dev retornada. Não altere os nameservers nem o domínio principal. `demo-moderno.ondadeideias.com` fica pendente desse CNAME; o endereço Pages funciona independentemente.

## Acesso dos noivos

Cadastre contas com `npm run noivos:add --workspace @wedding/<site> -- --email pessoa@example.com --name "Nome"`. Configure GOOGLE_APPLICATION_CREDENTIALS fora do repositório. Compartilhe a senha inicial por um canal privado; o script não envia e-mails. A tela de login oferece recuperação de senha via Firebase. Revise os templates de e-mail e authorized domains no Console antes de entregar ao casal.

Para revogar acesso: `npm run noivos:revoke -- --project PROJETO --uid UID`. A operação remove primeiro admins/UID, desabilita a conta e revoga renovação de sessão. Se uma etapa falhar, reexecute e confirme o estado no Console. As regras Firestore são a autorização efetiva, independentemente da interface.

## Backup e restauração

Configure GOOGLE_APPLICATION_CREDENTIALS com acesso ao projeto correto. Execute `npm run guests:backup -- --project PROJETO --out /caminho/privado/backup.json`. O comando recusa destino dentro do repositório, não sobrescreve arquivos existentes e cria o arquivo com permissão 0600. O arquivo contém nomes e mensagens: armazene-o criptografado em local privado; permissões POSIX podem não ser aplicadas integralmente pelo filesystem Windows/WSL.

O backup exporta as respostas RSVP com IDs e timestamps; não é um backup de contas Authentication, senhas ou permissões administrativas. Faça backup antes de mudanças nas regras ou operações de dados e antes de encerrar o evento. A exportação CSV do painel é útil para organização, mas não substitui esse backup.

Para conferir um backup: `npm run guests:restore -- --project PROJETO --file /caminho/privado/backup.json`. O padrão é simulação, sem gravar. Depois use --apply para criar somente documentos ausentes. Projeto, formato e checksum são validados; respostas existentes, contas e permissões são preservadas. O checksum detecta corrupção acidental, não autentica a origem: aceite apenas backups confiáveis. Uma falha parcial é recuperável reexecutando o mesmo comando.

## Monitoramento e restauração da publicação

O workflow **Site health and rollback** verifica disponibilidade a cada seis horas e oferece as operações manuais health, status e rollback. Health verifica HTTP/HTML dos endereços Pages dos sites. Status lista até dez deployments; rollback recebe o ID de uma publicação de produção concluída. Ele restaura o site estático, não reverte alterações de banco, regras ou contas Firebase. As falhas ficam no GitHub Actions, conforme suas preferências de notificação; o health check não captura erros dos navegadores. Acompanhe também as métricas Firebase/Cloudflare. Para alertas externos, configure a ferramenta e o canal desejados separadamente.

Os builds públicos ficam nos artefatos por 30 dias; screenshots de falhas por 7 dias. O workflow **Diagnose Cloudflare custom domain** consulta o estado TLS sem expor token e permite solicitar nova validação de um domínio pendente. Consulte-o antes de atribuir falhas de certificado apenas à propagação DNS.

## Privacidade e encerramento

Os sites de demonstração usam conteúdo fictício, são noindex e não têm pagamentos. Para um casamento real, substitua textos, fotos e links, defina com o responsável a finalidade dos dados, quem pode acessá-los e o prazo de retenção. Uma proposta operacional é excluir dados 90 dias após o evento, mas isso deve ser uma política definida para o caso concreto; não há exclusão automática. Defina também quando eliminar backups, arquivos CSV e capturas locais.

Revise em cada entrega: RSVP válido e inválido, login autorizado e recusado, recuperação, logout, navegação mobile/teclado, contraste, imagens e metadados de compartilhamento. Não habilite indexação pública antes de aprovar o conteúdo. Ative enforcement de App Check somente após configurar a chave e validar métricas para não bloquear convidados legítimos.

## Dependências

Dependabot abre atualizações semanais para npm e GitHub Actions. Atualizações precisam passar pelos checks e prévias antes do merge. Os overrides de glob, uuid e do cliente Pub/Sub corrigem alertas de ferramentas Firebase; testes de emulador, inicialização de CLI e builds devem acompanhar mudanças nesses overrides. Não use npm audit fix --force sem revisar a alteração de versão.
