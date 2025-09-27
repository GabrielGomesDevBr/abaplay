// frontend/src/components/scheduling/AppointmentsList.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrash,
  faEye,
  faCalendarAlt,
  faClock,
  faUser,
  faStethoscope,
  faFilter,
  faSearch,
  faChevronDown,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import { formatDate, formatTime, getStatusBadgeClass, getStatusText } from '../../api/schedulingApi';

/**
 * Componente para exibir lista de agendamentos
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 */
const AppointmentsList = ({
  appointments = [],
  onEdit,
  onDelete,
  onView,
  isLoading = false,
  pagination = null,
  onPageChange = null,
  showFilters = true
}) => {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: '',
    therapistId: ''
  });

  const [sortBy, setSortBy] = useState('scheduled_date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Lista de terapeutas únicos dos agendamentos
  const uniqueTherapists = [...new Set(appointments.map(apt => apt.therapist_name))].sort();

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Filtrar agendamentos
  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = !filters.search ||
      appointment.patient_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      appointment.program_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      appointment.therapist_name.toLowerCase().includes(filters.search.toLowerCase());

    const matchesStatus = !filters.status || appointment.status === filters.status;

    const matchesDateRange = (!filters.startDate || appointment.scheduled_date >= filters.startDate) &&
                           (!filters.endDate || appointment.scheduled_date <= filters.endDate);

    const matchesTherapist = !filters.therapistId || appointment.therapist_name === filters.therapistId;

    return matchesSearch && matchesStatus && matchesDateRange && matchesTherapist;
  });

  // Ordenar agendamentos
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Tratamento especial para data e hora
    if (sortBy === 'scheduled_date') {
      aValue = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
      bValue = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getSortIcon = (column) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? faChevronUp : faChevronDown;
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      startDate: '',
      endDate: '',
      therapistId: ''
    });
  };

  const getAppointmentRowClass = (appointment) => {
    const now = new Date();
    const appointmentDateTime = new Date(`${appointment.scheduled_date}T${appointment.scheduled_time}`);

    let baseClass = "hover:bg-gray-50 transition-colors";

    if (appointment.status === 'scheduled' && appointmentDateTime < now) {
      baseClass += " bg-red-50 border-l-4 border-red-400";
    } else if (appointment.status === 'completed') {
      baseClass += " bg-green-50";
    } else if (appointment.status === 'cancelled') {
      baseClass += " bg-gray-100 opacity-75";
    }

    return baseClass;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Carregando agendamentos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filtros */}
      {showFilters && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faFilter} className="mr-2 text-gray-400" />
              Filtros
            </h3>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              {showAdvancedFilters ? 'Ocultar filtros' : 'Mais filtros'}
              <FontAwesomeIcon
                icon={showAdvancedFilters ? faChevronUp : faChevronDown}
                className="ml-1 w-3 h-3"
              />
            </button>
          </div>

          {/* Filtro principal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FontAwesomeIcon icon={faSearch} className="mr-1 text-gray-400" />
                Buscar
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Paciente, programa ou terapeuta..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os status</option>
                <option value="scheduled">Agendado</option>
                <option value="completed">Realizado</option>
                <option value="missed">Não realizado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Limpar filtros
              </button>
            </div>
          </div>

          {/* Filtros avançados */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data inicial</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data final</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terapeuta</label>
                <select
                  value={filters.therapistId}
                  onChange={(e) => handleFilterChange('therapistId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos os terapeutas</option>
                  {uniqueTherapists.map(therapist => (
                    <option key={therapist} value={therapist}>{therapist}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista de agendamentos */}
      <div className="overflow-x-auto">
        {sortedAppointments.length === 0 ? (
          <div className="p-8 text-center">
            <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-300 text-4xl mb-4" />
            <p className="text-gray-500">
              {appointments.length === 0
                ? 'Nenhum agendamento encontrado'
                : 'Nenhum agendamento corresponde aos filtros selecionados'
              }
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('scheduled_date')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                    Data/Hora
                    {getSortIcon('scheduled_date') && (
                      <FontAwesomeIcon icon={getSortIcon('scheduled_date')} className="ml-1 w-3 h-3" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('patient_name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faUser} className="mr-2" />
                    Paciente
                    {getSortIcon('patient_name') && (
                      <FontAwesomeIcon icon={getSortIcon('patient_name')} className="ml-1 w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <FontAwesomeIcon icon={faStethoscope} className="mr-2" />
                  Programa
                </th>
                <th
                  onClick={() => handleSort('therapist_name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    Terapeuta
                    {getSortIcon('therapist_name') && (
                      <FontAwesomeIcon icon={getSortIcon('therapist_name')} className="ml-1 w-3 h-3" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon('status') && (
                      <FontAwesomeIcon icon={getSortIcon('status')} className="ml-1 w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAppointments.map((appointment) => (
                <tr key={appointment.id} className={getAppointmentRowClass(appointment)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(appointment.scheduled_date)}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <FontAwesomeIcon icon={faClock} className="mr-1 w-3 h-3" />
                        {formatTime(appointment.scheduled_time)}
                        <span className="ml-1">({appointment.duration_minutes}min)</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {appointment.patient_name}
                    </div>
                    {appointment.patient_age && (
                      <div className="text-sm text-gray-500">
                        {appointment.patient_age} anos
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {appointment.program_name}
                    </div>
                    {appointment.discipline_name && (
                      <div className="text-sm text-gray-500">
                        {appointment.discipline_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {appointment.therapist_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                    {appointment.missed_reason && (
                      <div className="text-xs text-gray-500 mt-1">
                        Justificado
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => onView(appointment)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="Visualizar agendamento"
                    >
                      <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                    </button>
                    {appointment.status === 'scheduled' && onEdit && (
                      <button
                        onClick={() => onEdit(appointment)}
                        className="text-yellow-600 hover:text-yellow-900 transition-colors"
                        title="Editar agendamento"
                      >
                        <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                      </button>
                    )}
                    {(appointment.status === 'scheduled' || appointment.status === 'cancelled') && onDelete && (
                      <button
                        onClick={() => onDelete(appointment)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Remover agendamento"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {pagination.startItem} a {pagination.endItem} de {pagination.totalItems} agendamentos
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 text-sm border rounded-md ${
                  page === pagination.currentPage
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsList;