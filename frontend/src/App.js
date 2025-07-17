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
// --- INÍCIO DA NOVA ADIÇÃO ---
// 1. Importa a nova página de discussão de caso.
import CaseDiscussionPage from './pages/CaseDiscussionPage';
// --- FIM DA NOVA ADIÇÃO ---


// Componente de Guarda para Rotas de Admin
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
                  
                  {/* --- INÍCIO DA NOVA ADIÇÃO --- */}
                  {/* 2. Adiciona a rota para a página de discussão. */}
                  {/* O caminho inclui o :patientId para sabermos de qual paciente é a discussão. */}
                  <Route path="patient/:patientId/discussion" element={<CaseDiscussionPage />} />
                  {/* --- FIM DA NOVA ADIÇÃO --- */}

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
