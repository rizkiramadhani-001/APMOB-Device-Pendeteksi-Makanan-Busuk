import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// Simple hash for localStorage passwords (not production-grade crypto)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch(e) {}
    }
    setLoading(false);
  }, []);

  const signUp = async (username, password, fullName) => {
    const hashedPw = await hashPassword(password);

    if (supabase) {
      // Check if username already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (existing) {
        return { error: { message: 'Username sudah digunakan.' } };
      }

      const { data, error } = await supabase
        .from('users')
        .insert([{ username, password: hashedPw, full_name: fullName }])
        .select()
        .single();

      if (error) {
        return { error: { message: error.message } };
      }

      const userData = { id: data.id, username: data.username, full_name: data.full_name };
      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      toast.success('Registrasi berhasil!');
      return { error: null };
    }

    // Fallback: localStorage-based registration
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    if (users.find(u => u.username === username)) {
      return { error: { message: 'Username sudah digunakan.' } };
    }
    const newUser = {
      id: 'local_' + Date.now(),
      username,
      full_name: fullName,
      created_at: new Date().toISOString()
    };
    users.push({ ...newUser, password: hashedPw });
    localStorage.setItem('local_users', JSON.stringify(users));
    setUser(newUser);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    toast.success('Registrasi berhasil!');
    return { error: null };
  };

  const signIn = async (username, password) => {
    const hashedPw = await hashPassword(password);

    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', hashedPw)
        .single();

      if (error || !data) {
        return { error: { message: 'Username atau password salah.' } };
      }

      const userData = { id: data.id, username: data.username, full_name: data.full_name };
      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      toast.success('Login berhasil!');
      return { error: null };
    }

    // Fallback: localStorage-based login
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    const found = users.find(u => u.username === username && u.password === hashedPw);
    if (!found) {
      return { error: { message: 'Username atau password salah.' } };
    }
    const { password: _, ...userData } = found;
    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    toast.success('Login berhasil!');
    return { error: null };
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    toast.success('Berhasil logout.');
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
