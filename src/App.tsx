import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppRoutes } from './routes';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { usePermissionsStore } from './stores/permissionsStore';
import { removeStorage } from './lib/storage';

function App() {
  const { checkAuth, logout } = useAuthStore();
  const { isDark } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for session expiry / sign-out events from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_OUT') {
          // Clear local state without calling supabase.signOut again (already done)
          removeStorage('easy_imports_auth');
          usePermissionsStore.getState().reset();
          useAuthStore.setState({ isAuthenticated: false, user: null, isLoading: false });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [logout]);

  // Liquid Glass imersivo: dark mode ativa o tema de vidro da Apple em todo o app.
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.add('liquid-glass-theme');
    } else {
      root.classList.remove('dark');
      root.classList.remove('liquid-glass-theme');
    }
  }, [isDark]);

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AppRoutes />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#fff',
            color: '#1A1A1A',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
          },
          success: {
            iconTheme: {
              primary: '#FFC107',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
