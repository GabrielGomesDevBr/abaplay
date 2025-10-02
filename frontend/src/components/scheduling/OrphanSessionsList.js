// frontend/src/components/scheduling/OrphanSessionsList.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFilter,
  faCalendarPlus,
  faUser,
  faStethoscope,
  faCalendarAlt,
  faClock,
  faExclamationTriangle,
  faChevronDown,
  faChevronUp,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { getOrphanSessions } from '../../api/schedulingApi';
import { useAuth } from '../../context/AuthContext';
import BatchRetroactiveModal from './BatchRetroactiveModal';

/**
 * Componente para listar e gerenciar sessões órfãs
 * (sessões realizadas sem agendamento prévio)
 */
const OrphanSessionsList = ({
  onCreateRetroactive,
  refreshTrigger = 0
}) => {
  const { token } = useAuth();

  const [orphanSessions, setOrphanSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // NOVO: Estados para seleção múltipla
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    patientName: '',
    therapistName: ''
  });

  // Carregar sessões órfãs
  useEffect(() => {
    loadOrphanSessions();
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOrphanSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const filtersToSend = {};
      if (filters.startDate) filtersToSend.start_date = filters.startDate;
      if (filters.endDate) filtersToSend.end_date = filters.endDate;
      filtersToSend.limit = 100; // Limite maior para órfãs

      const response = await getOrphanSessions(filtersToSend);
      setOrphanSessions(response.orphan_sessions || []);
    } catch (error) {
      console.error('Erro ao carregar sessões órfãs:', error);
      setError('Erro ao carregar sessões órfãs. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const applyFilters = () => {
    loadOrphanSessions();
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      patientName: '',
      therapistName: ''
    });
    // Recarregar sem filtros
    setTimeout(loadOrphanSessions, 100);
  };

  // NOVO: Handlers de seleção múltipla
  const getSessionKey = (session) => {
    return `${session.patient_id}-${session.therapist_id}-${session.session_date}`;
  };

  const handleSelectSession = (session) => {
    const sessionKey = getSessionKey(session);
    setSelectedSessions(prev => {
      const exists = prev.some(s => getSessionKey(s) === sessionKey);
      if (exists) {
        return prev.filter(s => getSessionKey(s) !== sessionKey);
      } else {
        return [...prev, session];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedSessions.length === filteredSessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions([...filteredSessions]);
    }
  };

  const handleBatchCreate = () => {
    if (selectedSessions.length === 0) {
      alert('Selecione pelo menos uma sessão órfã');
      return;
    }
    setShowBatchModal(true);
  };

  const handleBatchSuccess = () => {
    setShowBatchModal(false);
    setSelectedSessions([]);
    loadOrphanSessions();
  };

  // Filtrar sessões localmente por nome
  const filteredSessions = orphanSessions.filter(session => {
    const matchesPatient = !filters.patientName ||
      session.patient_name.toLowerCase().includes(filters.patientName.toLowerCase());
    const matchesTherapist = !filters.therapistName ||
      session.therapist_name.toLowerCase().includes(filters.therapistName.toLowerCase());

    return matchesPatient && matchesTherapist;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.slice(0, 5);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin h-8 w-8 text-blue-600 mr-3" />
          <span className="text-gray-600">Carregando sessões órfãs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faExclamationTriangle} className="h-8 w-8 text-red-500 mr-3" />
          <div className="text-center">
            <p className="text-red-600 font-medium">Erro ao carregar dados</p>
            <p className="text-gray-500 text-sm">{error}</p>
            <button
              onClick={loadOrphanSessions}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3 text-orange-500" />
              Sessões Órfãs
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredSessions.length} encontradas
              {selectedSessions.length > 0 && ` • ${selectedSessions.length} selecionadas`}
            </p>
          </div>

          {/* NOVO: Botões de ação */}
          <div className="flex space-x-3">
            {filteredSessions.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                {selectedSessions.length === filteredSessions.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
              </button>
            )}

            {selectedSessions.length > 0 && (
              <button
                onClick={handleBatchCreate}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
                Criar {selectedSessions.length} Agendamento(s)
              </button>
            )}

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <FontAwesomeIcon icon={faFilter} className="mr-2" />
              Filtros
              <FontAwesomeIcon
                icon={showFilters ? faChevronUp : faChevronDown}
                className="ml-2 w-3 h-3"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data inicial
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data final
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FontAwesomeIcon icon={faUser} className="mr-1" />
                Paciente
              </label>
              <input
                type="text"
                value={filters.patientName}
                onChange={(e) => handleFilterChange('patientName', e.target.value)}
                placeholder="Nome do paciente..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FontAwesomeIcon icon={faStethoscope} className="mr-1" />
                Terapeuta
              </label>
              <input
                type="text"
                value={filters.therapistName}
                onChange={(e) => handleFilterChange('therapistName', e.target.value)}
                placeholder="Nome do terapeuta..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Limpar
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faSearch} className="mr-2" />
              Aplicar
            </button>
          </div>
        </div>
      )}

      {/* Lista de sessões órfãs */}
      <div className="overflow-x-auto">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faCalendarAlt} className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma sessão órfã encontrada
            </h3>
            <p className="text-gray-500">
              {orphanSessions.length === 0
                ? 'Não há sessões realizadas sem agendamento prévio no período selecionado.'
                : 'Nenhuma sessão corresponde aos filtros aplicados.'
              }
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* NOVA: Coluna de checkbox */}
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedSessions.length === filteredSessions.length && filteredSessions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                  Data/Hora da Sessão
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  Paciente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <FontAwesomeIcon icon={faStethoscope} className="mr-2" />
                  Terapeuta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Programa
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSessions.map((session) => (
                <tr key={`${session.patient_id}-${session.therapist_id}-${session.session_date}`} className="hover:bg-gray-50">
                  {/* NOVA: Checkbox da linha */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedSessions.some(s => getSessionKey(s) === getSessionKey(session))}
                      onChange={() => handleSelectSession(session)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(session.session_date)}
                        </div>
                        <div className="text-sm text-gray-500">
                          <FontAwesomeIcon icon={faClock} className="mr-1" />
                          Horário aproximado da sessão
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {session.patient_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {session.therapist_name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {session.program_names ? (
                        <div>
                          <div className="font-medium">{session.programs_count} programa(s) trabalhados</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {session.program_names.length > 100
                              ? session.program_names.substring(0, 100) + '...'
                              : session.program_names
                            }
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Programas não identificados</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => onCreateRetroactive(session)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                    >
                      <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
                      Criar Agendamento
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Rodapé informativo */}
      {filteredSessions.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-blue-50">
          <div className="flex items-center text-sm text-blue-700">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-blue-500" />
            <span>
              <strong>Sessões órfãs</strong> são sessões que foram realizadas mas não tinham agendamento prévio.
              Criar agendamentos retroativos ajuda a manter o histórico completo das sessões.
            </span>
          </div>
        </div>
      )}

      {/* NOVO: Modal de criação em lote */}
      {showBatchModal && (
        <BatchRetroactiveModal
          isOpen={showBatchModal}
          onClose={() => {
            setShowBatchModal(false);
            setSelectedSessions([]);
          }}
          selectedSessions={selectedSessions.map(s => ({
            ...s,
            session_id: s.session_id || `${s.patient_id}-${s.therapist_id}-${s.session_date}`
          }))}
          onSuccess={handleBatchSuccess}
        />
      )}
    </div>
  );
};

export default OrphanSessionsList;