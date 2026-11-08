# Operação dos sites

## Onde configurar cada casamento

`sites.json` é o cadastro que alimenta testes, prévias e deploy. Cada entrada define workspace, projeto Cloudflare, domínio, modo, weddingId e projeto Firebase compartilhado. `sites/<id>/site.json` define o weddingId fixado no build, o modo padrão e se o site pode ser indexado. Prévia de pull request sempre roda como demonstração, sem Secrets Firebase.

O site `test` usa Firebase real. `demo-moderno` é uma demonstração isolada: sessão e respostas existem apenas no sessionStorage dessa aba, com exemplos fictícios. O painel demonstrativo não é autenticação nem dá acesso a dados reais. O site não inicializa Firebase nesse modo. Um contexto novo inicia outra demonstração.

Todos os sites reais usam `wedding-app-onda`, definido na raiz de `sites.json`. Para ativar um exemplo, altere `mode` para `firebase` no cadastro e no site.json, preencha `firebaseProject` com o projeto compartilhado, configure os seis Secrets VITE_FIREBASE_* e crie seu evento com `npm run wedding:create -- --project wedding-app-onda --wedding ID --title "Casal" --active`. O ID deve corresponder ao weddingId cadastrado. Sem --active, o evento é criado fechado. O comando preserva eventos existentes. Reutilize a configuração Web do mesmo projeto; nunca envie chaves privadas em VITE_*. A inclusão de novos domínios de Authentication e os templates de recuperação devem ser revisados no Console.

## Criar outro site

Use `npm run site:create -- nome-do-casal --domain casal.ondadeideias.com`. O comando recusa nomes inseguros e pastas existentes; cria um exemplo em modo demo, adiciona o cadastro e nunca copia .env.local, node_modules, dist ou credenciais. Em seguida execute npm install, personalize conteúdo, imagens e metadados e abra um PR. Para produção real, acrescente --firebase e configure o ambiente próprio antes de publicar.

## Revisão e publicação

Trabalhe em uma branch. O PR executa lint, testes unitários, auditoria de produção, regras Firestore e testes de navegador nos dois sites, inclusive no build compilado. O check `quality` reúne esses resultados. Em PRs humanos de branches do próprio repositório, os ambientes `preview-<site>` mostram uma URL pr-N.PROJETO.pages.dev com dados somente demonstrativos. Forks e PRs automáticos do Dependabot não recebem o token Cloudflare e não publicam prévias; os testes de código e build continuam obrigatórios.

A branch main publica após os checks. O ambiente `site-<site>` permite configurar o build; todos usam o mesmo Firebase e weddingIds distintos. O projeto declarado no cadastro deve corresponder ao Secret VITE_FIREBASE_PROJECT_ID; o build falha se forem diferentes. Para novos sites reais, configure os Secrets no ambiente específico: os mesmos valores Web podem ser compartilhados no repositório; sobrescritas devem corresponder ao mesmo projeto.

O workflow cadastra o domínio no Pages. Enquanto o DNS estiver no Squarespace, crie manualmente o CNAME após confirmar a URL *.pages.dev retornada. Não altere os nameservers nem o domínio principal. `demo-moderno.ondadeideias.com` fica pendente desse CNAME; o endereço Pages funciona independentemente.

## Acesso dos noivos

Cadastre contas com `npm run noivos:add --workspace @wedding/<site> -- --email pessoa@example.com --name "Nome"`. Configure GOOGLE_APPLICATION_CREDENTIALS fora do repositório. Compartilhe a senha inicial por um canal privado; o script não envia e-mails. A tela de login oferece recuperação de senha via Firebase. Revise os templates de e-mail e authorized domains no Console antes de entregar ao casal.

Para revogar acesso: `npm run noivos:revoke -- --project PROJETO --wedding CASAMENTO --uid UID`. A operação remove apenas weddings/CASAMENTO/members/UID. As permissões nos outros casamentos e a conta Authentication são preservadas. --disable-account desabilita explicitamente a conta global e revoga suas sessões em todos os sites; use apenas quando essa for a intenção. Se uma etapa falhar, reexecute e confirme o estado no Console. As regras Firestore são a autorização efetiva, independentemente da interface.

## Backup e restauração

Configure GOOGLE_APPLICATION_CREDENTIALS com acesso ao projeto correto. Execute `npm run guests:backup -- --project PROJETO --wedding CASAMENTO --out /caminho/privado/backup.json`. O comando recusa destino dentro do repositório, não sobrescreve arquivos existentes e cria o arquivo com permissão 0600. O arquivo contém nomes e mensagens: armazene-o criptografado em local privado; permissões POSIX podem não ser aplicadas integralmente pelo filesystem Windows/WSL.

O backup exporta as respostas RSVP com IDs e timestamps; não é um backup de contas Authentication, senhas ou permissões administrativas. Faça backup antes de mudanças nas regras ou operações de dados e antes de encerrar o evento. A exportação CSV do painel é útil para organização, mas não substitui esse backup.

Para conferir um backup: `npm run guests:restore -- --project PROJETO --wedding CASAMENTO --file /caminho/privado/backup.json`. O padrão é simulação, sem gravar. Depois use --apply para criar somente documentos ausentes. Projeto, weddingId, formato e checksum são validados; respostas existentes, contas e permissões são preservadas. O checksum detecta corrupção acidental, não autentica a origem: aceite apenas backups confiáveis. Uma falha parcial é recuperável reexecutando o mesmo comando.

## Monitoramento e restauração da publicação

O workflow **Site health and rollback** verifica disponibilidade a cada seis horas e oferece as operações manuais health, status e rollback. Health verifica HTTP/HTML dos endereços Pages dos sites. Status lista até dez deployments; rollback recebe o ID de uma publicação de produção concluída. Ele restaura o site estático, não reverte alterações de banco, regras ou contas Firebase. Não restaure builds anteriores à migração por casamento sem planejar também a compatibilidade das regras: esses builds consultam coleções legadas e serão bloqueados. As falhas ficam no GitHub Actions, conforme suas preferências de notificação; o health check não captura erros dos navegadores. Acompanhe também as métricas Firebase/Cloudflare. Para alertas externos, configure a ferramenta e o canal desejados separadamente.

Os builds públicos ficam nos artefatos por 30 dias; screenshots de falhas por 7 dias. O workflow **Diagnose Cloudflare custom domain** consulta o estado TLS sem expor token e permite solicitar nova validação de um domínio pendente. Consulte-o antes de atribuir falhas de certificado apenas à propagação DNS.

## Privacidade e encerramento

Os sites de demonstração usam conteúdo fictício, são noindex e não têm pagamentos. Para um casamento real, substitua textos, fotos e links, defina com o responsável a finalidade dos dados, quem pode acessá-los e o prazo de retenção. Uma proposta operacional é excluir dados 90 dias após o evento, mas isso deve ser uma política definida para o caso concreto; não há exclusão automática. Defina também quando eliminar backups, arquivos CSV e capturas locais.

Revise em cada entrega: RSVP válido e inválido, login autorizado e recusado, recuperação, logout, navegação mobile/teclado, contraste, imagens e metadados de compartilhamento. Não habilite indexação pública antes de aprovar o conteúdo. Ative enforcement de App Check somente após configurar a chave e validar métricas para não bloquear convidados legítimos.

## Dependências

Dependabot abre atualizações semanais para npm e GitHub Actions. Atualizações precisam passar pelos checks e prévias antes do merge. Os overrides de glob, uuid e do cliente Pub/Sub corrigem alertas de ferramentas Firebase; testes de emulador, inicialização de CLI e builds devem acompanhar mudanças nesses overrides. Não use npm audit fix --force sem revisar a alteração de versão.

## Isolamento e migração do legado

`weddings/{weddingId}/rsvp_responses/{id}` guarda respostas; `weddings/{weddingId}/members/{uid}` guarda `role` (owner/admin) e `enabled`. Apenas membros habilitados leem as respostas do próprio casamento. A leitura do próprio documento de associação permite ao login conferir acesso; listagem de membros e alterações por clientes são negadas. RSVP público só é aceito em eventos ativos, com validação estrita dos campos. Nunca armazene informações privadas no documento público do evento. O Admin SDK ignora regras: mantenha credenciais administrativas privadas e restritas a operadores confiáveis.

O legado raiz pertence apenas ao casamento original `test`. `npm run wedding:migrate -- --project wedding-app-onda --wedding test` simula a importação; acrescente `--apply --backup /pasta/privada/arquivo-novo.json` para copiar. O backup privado inclui respostas e administradores. O comando preserva IDs, timestamps, contas e associações existentes, recusa conflitos de respostas e nunca exclui o legado. Reexecuções copiam apenas o que falta; contas desabilitadas não recebem associação habilitada. A senha existente é preservada.

Na primeira implantação, publique regras temporárias que aceitem os caminhos antigo e novo, faça backup e migre, publique os sites atualizados, depois publique `firestore.rules` final (que bloqueia a raiz) e repita a migração com outro backup para capturar respostas aceitas durante a transição. Confira a propagação das regras e a igualdade de todos os documentos legados no destino. Abas abertas com código anterior podem precisar de atualização após o corte. Mantenha o legado inacessível aos clientes até terminar a retenção acordada; não o apague automaticamente.

Backups novos usam schema 2 e contêm weddingId. Para importar backup antigo schema 1, o operador precisa informar explicitamente o destino e `--legacy`; nenhum backup de outro casamento schema 2 é aceito. Revogar uma associação não deve desabilitar a conta global. Os testes do emulador cobrem leitura entre casamentos, revogação independente, associação inválida, escrita pública, proteção de permissões e bloqueio do legado.
