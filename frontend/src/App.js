import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

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
import ParentChatPage from './pages/ParentChatPage';
import SuperAdminPage from './pages/SuperAdminPage';
// --- IMPORTAÇÕES DO SISTEMA DE AGENDAMENTO ---
import SchedulingPage from './pages/SchedulingPage';
import TherapistSchedulePage from './pages/TherapistSchedulePage';
import TherapistAvailabilityPage from './pages/TherapistAvailabilityPage';
// --- IMPORTAÇÃO DA PÁGINA DE NOTIFICAÇÕES ---
import NotificationsPage from './pages/NotificationsPage';


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

// Componente de Guarda para Rotas Pro (FASE 2)
const ProRoute = ({ children }) => {
  const { canAccessDashboard } = useAuth();
  if (!canAccessDashboard()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Componente de Guarda para Programas (FASE 2)
const ProgramsRoute = ({ children }) => {
  const { canAccessPrograms } = useAuth();
  if (!canAccessPrograms()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
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

                  {/* --- ROTA PROTEGIDA (FASE 2) --- */}
                  {/* Discussões de caso: apenas plano Pro */}
                  <Route
                    path="case-discussion"
                    element={
                      <ProRoute>
                        <CaseDiscussionPage />
                      </ProRoute>
                    }
                  />
                  <Route 
                    path="admin" 
                    element={
                      <AdminRoute>
                        <AdminPage />
                      </AdminRoute>
                    } 
                  />

                  {/* --- ROTA PROTEGIDA (FASE 2) --- */}
                  {/* Programas: apenas plano Pro */}
                  <Route
                    path="programs"
                    element={
                      <ProgramsRoute>
                        <ProgramsPage />
                      </ProgramsRoute>
                    }
                  />

                  {/* --- ROTA PROTEGIDA (FASE 2) --- */}
                  {/* Sessão de programa: apenas plano Pro */}
                  <Route
                    path="session/:assignmentId"
                    element={
                      <ProgramsRoute>
                        <ProgramSessionPage />
                      </ProgramsRoute>
                    }
                  />

                  <Route path="notes" element={<NotesPage />} />

                  {/* --- ROTA PROTEGIDA (FASE 2) --- */}
                  {/* Dashboard: apenas plano Pro */}
                  <Route
                    path="dashboard"
                    element={
                      <ProRoute>
                        <DashboardPage />
                      </ProRoute>
                    }
                  />

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

                  {/* Página de gestão de disponibilidade (híbrida: admin vê todos, terapeuta vê só o seu) */}
                  <Route path="availability" element={<TherapistAvailabilityPage />} />

                  {/* Página de notificações */}
                  <Route path="notifications" element={<NotificationsPage />} />

                  {/* --- ROTA PROTEGIDA (FASE 2) --- */}
                  {/* Chat com pais: apenas plano Pro */}
                  <Route
                    path="parent-chat"
                    element={
                      <ProRoute>
                        <ParentChatPage />
                      </ProRoute>
                    }
                  />

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
