import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { PatientProvider } from './context/PatientContext';
import { ProgramProvider } from './context/ProgramContext';

// Importa todas as páginas necessárias
import LoginPage from './pages/LoginPage';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage'; // <<< A nossa nova página inicial
import ClientsPage from './pages/ClientsPage';
import ProgramsPage from './pages/ProgramsPage';
import NotesPage from './pages/NotesPage';
import DashboardPage from './pages/DashboardPage';
import ParentDashboardPage from './pages/ParentDashboardPage'; // Importa o dashboard dos pais
import AdminPage from './pages/AdminPage'; // Importa a página de admin

// Componente de Guarda para Rotas de Admin (permanece o mesmo)
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user || !user.is_admin) {
    return <Navigate to="/" replace />;
  }
  return children;
};


function App() {
  return (
    <AuthProvider>
      <PatientProvider>
        <ProgramProvider>
          <Router>
            <div className="bg-gray-100 min-h-screen">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                
                {/* O MainLayout agora envolve todas as páginas autenticadas */}
                <Route path="/" element={<MainLayout />}>
                  {/* <<< ATUALIZADO: A rota principal agora é a HomePage >>> */}
                  {/* Ela irá redirecionar para a página correta com base na função */}
                  <Route index element={<HomePage />} />

                  {/* Rotas específicas para cada função */}
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="parent-dashboard" element={<ParentDashboardPage />} />
                  <Route 
                    path="admin" 
                    element={
                      <AdminRoute>
                        <AdminPage />
                      </AdminRoute>
                    } 
                  />

                  {/* Rotas partilhadas */}
                  <Route path="programs" element={<ProgramsPage />} />
                  <Route path="notes" element={<NotesPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  
                </Route>

                {/* Redireciona qualquer outra rota para a página inicial */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
        </ProgramProvider>
      </PatientProvider>
    </AuthProvider>
  );
}

export default App;
