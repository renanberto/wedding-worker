import { validateRsvp } from '../lib/rsvp';
import { demoMode, weddingId } from '../lib/site';

// O site público só baixa o SDK quando há um envio; o painel o carrega ao abrir.
async function getServices() {
  const [{ db }, firestore] = await Promise.all([import('../lib/firebase'), import('../lib/firestoreApi')]);
  return { db, ...firestore };
}
export async function submitRsvp(values) {
  const data = validateRsvp(values);
  if (demoMode) {
    const { saveDemoResponse } = await import('../lib/demo');
    saveDemoResponse(data);
    return;
  }
  try {
    const { db, addDoc, collection, serverTimestamp } = await getServices();
    if (!db) throw new Error('Firebase não configurado.');
    await addDoc(collection(db, 'weddings', weddingId, 'rsvp_responses'), { ...data, createdAt: serverTimestamp() });
  } catch (cause) {
    // Só o código técnico vai para o console: nunca os dados do convidado.
    const code = typeof cause?.code === 'string' ? cause.code : 'rsvp/unknown';
    console.error('[RSVP] Falha ao registrar resposta.', { code });
    const message = code === 'permission-denied' || code === 'unauthenticated'
      ? 'Não foi possível registrar sua resposta no momento. Por favor, avise os noivos para que verifiquem o formulário.'
      : 'Não foi possível registrar sua resposta. Tente novamente mais tarde ou verifique sua conexão.';
    const error = new Error(message, { cause });
    error.code = code;
    throw error;
  }
}
export async function loadResponses() {
  if (demoMode) {
    const { readDemoResponses } = await import('../lib/demo');
    return readDemoResponses();
  }
  const { db, getDocs, query, collection, orderBy } = await getServices();
  if (!db) throw new Error('Firebase não configurado.');
  const snapshot = await getDocs(query(collection(db, 'weddings', weddingId, 'rsvp_responses'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}
