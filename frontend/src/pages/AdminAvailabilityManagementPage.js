// frontend/src/pages/AdminAvailabilityManagementPage.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLock,
  faLockOpen,
  faUserTie,
  faUserClock,
  faUserCheck,
  faFilter,
  faCog,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { getTherapistsOverview } from '../api/availabilityAdminApi';
import TherapistConfigModal from '../components/availability/TherapistConfigModal';
import TherapistScheduleModal from '../components/availability/TherapistScheduleModal';

const AdminAvailabilityManagementPage = () => {
  const [therapists, setTherapists] = useState([]);
  const [filteredTherapists, setFilteredTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
    contractType: 'all',
    permissionStatus: 'all',
    searchTerm: ''
  });

  // Carregar dados dos terapeutas
  const loadTherapists = async () => {
    try {
      setLoading(true);
      const response = await getTherapistsOverview();
      setTherapists(response.therapists || []);
      setFilteredTherapists(response.therapists || []);
    } catch (error) {
      console.error('Erro ao carregar terapeutas:', error);
      toast.error('Erro ao carregar dados dos terapeutas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTherapists();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let result = [...therapists];

    // Filtro por tipo de contrato
    if (filters.contractType !== 'all') {
      result = result.filter(t => t.contract_type === filters.contractType);
    }

    // Filtro por status de permissão
    if (filters.permissionStatus === 'locked') {
      result = result.filter(t => !t.can_edit_own_schedule);
    } else if (filters.permissionStatus === 'unlocked') {
      result = result.filter(t => t.can_edit_own_schedule);
    }

    // Filtro por termo de busca
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(t =>
        t.full_name.toLowerCase().includes(term) ||
        (t.username && t.username.toLowerCase().includes(term))
      );
    }

    setFilteredTherapists(result);
  }, [filters, therapists]);

  const handleOpenConfig = (therapist) => {
    setSelectedTherapist(therapist);
    setShowConfigModal(true);
  };

  const handleCloseConfig = () => {
    setSelectedTherapist(null);
    setShowConfigModal(false);
  };

  const handleConfigSaved = () => {
    loadTherapists();
    handleCloseConfig();
    toast.success('Configurações atualizadas com sucesso!');
  };

  const handleOpenSchedule = (therapist) => {
    setSelectedTherapist(therapist);
    setShowScheduleModal(true);
  };

  const handleCloseSchedule = () => {
    setSelectedTherapist(null);
    setShowScheduleModal(false);
  };

  // Helpers para renderização
  const getContractTypeLabel = (type) => {
    const labels = {
      freelancer: 'Freelancer',
      part_time: 'Meio Período',
      full_time: 'Tempo Integral'
    };
    return labels[type] || type;
  };

  const getContractTypeBadgeClass = (type) => {
    const classes = {
      freelancer: 'bg-blue-100 text-blue-800',
      part_time: 'bg-yellow-100 text-yellow-800',
      full_time: 'bg-green-100 text-green-800'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  };

  const getContractTypeIcon = (type) => {
    const icons = {
      freelancer: faUserClock,
      part_time: faUserTie,
      full_time: faUserCheck
    };
    return icons[type] || faUserClock;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando terapeutas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-3 sm:py-6 pb-24 lg:pb-6">
      <div className="w-full px-3 sm:px-4 lg:px-6">

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FontAwesomeIcon icon={faFilter} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Busca por nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar terapeuta
            </label>
            <input
              type="text"
              placeholder="Nome ou usuário..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por tipo de contrato */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Contrato
            </label>
            <select
              value={filters.contractType}
              onChange={(e) => setFilters(prev => ({ ...prev, contractType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="freelancer">Freelancer</option>
              <option value="part_time">Meio Período</option>
              <option value="full_time">Tempo Integral</option>
            </select>
          </div>

          {/* Filtro por permissão */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status de Permissão
            </label>
            <select
              value={filters.permissionStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, permissionStatus: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="unlocked">Pode Editar</option>
              <option value="locked">Bloqueado</option>
            </select>
          </div>
        </div>

        {/* Resumo de filtros */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Mostrando <span className="font-semibold">{filteredTherapists.length}</span> de{' '}
            <span className="font-semibold">{therapists.length}</span> terapeutas
          </p>
        </div>
      </div>

      {/* Lista de terapeutas */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredTherapists.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Nenhum terapeuta encontrado com os filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Terapeuta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Contrato
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissão
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horas Semanais
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Horários
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialidades
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ausências
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTherapists.map((therapist) => (
                  <tr key={therapist.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {therapist.full_name}
                        </div>
                        <div className="text-sm text-gray-500">@{therapist.username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getContractTypeBadgeClass(
                          therapist.contract_type
                        )}`}
                      >
                        <FontAwesomeIcon
                          icon={getContractTypeIcon(therapist.contract_type)}
                          className="mr-2"
                        />
                        {getContractTypeLabel(therapist.contract_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {therapist.can_edit_own_schedule ? (
                        <span className="inline-flex items-center text-green-600">
                          <FontAwesomeIcon icon={faLockOpen} className="mr-2" />
                          <span className="text-sm">Pode editar</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-600">
                          <FontAwesomeIcon icon={faLock} className="mr-2" />
                          <span className="text-sm">Bloqueado</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {therapist.default_weekly_hours || '-'}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {therapist.total_schedules || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {therapist.total_specialties || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {therapist.active_absences > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {therapist.active_absences} ativa(s)
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenSchedule(therapist)}
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          title="Ver e editar horários"
                        >
                          <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                          Horários
                        </button>
                        <button
                          onClick={() => handleOpenConfig(therapist)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          title="Configurar permissões"
                        >
                          <FontAwesomeIcon icon={faCog} className="mr-2" />
                          Configurar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de configuração */}
      {showConfigModal && selectedTherapist && (
        <TherapistConfigModal
          therapist={selectedTherapist}
          onClose={handleCloseConfig}
          onSave={handleConfigSaved}
        />
      )}

      {/* Modal de horários */}
      {showScheduleModal && selectedTherapist && (
        <TherapistScheduleModal
          therapist={selectedTherapist}
          onClose={handleCloseSchedule}
        />
      )}
      </div>
    </div>
  );
};

export default AdminAvailabilityManagementPage;
