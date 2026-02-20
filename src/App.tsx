import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './store/authContext';
import Login from './pages/Login';
import Chofer from './pages/Chofer';
import Admin from './pages/Admin';
import Visor from './pages/Visor';
import Live from './pages/Live';
import type { Role } from './types';

function ProtectedRoute({ element, roles }: { element: React.ReactElement; roles: Role[] }) {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-water-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-water-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return element;
}

function RootRedirect() {
  const { user, loading } = useAuthContext();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

function roleHome(role: Role): string {
  if (role === 'Admin')  return '/admin';
  if (role === 'Visor')  return '/visor';
  return '/chofer';
}

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <AuthProvider>
        <Routes>
          <Route path="/"       element={<RootRedirect />} />
          <Route path="/login"  element={<Login />} />
          <Route path="/chofer" element={<ProtectedRoute element={<Chofer />} roles={['Chofer', 'Admin']} />} />
          <Route path="/admin"  element={<ProtectedRoute element={<Admin />}  roles={['Admin']} />} />
          <Route path="/visor"  element={<ProtectedRoute element={<Visor />}  roles={['Visor', 'Admin']} />} />
          <Route path="/live"   element={<ProtectedRoute element={<Live />}   roles={['Admin']} />} />
          <Route path="*"       element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
