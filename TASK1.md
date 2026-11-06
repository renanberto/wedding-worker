# TASK: Implementar sistema RSVP e painel administrativo no site de casamento

## 1. Contexto do projeto

Temos um site de casamento desenvolvido em React.js, com Vite, preparado para hospedagem estática no GitHub Pages.

O site já possui as seguintes seções:

- Home
- Nossa História
- O Casamento
- Hospedagem
- Lista de Presentes
- Confirmação de Presença (RSVP)

**Objetivo:** implementar um sistema completo de confirmação de presença integrado ao Firebase, com uma área administrativa exclusiva para os noivos.

A aplicação deve continuar 100% compatível com hospedagem estática e GitHub Actions.

## 2. Stack tecnológica

Utilizar:

- React.js e Vite existentes no projeto.
- React Router para navegação.
- Firebase Authentication para autenticação administrativa.
- Cloud Firestore para persistência das confirmações.
- CSS existente, mantendo a identidade visual do casamento.
- GitHub Actions para build e publicação.

Não utilizar:

- Backend Node.js dedicado.
- Google Forms ou Formspree.
- Autenticação Basic Auth implementada no frontend.
- Credenciais administrativas hardcoded.
- Dados sensíveis em variáveis públicas.
- Bibliotecas de UI pesadas desnecessárias.

## STEP 1: Inspecionar o projeto existente

Antes de qualquer alteração:

1. Analisar a estrutura atual do repositório.
2. Identificar a configuração do Vite.
3. Identificar os componentes e estilos existentes.
4. Identificar o formulário RSVP atual.
5. Identificar o workflow do GitHub Actions.
6. Verificar se já existe React Router ou Firebase.
7. Preservar todas as funcionalidades existentes.

Não recriar o projeto do zero.

**Critério de aceite:** o site público deve continuar funcionando e mantendo sua identidade visual original.

## STEP 2: Configurar Firebase

Instalar o SDK modular do Firebase.

Criar:

- `src/lib/firebase.js`
- `.env.example`

Configurar as variáveis:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Requisitos:

1. Inicializar o Firebase uma única vez.
2. Exportar instâncias de Authentication e Firestore.
3. Não utilizar service account no frontend.
4. Não armazenar senhas no código.
5. Utilizar variáveis de ambiente do Vite.
6. Incluir `.env.local` no `.gitignore`.
7. Documentar configuração local e de produção.

As configurações públicas do SDK Firebase não são senhas administrativas. A segurança deve depender das regras do Firestore e do Firebase Authentication.

## STEP 3: Implementar persistência do RSVP

Substituir o envio atual do formulário pelo Firestore.

Criar:

- `src/services/rsvpService.js`

Collection:

`rsvp_responses`

Modelo de documento:

```json
{
  "name": "João da Silva",
  "attendance": "yes",
  "guests": 2,
  "message": "Estaremos presentes!",
  "createdAt": "Firestore server timestamp"
}
```

Requisitos:

1. Permitir que convidados enviem RSVP sem login.
2. Validar nome obrigatório.
3. Validar presença como `yes` ou `no`.
4. Se a presença for `no`, definir `guests = 0`.
5. Se a presença for `yes`, exigir quantidade válida de pessoas.
6. Limitar o número de acompanhantes conforme configuração do projeto.
7. Limitar o tamanho da mensagem.
8. Exibir loading durante o envio.
9. Exibir sucesso somente após confirmação do Firestore.
10. Exibir erro amigável caso o envio falhe.
11. Evitar múltiplos envios por clique repetido.
12. Utilizar timestamps gerados pelo servidor.

Implementar validações tanto na aplicação quanto nas regras de segurança do Firestore.

Não permitir que convidados consultem, editem ou excluam confirmações.

**Critério de aceite:** convidado preenche o formulário, envia e o documento é armazenado no Firestore.

## STEP 4: Implementar autenticação administrativa

Criar:

- `src/pages/admin/Login.jsx`
- `src/components/admin/ProtectedRoute.jsx`
- `src/contexts/AuthContext.jsx`

Utilizar Firebase Authentication com e-mail e senha.

Requisitos:

1. Criar rota `/admin/login`.
2. Criar rota protegida `/admin`.
3. Permitir login somente para contas administrativas autorizadas.
4. Não disponibilizar cadastro público de administradores.
5. Criar usuários administrativos manualmente pelo Firebase Console.
6. Manter sessão entre atualizações da página.
7. Implementar logout.
8. Exibir loading durante a verificação da sessão.
9. Redirecionar visitantes não autenticados para login.
10. Não permitir acesso aos dados apenas por conhecer a rota.
11. Exibir erros de autenticação sem revelar informações desnecessárias.

A autorização deve ser implementada no Firestore Security Rules, não apenas na interface React.

**Importante:** não considerar qualquer usuário autenticado automaticamente como administrador.

Implementar autorização por lista explícita de UIDs administrativos nas regras do Firestore ou por mecanismo equivalente seguro, sem depender de uma lista controlável pelo próprio usuário.

## STEP 5: Criar dashboard dos noivos

Criar:

- `src/pages/admin/Dashboard.jsx`
- `src/components/admin/StatsCards.jsx`
- `src/components/admin/GuestTable.jsx`
- `src/components/admin/GuestFilters.jsx`

O dashboard deverá ter uma identidade visual compatível com o casamento, mas adaptada para uso administrativo.

### Indicadores

Exibir:

- Total de respostas recebidas.
- Total de respostas positivas.
- Total de respostas negativas.
- Total de pessoas confirmadas, considerando o campo `guests`.

Exemplo:

| Indicador | Valor |
|---|---:|
| Respostas recebidas | 96 |
| Confirmaram presença | 84 |
| Não comparecerão | 12 |
| Pessoas confirmadas | 142 |

Os indicadores devem ser calculados a partir dos dados reais do Firestore.

Não utilizar números fictícios na aplicação final.

### Tabela de confirmações

Colunas:

- Nome do convidado.
- Presença.
- Quantidade de pessoas.
- Mensagem.
- Data da confirmação.

Funcionalidades:

1. Buscar por nome.
2. Filtrar confirmados.
3. Filtrar ausentes.
4. Ordenar por data.
5. Visualizar mensagens completas.
6. Exibir estado vazio.
7. Exibir loading.
8. Tratar erros de leitura.

O dashboard deve funcionar corretamente em celulares.

Para telas pequenas, utilizar cards ou tabela com rolagem horizontal apropriada.

## STEP 6: Implementar exportação CSV

Adicionar botão:

`Exportar confirmações`

O arquivo CSV deverá conter:

```csv
Nome,Presenca,Pessoas,Mensagem,Data
João da Silva,Sim,2,Estaremos presentes!,2026-12-01
Maria Souza,Não,0,Infelizmente não poderemos ir,2026-12-02
```

Requisitos:

1. Exportar os dados reais carregados do Firestore.
2. Respeitar caracteres UTF-8 e acentuação.
3. Tratar vírgulas, aspas e quebras de linha.
4. Proteger contra CSV formula injection.
5. Utilizar nome de arquivo com data.
6. Não enviar dados para serviços externos.

Somente administradores autorizados devem conseguir consultar e exportar os registros.

## STEP 7: Criar Firestore Security Rules

Criar arquivo:

`firestore.rules`

Regras obrigatórias:

- Convidados anônimos podem criar respostas válidas.
- Convidados anônimos não podem listar respostas.
- Convidados anônimos não podem ler documentos individuais.
- Convidados anônimos não podem alterar respostas.
- Convidados anônimos não podem excluir respostas.
- Administradores explicitamente autorizados podem consultar respostas.
- Nenhum usuário pode modificar regras ou permissões pelo frontend.
- Campos adicionais desconhecidos devem ser rejeitados.
- Tipos e limites dos campos devem ser validados.

A criação pública deve permitir apenas a estrutura definida para RSVP.

**Observação de segurança:** como o RSVP aceita envios anônimos, implementar medidas de mitigação de spam e abuso, como Firebase App Check e controles apropriados de taxa/volume quando disponíveis. Documentar as limitações: somente regras do Firestore e App Check não garantem proteção total contra envios automatizados.

Não considerar a simples ocultação do endpoint ou da configuração Firebase uma medida de segurança.

Criar testes das regras usando Firebase Emulator Suite.

**Critério de aceite:** um usuário anônimo não consegue consultar a lista de confirmações, mesmo realizando requisições diretamente ao Firestore.

## STEP 8: Implementar navegação e proteção de rotas

Rotas desejadas:

```text
/                Site público
/admin/login     Login administrativo
/admin           Dashboard protegido
```

Requisitos:

1. Não quebrar navegação existente.
2. Não alterar links públicos desnecessariamente.
3. Utilizar roteamento compatível com GitHub Pages.
4. Preferir HashRouter se o ambiente não possuir fallback para SPA.
5. Considerar corretamente o `base` do Vite.
6. Garantir funcionamento após atualização da página nas rotas administrativas.

Se utilizar HashRouter, as URLs administrativas poderão ser:

```text
/#/admin/login
/#/admin
```

## STEP 9: Configurar GitHub Actions

Revisar o workflow existente em:

`.github/workflows/`

A pipeline deverá:

1. Executar checkout.
2. Configurar Node.js em versão LTS suportada.
3. Instalar dependências usando `npm ci`.
4. Executar lint, quando configurado.
5. Executar testes automatizados.
6. Executar `npm run build`.
7. Gerar artefato estático com o conteúdo de `dist/`.
8. Disponibilizar artefato para download.
9. Publicar no GitHub Pages, quando configurado.

Configurar variáveis do Firebase através de GitHub Actions Variables ou Secrets, conforme apropriado.

Não incluir credenciais de service account no build frontend.

Garantir que o site compilado utilize arquivos JavaScript em `/assets/`, e nunca entregue `src/main.jsx` diretamente ao navegador.

Configurar corretamente o `base` do Vite para domínio próprio ou subdiretório de repositório, conforme o destino real do deploy.

## STEP 10: Testes e qualidade

Implementar testes para:

- Validação do formulário RSVP.
- Envio válido.
- Falha de envio.
- Quantidade inválida de acompanhantes.
- Proteção de rota.
- Usuário não autenticado.
- Usuário autenticado sem autorização administrativa.
- Cálculo dos indicadores.
- Filtros da tabela.
- Exportação CSV.
- Firestore Security Rules.

Executar:

```bash
npm ci
npm run build
```

Executar também os comandos de lint e testes definidos no `package.json`.

Realizar verificação responsiva em:

- 360px.
- 390px.
- 768px.
- 1024px.
- 1440px.

Evitar erros no console e problemas de overflow horizontal.

## STEP 11: Documentação

Atualizar o `README.md` com:

1. Como configurar o Firebase.
2. Como habilitar Authentication.
3. Como criar o usuário administrativo.
4. Como obter o UID administrativo.
5. Como configurar e publicar as Firestore Security Rules.
6. Como configurar App Check.
7. Como iniciar localmente.
8. Como testar o RSVP.
9. Como acessar o dashboard.
10. Como executar testes.
11. Como configurar GitHub Actions.
12. Como publicar no GitHub Pages.
13. Como exportar dados.
14. Limitações de custo e cotas gratuitas do Firebase.

Não criar credenciais reais ou informações fictícias de produção.

## STEP 12: Critérios finais de aceite

A implementação só deverá ser considerada concluída quando:

- [ ] O site público continuar funcionando.
- [ ] O layout original for preservado.
- [ ] O formulário RSVP salvar dados no Firestore.
- [ ] Visitantes não conseguirem ler os registros.
- [ ] Somente administradores autorizados conseguirem acessar o dashboard e consultar dados.
- [ ] O login e o logout funcionarem.
- [ ] Os indicadores utilizarem dados reais.
- [ ] A busca e os filtros funcionarem.
- [ ] A exportação CSV funcionar.
- [ ] A aplicação for responsiva.
- [ ] As regras do Firestore possuírem testes.
- [ ] O build de produção funcionar.
- [ ] O GitHub Actions gerar o artefato corretamente.
- [ ] A documentação estiver atualizada.

## Instruções finais ao Codex

Execute a implementação diretamente no repositório existente, em etapas lógicas.

Antes de alterar arquivos, inspecione o código e identifique os componentes que podem ser reutilizados.

Priorize segurança, simplicidade, baixo custo operacional e manutenção.

Não substitua componentes funcionais sem necessidade.

Não faça deploy de produção nem configure recursos externos sem as credenciais e permissões apropriadas.

Ao finalizar:

1. Apresente os arquivos criados e modificados.
2. Explique as decisões arquiteturais.
3. Liste os testes executados e resultados.
4. Informe as configurações manuais pendentes no Firebase Console.
5. Informe os passos necessários para publicação.
6. Destaque qualquer funcionalidade não implementada ou não validada.

Não declare que algo foi testado se o teste não foi executado.