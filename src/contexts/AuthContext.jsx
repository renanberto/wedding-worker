import { createContext, useContext, useEffect, useState } from 'react';
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);
// O estado React apenas controla a interface. As regras autorizam cada leitura.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
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
  return <AuthContext.Provider value={{ ...session, login, logout }}>{children}</AuthContext.Provider>;
}
