import { createContext, useContext, useEffect, useState } from 'react';
import { browserLocalPersistence, onAuthStateChanged, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { demoMode, siteId } from '../lib/site';

const AuthContext = createContext(null);
// O estado React apenas controla a interface. As regras autorizam cada leitura.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  return demoMode ? <DemoAuthProvider>{children}</DemoAuthProvider> : <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}
function DemoAuthProvider({ children }) {
  const key = `wedding-demo:${siteId}:session`;
  const [active, setActive] = useState(() => sessionStorage.getItem(key) === 'active');
  const login = async () => { sessionStorage.setItem(key, 'active'); setActive(true); };
  const logout = async () => { sessionStorage.removeItem(key); setActive(false); };
  return <AuthContext.Provider value={{ user: active ? { uid: 'demo' } : null, isAdmin: active, loading: false, login, logout }}>{children}</AuthContext.Provider>;
}
function FirebaseAuthProvider({ children }) {
  const [session, setSession] = useState({ user: null, isAdmin: false, loading: Boolean(auth) });
  useEffect(() => {
    if (!auth) return;
    let generation = 0;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      const current = ++generation;
      setSession({ user: null, isAdmin: false, loading: true });
      let isAdmin = false;
      if (user) {
        try { isAdmin = (await getDoc(doc(db, 'admins', user.uid))).exists(); }
        catch { isAdmin = false; }
      }
      if (current === generation) setSession({ user, isAdmin, loading: false });
    });
    return () => { generation++; unsubscribe(); };
  }, []);
  async function login(email, password) {
    if (!auth) throw new Error('Firebase não configurado.');
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  }
  const logout = () => signOut(auth);
  const resetPassword = async email => {
    if (!auth) throw new Error('Firebase não configurado.');
    auth.languageCode = 'pt';
    try { await sendPasswordResetEmail(auth, email); }
    catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
  };
  return <AuthContext.Provider value={{ ...session, login, logout, resetPassword }}>{children}</AuthContext.Provider>;
}
