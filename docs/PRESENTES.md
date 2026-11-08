# Lista de presentes

Os noivos acessam **Gerenciar presentes** no painel. Cada presente tem título, descrição e, opcionalmente, links HTTPS para loja e imagem. É possível editar, arquivar e republicar itens disponíveis. Uma reserva ativa precisa ser liberada antes de editar ou arquivar o presente; essa liberação cancela o link anterior. A compra e a entrega são combinadas com o casal; o site registra a escolha, sem processar pagamentos.

O convidado escolhe um item, informa nome e e-mail e recebe um link. A reserva fica pendente por 30 minutos e bloqueia outra escolha daquele item. O link abre uma página com botão de confirmação: abrir o e-mail ou visitar a página não confirma sozinho. Após o clique, a escolha fica confirmada. Sem confirmação, a disponibilidade é calculada automaticamente como livre depois do prazo, sem precisar de cron. Um link expirado ou cancelado não consegue confirmar uma nova reserva do mesmo presente.

Os links contêm segredo no fragmento da URL, enviado à API somente no corpo do POST. A API guarda apenas seu hash, não devolve tokens ou dados dos convidados no catálogo público e não registra conteúdos de requisições em logs. Uma falha conhecida no envio tenta cancelar a reserva e liberar o presente; se a gravação dessa liberação falhar, o prazo de 30 minutos ainda libera o item. Repetições da mesma solicitação usam a mesma chave de idempotência no provedor. A aceitação pelo provedor não garante entrega na caixa de entrada: acompanhe rejeições, spam e métricas no serviço de e-mail.

## Dados e identidade do backend

Por casamento:

```
weddings/{weddingId}/gifts/{giftId}
weddings/{weddingId}/gift_reservations/{reservationId}
weddings/{weddingId}/gift_rate_limits/{bucket}
weddings/{weddingId}/services/gifts
```

O frontend chama `/api/gifts` no próprio domínio. O build real inclui um Worker avançado do Pages, chamado somente em `/api/*`. O weddingId, o projeto Firebase e a origem dos links vêm do cadastro do site e são fixados no build. O token de login dos noivos é conferido no Firebase e sua associação `members/{uid}` é lida a cada chamada administrativa. Não há cadastro de conta para convidados.

O Worker recebe um refresh token de uma identidade Firebase sem e-mail/senha, com claim `giftServiceFor` limitada a esse casamento. As regras permitem a essa identidade ler o cadastro público e os membros para autorização, e operar somente as três coleções de presentes daquele casamento. Ela não pode alterar membros, eventos ou respostas RSVP. Nenhuma chave administrativa Google vai para o runtime ou para o build. `services/gifts.enabled=false` revoga o acesso dessa identidade pelas regras; para encerrar também sua autenticação, desabilite a conta de serviço no Firebase Authentication e revogue seus refresh tokens pelo Admin SDK.

As alterações usam commits atômicos com precondições `updateTime`/`exists` em todos os documentos alterados, com releitura e até cinco tentativas em conflito. Isso protege o presente, a reserva e os contadores contra gravações concorrentes. Leituras auxiliares não são snapshots globais; as regras também impedem criar ou confirmar reservas com o evento encerrado. Não usamos transações pessimistas REST, que não são oferecidas a identidades Firebase.

## Configurar um site real

1. Cadastre o evento e os administradores conforme OPERACAO.md. Configure `.env.local` local com o projeto correto. Publicar `firestore.rules` é uma etapa administrativa explícita, após os testes.
2. Com `GOOGLE_APPLICATION_CREDENTIALS` administrativo local e `gh` autenticado, execute `node scripts/provision-gift-service.js --project wedding-app-onda --wedding test`. Esse comando apenas simula; acrescente `--apply` para criar a identidade e salvar `GIFTS_FIREBASE_REFRESH_TOKEN` e `GIFTS_TOKEN_SECRET` no ambiente GitHub `site-test`. Não cria arquivos de credenciais nem imprime tokens. Para outro evento, use seu weddingId; o ambiente vem do cadastro.
3. Configure os segredos **RESEND_API_KEY** e **GIFTS_FROM_EMAIL** no mesmo ambiente GitHub. O remetente pode ser `Nome do casal <presentes@dominio-verificado>`. Verifique o domínio e configure os registros DNS exigidos pelo Resend antes do envio real. Nunca coloque esses segredos em VITE_*, código, issues ou comentários.
4. O deploy sincroniza os segredos em memória com `wrangler pages secret bulk` antes de publicar o Worker, preservando os demais segredos do Pages. Sem remetente/chave de e-mail, o catálogo administrativo funciona, mas a escolha pública permanece desabilitada. Sem identidade de backend, o deploy é bloqueado; provisione cada novo casamento real antes de publicar.
5. Valide uma escolha com uma caixa de entrada controlada, clique no link, confira o painel e a indisponibilidade do item. Confira também o domínio canônico: os e-mails sempre apontam para ele. O projeto Pages alternativo pode receber chamadas, mas não altera a origem dos links.

O script de provisionamento rotaciona o segredo de idempotência quando reexecutado. Links já enviados continuam verificáveis pelo hash gravado; solicitações pendentes do navegador podem precisar de nova escolha. Revise operações parcialmente concluídas antes de reexecutar: um UID de serviço ocupado ou desabilitado é recusado. Não desabilite contas humanas ao revogar somente uma associação de casamento.

## Privacidade, limites e operação

Nome e e-mail só aparecem na API administrativa. Há limites de 10 solicitações por IP/hora, 3 por destinatário/hora e 100 por casamento/hora. IPs e destinatários dos contadores são identificados por HMAC com segredo do site; o IP não é gravado em texto. Esses limites reduzem abuso; não substituem proteção adicional e monitoramento caso o site receba tráfego hostil. Mantenha as quotas gratuitas de Firestore/Workers e os limites de envio do provedor em observação.

O painel mostra todas as sugestões e as últimas 200 solicitações. Reservas expiradas continuam no histórico, mas deixam o presente livre. Os contadores têm `expiresAt` textual para apoiar limpeza administrativa após sete dias; não há TTL automático configurado. Defina e execute a retenção de nomes/e-mails e a limpeza de contadores conforme a operação do evento. O backup `guests:backup` cobre RSVP, não presentes: inclua as coleções de presentes em uma exportação administrativa privada antes de alterações ou encerramento. Nunca compartilhe exportações de reservas em artefatos públicos.

O exemplo moderno e todas as prévias usam sessionStorage. Ali, os presentes e nomes são fictícios e um link permite simular a confirmação na própria aba; não há chamada ao Firebase, à API de presentes ou ao Resend. Uma nova sessão inicia outra demonstração.

## Verificação

`npm test` cobre confirmação, expiração, falha de envio, idempotência, limites, privacidade e autorização. `npm run test:rules` inclui disputa concorrente usando REST e identidade restrita no emulador, bloqueio do SDK cliente, isolamento entre eventos e revogação do serviço. O Playwright cobre cadastro, escolha, confirmação explícita, liberação, arquivamento e acessibilidade na demonstração.
