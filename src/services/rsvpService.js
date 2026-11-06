import { validateRsvp } from '../lib/rsvp';

// O site público só baixa o SDK quando há um envio; o painel o carrega ao abrir.
async function getServices() {
  const [{ db }, firestore] = await Promise.all([import('../lib/firebase'), import('../lib/firestoreApi')]);
  return { db, ...firestore };
}
export async function submitRsvp(values) {
  const data = validateRsvp(values);
  try {
    const { db, addDoc, collection, serverTimestamp } = await getServices();
    if (!db) throw new Error('Firebase não configurado.');
    await addDoc(collection(db, 'rsvp_responses'), { ...data, createdAt: serverTimestamp() });
  } catch {
    throw new Error('Não foi possível registrar sua resposta. Tente novamente mais tarde ou verifique sua conexão.');
  }
}
export async function loadResponses() {
  const { db, getDocs, query, collection, orderBy } = await getServices();
  if (!db) throw new Error('Firebase não configurado.');
  const snapshot = await getDocs(query(collection(db, 'rsvp_responses'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}
