# Site de casamento · React + Vite + GitHub Pages

Site elegante e responsivo, inspirado no print de referência enviado. Seções: Home, Nossa História, Casamento, RSVP, Hospedagem, Presentes e Mensagem.

## 1. Requisitos

- Node.js 22+
- Conta GitHub
- Para RSVP funcional: conta Formspree com formulário criado

## 2. Executar localmente

```bash
npm install
cp .env.example .env
# edite .env com endpoint real (ou teste o site sem envio de formulário)
npm run dev
```

Abra o endereço mostrado pelo Vite. Validar e compilar:

```bash
npm run check
```

A pasta `dist/` gerada é o site estático publicável, sem necessidade de servidor Node.js.

## 3. Personalizar textos, datas e links

Edite **`src/content.js`**. Os nomes e dados atuais são **DEMONSTRATIVOS**. Substitua todos os campos antes da publicação:

- nomes dos noivos, data, cidade, história;
- endereços, horário, traje, URLs de Google Maps ou Waze;
- sugestões de hotéis, diárias, URLs de reserva;
- lista de presentes, link externo e prazo de RSVP.

Os links vazios exibem `Em breve`, nunca direcionam para endereços inventados.

### Identidade visual

O monograma e a ilustração foram **recortados da imagem de exemplo enviada**, somente para reprodução fiel da referência. Estão em `public/images/`. **Verifique direitos de uso e substitua-os pelos arquivos oficiais fornecidos pela equipe de papelaria/design antes de publicar.** As fontes são carregadas do Google Fonts; se quiser disponibilizar offline, hospede fontes licenciadas no próprio site.

## 4. Formulário RSVP de verdade (essencial)

O GitHub Pages só publica arquivos estáticos. Ele **não armazena respostas do formulário**. Este projeto integra com a API do **Formspree** (https://formspree.io/), serviço externo de formulários.

1. Crie um formulário no Formspree.
2. Copie o endpoint HTTPS (`https://formspree.io/f/XXXXXXXX`).
3. Desenvolvimento local: crie `.env` com `VITE_FORMSPREE_ENDPOINT=...`.
4. GitHub: repositório → **Settings → Secrets and variables → Actions → Variables → New repository variable**.
5. Crie a variável **`VITE_FORMSPREE_ENDPOINT`** com o endpoint.
6. Dispare o workflow novamente (Actions → Build and Deploy GitHub Pages → Run workflow).
7. Faça **um envio real** com o formulário publicado e confira no painel Formspree se recebeu nome, comparecimento, quantidade e mensagem.

O site mostra feedback de sucesso **somente se a API confirmar o envio**. Se o endpoint não estiver configurado, mostra uma mensagem de erro em vez de fingir confirmação. O limite gratuito e funcionalidades de exportação dependem do plano vigente do serviço.

**Privacidade:** o formulário envia nome, presença, número de pessoas e mensagem para um processador externo. Antes da publicação, inclua uma política de privacidade conforme as necessidades do evento, informe os convidados e restrinja o acesso às respostas no painel do provedor. Evite solicitar dados desnecessários.

**Limitação funcional:** o campo quantidade permite 1 a 10 pessoas; não existe validação contra uma lista nominal de convidados. Para restringir acompanhantes por convite, é necessário um serviço com autenticação/validação no servidor.

## 5. GitHub Actions: compilação, artefato e deploy

1. Crie um repositório e envie o projeto para a branch `main`.
2. Repositório → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. O push em `main` executa `npm install`, lint, build e gera:
   - `casamento-static-dist`: artefato ZIP disponível para baixar na página do workflow, com os arquivos estáticos de `dist/`;
   - artefato interno `github-pages` para deploy automático via GitHub Pages.
4. O job `deploy` publica o site e oferece a URL pública da página na execução.

Para o repositório `renanberto/wedding-worker`, mantenha **Source: GitHub Actions**. O workflow existente publica `dist/` diretamente; não é necessário selecionar uma branch/pasta de publicação nem criar outro workflow pelo assistente do Pages. Sem domínio personalizado, deixe `PAGES_BASE_PATH` ausente: a base será `/wedding-worker/` e a URL será `https://renanberto.github.io/wedding-worker/`.

Após enviar uma correção para `main`, acompanhe **Actions → Build and Deploy GitHub Pages** e confirme que os jobs `build` e `deploy` terminaram com sucesso. Para executar novamente sem outro commit, use **Run workflow** na branch `main`. Depois da publicação, confira o endereço em **Settings → Pages** e ative **Enforce HTTPS** se a opção estiver disponível.

### Endereço e base path

- Repositório `usuario/casamento`: endereço `https://usuario.github.io/casamento/`, base automática `/casamento/`.
- Repositório `usuario/usuario.github.io`: endereço `https://usuario.github.io/`. Nesse caso configure a variável Actions **`PAGES_BASE_PATH` = `/`**.
- Domínio personalizado na raiz: configure **`PAGES_BASE_PATH` = `/`**, ative o domínio nas configurações de Pages e configure DNS. Com este workflow de GitHub Actions, um arquivo `public/CNAME` não é necessário.

### Domínio `test.ondadeideias.com`

1. No repositório `renanberto/wedding-worker`, abra **Settings → Pages**, mantenha **Source: GitHub Actions**, informe **Custom domain: `test.ondadeideias.com`** e clique em **Save**.
2. No provedor DNS de `ondadeideias.com`, crie um registro **CNAME**, nome **`test`**, destino **`renanberto.github.io`**, TTL automático/padrão. O destino não deve conter protocolo ou caminho do repositório. Substitua eventuais registros conflitantes apenas do host `test`.
3. No repositório, em **Settings → Secrets and variables → Actions → Variables**, crie/atualize **`PAGES_BASE_PATH`** com o valor **`/`**. Isso faz o build gerar os caminhos de JS, CSS e imagens para a raiz do domínio.
4. Envie as correções para `main` ou, se já estiverem publicadas na branch, execute **Actions → Build and Deploy GitHub Pages → Run workflow** na branch `main`.
5. Aguarde a validação DNS e a emissão do certificado em **Settings → Pages**, depois ative **Enforce HTTPS**. A opção pode levar até 24 horas para ficar disponível.

O site será acessado em `https://test.ondadeideias.com/`. O nome do repositório continua `wedding-worker`.

Referência: [domínios personalizados no GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

Em qualquer hospedagem estática diferente de GitHub Pages, publique o conteúdo de `dist/`. Se ficar sob uma subpasta, ajuste `GITHUB_PAGES_BASE` no build.

## 6. Checklist antes de divulgar o Save the Date

- [ ] Substituir todas as informações demonstrativas em `src/content.js`.
- [ ] Substituir monograma e igreja pelos arquivos oficiais autorizados.
- [ ] Configurar endpoint Formspree e testar envio real no domínio final.
- [ ] Validar mapas, reserva de hospedagem e links de presentes.
- [ ] Testar iPhone, Android, teclado e navegadores atuais.
- [ ] Conferir domínio/HTTPS e prazo do evento.
- [ ] Avaliar adequação de aviso de privacidade para dados de convidados.

## Estrutura

```
.github/workflows/deploy.yml    # Build, artifacts e Pages
public/images/                 # Arte de referencia (substituir)
src/content.js                 # Dados do casamento
src/App.jsx                    # Componentes React e RSVP
src/styles.css                 # Layout e responsividade
src/main.jsx                   # Ponto de entrada
vite.config.js                 # Base path customizavel
```
