import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { PatientProvider } from './context/PatientContext';
import { ProgramProvider } from './context/ProgramContext';

// Importa todas as páginas necessárias
import LoginPage from './pages/LoginPage';
import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import ClientsPage from './pages/ClientsPage';
import ProgramsPage from './pages/ProgramsPage';
import NotesPage from './pages/NotesPage';
import DashboardPage from './pages/DashboardPage';
import ParentDashboardPage from './pages/ParentDashboardPage';
import AdminPage from './pages/AdminPage';
// --- NOVA IMPORTAÇÃO ---
import ProgramSessionPage from './pages/ProgramSessionPage';
import ColleaguesPage from './pages/ColleaguesPage';
import CaseDiscussionPage from './pages/CaseDiscussionPage';
import SuperAdminPage from './pages/SuperAdminPage';
// --- IMPORTAÇÕES DO SISTEMA DE AGENDAMENTO ---
import SchedulingPage from './pages/SchedulingPage';
import TherapistSchedulePage from './pages/TherapistSchedulePage';


// Componente de Guarda para Rotas de Admin
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user || !user.is_admin) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Componente de Guarda para Rotas de Super Admin
const SuperAdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};


function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="bg-gray-100 min-h-screen">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            {/* Rota Super Admin (sem layout principal e sem contexts desnecessários) */}
            <Route 
              path="/super-admin" 
              element={
                <SuperAdminRoute>
                  <SuperAdminPage />
                </SuperAdminRoute>
              } 
            />
            
            {/* O MainLayout agora envolve todas as páginas autenticadas com contexts */}
            <Route path="/" element={
              <PatientProvider>
                <ProgramProvider>
                  <MainLayout />
                </ProgramProvider>
              </PatientProvider>
            }>
                  <Route index element={<HomePage />} />

                  {/* Rotas específicas para cada função */}
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="parent-dashboard" element={<ParentDashboardPage />} />
                  <Route path="colleagues" element={<ColleaguesPage />} />
                  <Route path="case-discussion" element={<CaseDiscussionPage />} />
                  <Route 
                    path="admin" 
                    element={
                      <AdminRoute>
                        <AdminPage />
                      </AdminRoute>
                    } 
                  />

                  {/* --- ROTA CORRIGIDA --- */}
                  {/* A rota de programas não precisa mais do parâmetro, pois a página exibe a biblioteca completa. */}
                  <Route path="programs" element={<ProgramsPage />} />

                  {/* --- NOVA ROTA ADICIONADA --- */}
                  {/* Rota para a página de execução da sessão de um programa. */}
                  <Route path="session/:assignmentId" element={<ProgramSessionPage />} />

                  <Route path="notes" element={<NotesPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />

                  {/* --- ROTAS DO SISTEMA DE AGENDAMENTO --- */}
                  {/* Página de agendamento para administradores */}
                  <Route
                    path="scheduling"
                    element={
                      <AdminRoute>
                        <SchedulingPage />
                      </AdminRoute>
                    }
                  />

                  {/* Página de agenda pessoal para terapeutas */}
                  <Route path="my-schedule" element={<TherapistSchedulePage />} />

                </Route>

                {/* Redireciona qualquer outra rota para a página inicial */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
    </AuthProvider>
  );
}

export default App;
