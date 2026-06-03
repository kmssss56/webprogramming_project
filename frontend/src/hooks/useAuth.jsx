import { useState, useEffect, createContext, useContext } from 'react';
import { api } from '../utils/api';
import { storage } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = storage.getToken();
    if (!token) { setLoading(false); return; }
    api.get('/users/me')
      .then(setUser)
      .catch(() => storage.removeToken())
      .finally(() => setLoading(false));
  }, []);

  const logout = () => { storage.removeToken(); setUser(null); };
  const refreshUser = () => api.get('/users/me').then(setUser);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
