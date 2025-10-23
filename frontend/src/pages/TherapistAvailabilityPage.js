// frontend/src/pages/TherapistAvailabilityPage.js

import React from 'react';
import { useAuth } from '../context/AuthContext';
import TherapistAvailabilityManager from '../components/availability/TherapistAvailabilityManager';
import AdminAvailabilityManagementPage from './AdminAvailabilityManagementPage';

/**
 * Página de gestão de disponibilidade de agenda
 * Híbrido:
 * - Admin: vê lista de todos os terapeutas para gerenciar
 * - Terapeuta: vê sua própria agenda
 */
const TherapistAvailabilityPage = () => {
  const { user } = useAuth();

  // Se for admin, mostra a interface de gerenciamento
  if (user.is_admin) {
    return <AdminAvailabilityManagementPage />;
  }

  // Se for terapeuta, mostra sua própria interface
  return (
    <div className="min-h-screen bg-gray-50 py-3 sm:py-6 pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Componente Principal */}
        <TherapistAvailabilityManager
          therapistId={user.id}
          isAdmin={false}
        />
      </div>
    </div>
  );
};

export default TherapistAvailabilityPage;
