import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

const help = `Cadastrar uma conta dos noivos e autorizar o painel administrativo.

Uso:
  npm run noivos:add -- --email pessoa@example.com --name "Nome"
  npm run noivos:add -- --project SEU_PROJECT_ID --email pessoa@example.com

O projeto padrão vem de VITE_FIREBASE_PROJECT_ID no ambiente/.env.local.
Autenticação administrativa: GOOGLE_APPLICATION_CREDENTIALS (arquivo fora do repo).
A senha é solicitada sem eco para contas novas. Para automação, use NOIVOS_PASSWORD.
Contas existentes mantêm a senha e o perfil; contas desabilitadas são recusadas.
Repita o comando para cada noivo/noiva. Nenhum e-mail é enviado pelo script.
`;

export function parseOptions(args, defaultProject) {
  const { values } = parseArgs({ args, options: {
    email: { type: 'string' }, name: { type: 'string' }, project: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) return { help: true };
  const email = values.email?.trim();
  const projectId = (values.project || defaultProject)?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe --email com um e-mail válido.');
  if (!projectId) throw new Error('Informe --project ou configure VITE_FIREBASE_PROJECT_ID em .env.local.');
  if (values.name !== undefined && (!values.name.trim() || values.name.trim().length > 256)) {
    throw new Error('--name deve conter de 1 a 256 caracteres.');
  }
  return { email, projectId, displayName: values.name?.trim() };
}

export async function provisionNoivo({ auth, db, email, displayName, getPassword, timestamp, onCreated = () => {} }) {
  let user;
  let created = false;
  try { user = await auth.getUserByEmail(email); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  if (!user) {
    const password = await getPassword();
    if (typeof password !== 'string' || password.length < 6 || password.length > 4096) {
      throw new Error('A senha deve ter entre 6 e 4096 caracteres e atender à política do projeto.');
    }
    user = await auth.createUser({ email, password, ...(displayName ? { displayName } : {}) });
    created = true;
    onCreated(user.uid);
  }
  if (user.disabled) throw new Error('Conta desabilitada. Revise-a no Console antes de conceder acesso.');
  if (!created && !user.providerData?.some(provider => provider.providerId === 'password')) {
    throw new Error('A conta existente não possui login por senha. Configure-o no Authentication antes de autorizar.');
  }
  // create() preserva os metadados existentes e permite reexecutar após falha parcial.
  try {
    await db.collection('admins').doc(user.uid).create({ email: user.email, createdAt: timestamp() });
  } catch (error) {
    if (error.code !== 6 && error.code !== 'already-exists') throw error;
  }
  return { uid: user.uid, created };
}

async function hiddenQuestion(label) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Use um terminal interativo ou configure NOIVOS_PASSWORD para contas novas.');
  }
  // O readline mantém edição/backspace, mas sua saída (inclusive a senha) é descartada.
  const output = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  process.stdout.write(label);
  try { return await rl.question(''); }
  finally { rl.close(); process.stdout.write('\n'); }
}

async function main() {
  const { loadEnv } = await import('vite');
  const env = loadEnv('development', process.cwd(), 'VITE_');
  const options = parseOptions(process.argv.slice(2), env.VITE_FIREBASE_PROJECT_ID);
  if (options.help) { console.log(help); return; }
  // Evita cadastrar Auth e admins em ambientes diferentes por variáveis esquecidas.
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Remova FIREBASE_AUTH_EMULATOR_HOST e FIRESTORE_EMULATOR_HOST; este comando cadastra no projeto real.');
  }
  console.log(`Projeto Firebase: ${options.projectId}`);
  const { initializeApp, applicationDefault, deleteApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const app = initializeApp({ credential: applicationDefault(), projectId: options.projectId });
  try {
    const result = await provisionNoivo({
      ...options, auth: getAuth(app), db: getFirestore(app), timestamp: () => FieldValue.serverTimestamp(),
      onCreated: uid => console.log(`Conta criada (UID: ${uid}). Autorizando no Firestore…`),
      getPassword: async () => {
        if (process.env.NOIVOS_PASSWORD !== undefined) {
          const password = process.env.NOIVOS_PASSWORD;
          delete process.env.NOIVOS_PASSWORD;
          return password;
        }
        const password = await hiddenQuestion('Senha da nova conta: ');
        if (password !== await hiddenQuestion('Confirme a senha: ')) throw new Error('As senhas não coincidem.');
        return password;
      },
    });
    console.log(`Acesso autorizado. UID: ${result.uid}. ${result.created ? 'Conta criada.' : 'Conta existente preservada.'}`);
    console.log('Acesse /#/admin/login com o e-mail e a senha da conta.');
  } finally { await deleteApp(app); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    // Erros do SDK podem conter detalhes da requisição; não os despeje no terminal.
    const code = error.code;
    const known = {
      'app/invalid-credential': 'Configure GOOGLE_APPLICATION_CREDENTIALS com uma conta de serviço autorizada.',
      'auth/insufficient-permission': 'A credencial não tem permissão para administrar o Authentication.',
      'auth/email-already-exists': 'A conta foi criada por outra operação. Execute novamente para autorizar o UID existente.',
      'auth/password-does-not-meet-requirements': 'A senha não atende à política do projeto.',
      'auth/invalid-password': 'A senha não foi aceita pelo Authentication.',
      5: 'Banco Firestore não encontrado. Crie o banco (default) no Console.',
      7: 'A credencial não tem permissão de escrita no Firestore.',
    };
    console.error(code ? `Falha (${code}): ${known[code] || 'Verifique as credenciais administrativas, o projeto e os serviços no Firebase Console.'}` : error.message);
    console.error('Se a conta já foi criada, ela foi preservada. Corrija a causa e execute novamente para concluir a autorização.');
    process.exitCode = 1;
  });
}
