// frontend/src/pages/AvailabilitySettingsPage.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCog,
  faStethoscope,
  faDoorOpen,
  faCalendarTimes,
  faUserFriends,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import TherapistSpecialtiesManager from '../components/admin/TherapistSpecialtiesManager';
import RoomsManager from '../components/admin/RoomsManager';
import TherapistAbsencesManager from '../components/admin/TherapistAbsencesManager';
import PatientPreferencesManager from '../components/admin/PatientPreferencesManager';
import { useAuth } from '../context/AuthContext';

/**
 * Página de Configurações de Disponibilidade
 * Agrupa todos os componentes de gestão do sistema de agendamento inteligente
 */
const AvailabilitySettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('specialties');

  // Verificar se é admin
  if (!user || !user.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
            <p className="text-gray-600">
              Você não tem permissão para acessar esta página.
              Esta funcionalidade está disponível apenas para administradores.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'specialties',
      label: 'Especialidades',
      icon: faStethoscope,
      component: TherapistSpecialtiesManager
    },
    {
      id: 'rooms',
      label: 'Salas',
      icon: faDoorOpen,
      component: RoomsManager
    },
    {
      id: 'absences',
      label: 'Ausências',
      icon: faCalendarTimes,
      component: TherapistAbsencesManager
    },
    {
      id: 'preferences',
      label: 'Preferências',
      icon: faUserFriends,
      component: PatientPreferencesManager
    }
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);
  const ActiveComponent = activeTabData?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/scheduling')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Voltar para Agendamento"
              >
                <FontAwesomeIcon icon={faArrowLeft} size="lg" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <FontAwesomeIcon icon={faCog} className="mr-3 text-blue-600" />
                  Configurações de Disponibilidade
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Gerencie especialidades, salas, ausências e preferências
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
};

export default AvailabilitySettingsPage;
