import { createContext, useContext, useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    fetch(`${BASE}/auth/me`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(user => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    // Handle redirect back from Discord
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      window.history.replaceState({}, '', '/');
      fetch(`${BASE}/auth/me`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(setUser);
    }
  }, []);

  function login() {
    window.location.href = `${BASE}/auth/discord`;
  }

  async function logout() {
    await fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
