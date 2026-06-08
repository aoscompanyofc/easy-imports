import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { usePermissionsStore } from '../../stores/permissionsStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { allowedPages, isAdmin, loaded } = usePermissionsStore();
  const location = useLocation();

  if (isLoading || (isAuthenticated && !loaded)) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
            <span className="text-black font-bold text-2xl">E</span>
          </div>
          <p className="text-sm text-neutral-400 font-medium animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Collaborators: block direct URL access to pages outside their allowedPages
  if (!isAdmin && loaded) {
    const pageKey = location.pathname.slice(1).split('/')[0];
    if (pageKey && !allowedPages.includes(pageKey)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
