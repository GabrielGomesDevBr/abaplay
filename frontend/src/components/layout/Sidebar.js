import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePatients } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faSearch,
  faUserFriends,
  faInfoCircle,
  faUserCircle,
  faChevronDown,
  faChevronUp,
  faTachometerAlt,
  faCalendarCheck,
  faCalendarAlt,
  faFolderOpen,
  faPencilAlt,
  faUserShield,
  faAddressBook
} from '@fortawesome/free-solid-svg-icons';
import usePatientNotifications from '../../hooks/usePatientNotifications';
import PatientNotificationBadge from '../notifications/PatientNotificationBadge';

const Sidebar = ({ isToolsExpanded, setIsToolsExpanded }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { patients, selectedPatient, selectPatient, isLoading } = usePatients();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Se não receber props de controle, usa estado local
  const [localToolsExpanded, setLocalToolsExpanded] = useState(false);
  const toolsExpanded = isToolsExpanded !== undefined ? isToolsExpanded : localToolsExpanded;
  const setToolsExpanded = setIsToolsExpanded || setLocalToolsExpanded;
  
  // Hook para notificações dos pacientes
  const patientIds = useMemo(() => (patients || []).map(p => p.id), [patients]);
  
  const { 
    patientNotifications, 
    sortPatientsByPriority, 
    markAsRead
  } = usePatientNotifications(patientIds);

  const handleSelectPatient = (patient) => {
    selectPatient(patient);
  };

  const handleNavigateToChat = (patientId, chatType) => {
    // Encontrar o paciente e selecioná-lo
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      selectPatient(patient);
      // Marcar como lida as notificações deste tipo
      markAsRead(patientId, chatType);

      // Navegar para a página apropriada
      if (chatType === 'parent_chat') {
        if (user?.role === 'parent') {
          navigate('/parent-dashboard');
        } else {
          navigate('/notes');
        }
      } else if (chatType === 'case_discussion') {
        navigate('/notes');
      } else if (chatType === 'scheduling_reminder' || chatType === 'appointment_cancelled') {
        // ✅ NOVO: Notificações de agendamento levam para página de agendamentos
        if (user?.is_admin) {
          navigate('/scheduling'); // Admin vai para sistema de agendamento
        } else {
          navigate('/therapist-schedule'); // Terapeuta vai para sua agenda pessoal
        }
      }
    }
  };

  const filteredPatients = useMemo(() => {
    // --- CORREÇÃO ---
    // Garante que 'patients' seja tratado como um array vazio se for undefined.
    const patientList = patients || [];
    let filtered = patientList;
    
    // Aplicar filtro de busca
    if (searchTerm) {
      filtered = patientList.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Ordenar por prioridade de notificações
    return sortPatientsByPriority(filtered);
  }, [patients, searchTerm, sortPatientsByPriority]);

  // Super admin não deve usar o Sidebar
  if (user?.role === 'super_admin') {
    return null;
  }

  if (isLoading) {
    return (
        <div className="h-full bg-gradient-to-b from-indigo-50 to-purple-50 border-r border-indigo-200 flex justify-center items-center">
            <div className="text-center">
                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin text-indigo-600 text-2xl" />
                </div>
                <p className="text-indigo-600 text-sm font-medium">Carregando clientes...</p>
            </div>
        </div>
    );
  }

  // Ferramentas de navegação
  const toolsMenuItems = [
    {
      icon: faTachometerAlt,
      label: 'Dashboard',
      path: '/dashboard',
      show: true,
    },
    {
      icon: user?.is_admin ? faCalendarAlt : faCalendarCheck,
      label: user?.is_admin ? 'Agendamentos' : 'Minha Agenda',
      path: user?.is_admin ? '/scheduling' : '/my-schedule',
      show: true,
    },
    {
      icon: faFolderOpen,
      label: 'Programas',
      path: '/programs',
      show: true,
    },
    {
      icon: faPencilAlt,
      label: 'Anotações',
      path: '/notes',
      show: true,
    },
    {
      icon: faAddressBook,
      label: 'Colegas',
      path: '/colleagues',
      show: !user?.is_admin, // Só para terapeutas
    },
    {
      icon: faUserShield,
      label: 'Admin',
      path: '/admin',
      show: user?.is_admin,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-indigo-50/30 border-r border-indigo-200 shadow-sm">
      {/* Cabeçalho redesenhado */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6">
        <div className="flex items-center mb-4">
          <div className="bg-white bg-opacity-20 p-2 rounded-full mr-3">
            <FontAwesomeIcon icon={faUserFriends} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Clientes</h2>
        </div>
        
        {/* Contador de clientes estilizado */}
        <div className="bg-white bg-opacity-20 rounded-lg p-3 mb-4">
          <div className="text-white text-sm">
            {user?.is_admin && (
              <div className="flex items-center justify-between">
                <span>Total de clientes:</span>
                <span className="font-bold">{patients?.length || 0} / {user?.max_patients || 0}</span>
              </div>
            )}
            {user?.role === 'terapeuta' && (
              <div className="flex items-center justify-between">
                <span>Clientes atribuídos:</span>
                <span className="font-bold">{patients?.length || 0}</span>
              </div>
            )}
          </div>
        </div>

        {/* Busca redesenhada */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <FontAwesomeIcon icon={faSearch} className="text-indigo-300" />
          </div>
          <input 
            type="text"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white bg-opacity-90 border-2 border-white border-opacity-30 rounded-lg placeholder-indigo-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 focus:border-white focus:border-opacity-50 text-sm transition-all"
          />
        </div>
      </div>

      {/* Lista de clientes redesenhada */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredPatients && filteredPatients.length > 0 ? (
          <div className="space-y-2">
            {filteredPatients.map((patient, index) => {
              const isSelected = selectedPatient?.id === patient.id;
              return (
                <div key={patient.id} className="relative">
                  <button
                    onClick={() => handleSelectPatient(patient)}
                    className={`
                      w-full text-left p-4 rounded-lg flex items-center transition-all duration-200 transform
                      ${isSelected
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105 border-2 border-white'
                        : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 hover:shadow-md hover:scale-102 border-2 border-gray-200 hover:border-indigo-300'
                      }
                    `}
                  >
                    <div className={`
                      p-2 rounded-full mr-3 flex-shrink-0 relative
                      ${isSelected 
                        ? 'bg-white bg-opacity-20' 
                        : 'bg-gradient-to-r from-indigo-100 to-purple-100'
                      }
                    `}>
                      <FontAwesomeIcon 
                        icon={faUserCircle} 
                        className={`
                          ${isSelected ? 'text-white' : 'text-indigo-600'}
                        `} 
                      />
                      {/* Badge de notificações */}
                      <PatientNotificationBadge
                        patientId={patient.id}
                        patientName={patient.name}
                        notifications={patientNotifications[patient.id]}
                        onNavigateToChat={handleNavigateToChat}
                        className="z-10"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`
                        font-medium truncate
                        ${isSelected ? 'text-white' : 'text-gray-800'}
                      `}>
                        {patient.name}
                      </p>
                      {isSelected && (
                        <p className="text-indigo-100 text-xs mt-1">
                          ✅ Cliente selecionado
                        </p>
                      )}
                      {/* Mostrar indicador de notificações no nome */}
                      {patientNotifications[patient.id]?.total > 0 && !isSelected && (
                        <p className="text-blue-600 text-xs mt-1 font-medium">
                          🔔 {patientNotifications[patient.id].total} nova{patientNotifications[patient.id].total !== 1 ? 's' : ''} mensagem{patientNotifications[patient.id].total !== 1 ? 'ns' : ''}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Estado vazio redesenhado */
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FontAwesomeIcon icon={searchTerm ? faSearch : faUserFriends} className="text-2xl text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-2">
              {searchTerm ? 'Nenhum resultado' : 'Nenhum cliente'}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              {searchTerm 
                ? 'Tente ajustar os termos da busca' 
                : 'Nenhum cliente foi atribuído ainda'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all transform hover:scale-105"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Rodapé informativo */}
      {filteredPatients && filteredPatients.length > 0 && (
        <div className="border-t border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-indigo-600">
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon icon={faInfoCircle} className="text-indigo-500" />
              <span>Total: {filteredPatients.length} cliente{filteredPatients.length !== 1 ? 's' : ''}</span>
            </div>
            {searchTerm && (
              <span className="text-indigo-500">Filtrado por: "{searchTerm}"</span>
            )}
          </div>
        </div>
      )}

      {/* Seção de Ferramentas (colapsável em mobile) */}
      <div className="border-t border-indigo-200 bg-white lg:hidden">
        {/* Cabeçalho colapsável */}
        <button
          onClick={() => setToolsExpanded(!toolsExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 transition-all"
        >
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faFolderOpen} className="text-purple-600" />
            <span className="font-semibold text-gray-700">Ferramentas</span>
          </div>
          <FontAwesomeIcon
            icon={toolsExpanded ? faChevronUp : faChevronDown}
            className="text-purple-600 transition-transform"
          />
        </button>

        {/* Lista de ferramentas */}
        {toolsExpanded && (
          <div className="px-2 py-2 space-y-1 bg-gradient-to-b from-white to-indigo-50/30">
            {toolsMenuItems.filter(item => item.show).map((item, index) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <button
                  key={index}
                  onClick={() => {
                    navigate(item.path);
                    setToolsExpanded(false); // Fecha o menu após navegar
                  }}
                  className={`
                    w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700'
                    }
                  `}
                >
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={`${isActive ? 'text-white' : 'text-indigo-600'}`}
                  />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
