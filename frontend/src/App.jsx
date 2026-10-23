import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
import AuthorPortal from './components/AuthorPortal';
import AdminPortal from './components/AdminPortal';

function MainApp() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return user.role === 'ADMIN' ? <AdminPortal /> : <AuthorPortal />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}