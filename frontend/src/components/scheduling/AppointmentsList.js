// frontend/src/components/scheduling/AppointmentsList.js

import React, { useState, useEffect } from 'react';
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
  faChevronUp,
  faSync,
  faEllipsisV,
  faStickyNote
} from '@fortawesome/free-solid-svg-icons';
import { formatDate, formatTime, getStatusBadgeClass, getStatusText } from '../../api/schedulingApi';
import { translateStatus } from '../../utils/statusTranslator';
import AppointmentActions from './AppointmentActions';
import { X } from 'lucide-react';

/**
 * Hook para detectar se estamos em modo tablet/mobile
 */
const useIsTablet = () => {
  const [isTablet, setIsTablet] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsTablet(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isTablet;
};

/**
 * Modal para visualizar anotações completas
 */
const NotesModal = ({ isOpen, onClose, appointment }) => {
  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Anotações da Sessão</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">Detalhes da Sessão</h3>
            <div className="space-y-1 text-xs text-blue-800">
              <p><strong>Paciente:</strong> {appointment.patient_name}</p>
              <p><strong>Data:</strong> {formatDate(appointment.scheduled_date)}</p>
              <p><strong>Horário:</strong> {formatTime(appointment.scheduled_time)}</p>
              <p><strong>Terapeuta:</strong> {appointment.therapist_name}</p>
              {appointment.discipline_name && (
                <p><strong>Disciplina:</strong> {appointment.discipline_name}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Anotações</label>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">
              {appointment.notes || 'Nenhuma anotação registrada para esta sessão.'}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente para exibir lista de agendamentos
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 * ✅ FASE 3: Coluna de recorrência adicionada
 * ✅ MELHORIAS: Visualização de anotações responsiva (coluna desktop + ícone mobile)
 */
const AppointmentsList = ({
  appointments = [],
  onEdit,
  onDelete,
  onView,
  onEditSeries,
  onDeleteSeries,
  onJustify,
  onViewNextOccurrences,
  onCancel, // ✅ NOVO: Handler de cancelamento
  isLoading = false,
  pagination = null,
  onPageChange = null,
  showFilters = true
}) => {
  const isTablet = useIsTablet();
  const [notesModal, setNotesModal] = useState({ isOpen: false, appointment: null });

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: '',
    therapistId: '',
    recurringOnly: false // ✅ FASE 3: Filtro para mostrar apenas recorrentes
  });

  const [sortBy, setSortBy] = useState('scheduled_date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Lista de terapeutas únicos dos agendamentos
  const uniqueTherapists = [...new Set(appointments.map(apt => apt.therapist_name))].sort();

  // Função para abrir modal de anotações
  const openNotesModal = (appointment) => {
    setNotesModal({ isOpen: true, appointment });
  };

  const closeNotesModal = () => {
    setNotesModal({ isOpen: false, appointment: null });
  };

  // ✅ FASE 3: Helper para texto de recorrência
  const getRecurrenceText = (appointment) => {
    if (!appointment.recurring_template_id) {
      return null;
    }

    const recurrenceTypeMap = {
      'weekly': 'Semanal',
      'biweekly': 'Quinzenal',
      'monthly': 'Mensal'
    };

    return recurrenceTypeMap[appointment.recurrence_type] || 'Recorrente';
  };

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
      (appointment.discipline_name && appointment.discipline_name.toLowerCase().includes(filters.search.toLowerCase())) ||
      appointment.therapist_name.toLowerCase().includes(filters.search.toLowerCase());

    const matchesStatus = !filters.status || appointment.status === filters.status;

    const matchesDateRange = (!filters.startDate || appointment.scheduled_date >= filters.startDate) &&
                           (!filters.endDate || appointment.scheduled_date <= filters.endDate);

    const matchesTherapist = !filters.therapistId || appointment.therapist_name === filters.therapistId;

    // ✅ FASE 3: Filtro de recorrentes
    const matchesRecurring = !filters.recurringOnly || !!appointment.recurring_template_id;

    return matchesSearch && matchesStatus && matchesDateRange && matchesTherapist && matchesRecurring;
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
      therapistId: '',
      recurringOnly: false
    });
  };

  // Contar filtros ativos
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.therapistId) count++;
    if (filters.recurringOnly) count++;
    return count;
  };

  // Filtros rápidos (pills)
  const applyQuickFilter = (filterType) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (filterType) {
      case 'today':
        setFilters(prev => ({ ...prev, startDate: todayStr, endDate: todayStr }));
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Domingo
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Sábado
        setFilters(prev => ({
          ...prev,
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0]
        }));
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setFilters(prev => ({
          ...prev,
          startDate: monthStart.toISOString().split('T')[0],
          endDate: monthEnd.toISOString().split('T')[0]
        }));
        break;
      case 'pending':
        // Toggle: se já está em 'scheduled', remove; senão, aplica
        setFilters(prev => ({
          ...prev,
          status: prev.status === 'scheduled' ? '' : 'scheduled'
        }));
        break;
      case 'recurring':
        // Toggle: se já está ativo, desativa; senão, ativa
        setFilters(prev => ({ ...prev, recurringOnly: !prev.recurringOnly }));
        break;
      default:
        break;
    }
  };

  // Verificar se filtro rápido está ativo
  const isQuickFilterActive = (filterType) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (filterType) {
      case 'today':
        return filters.startDate === todayStr && filters.endDate === todayStr;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return filters.startDate === weekStart.toISOString().split('T')[0] &&
               filters.endDate === weekEnd.toISOString().split('T')[0];
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return filters.startDate === monthStart.toISOString().split('T')[0] &&
               filters.endDate === monthEnd.toISOString().split('T')[0];
      case 'pending':
        return filters.status === 'scheduled';
      case 'recurring':
        return filters.recurringOnly;
      default:
        return false;
    }
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

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filtros */}
      {showFilters && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faFilter} className="mr-2 text-gray-400" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
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

          {/* Pills de Filtros Rápidos */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => applyQuickFilter('today')}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                isQuickFilterActive('today')
                  ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                  : 'text-gray-700 bg-gray-100 border border-gray-300 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300'
              }`}
            >
              📅 Hoje
            </button>
            <button
              onClick={() => applyQuickFilter('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                isQuickFilterActive('week')
                  ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                  : 'text-gray-700 bg-gray-100 border border-gray-300 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300'
              }`}
            >
              📆 Esta Semana
            </button>
            <button
              onClick={() => applyQuickFilter('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                isQuickFilterActive('month')
                  ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                  : 'text-gray-700 bg-gray-100 border border-gray-300 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300'
              }`}
            >
              🗓️ Este Mês
            </button>
            <button
              onClick={() => applyQuickFilter('pending')}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                isQuickFilterActive('pending')
                  ? 'bg-yellow-500 text-white border-yellow-600 shadow-sm'
                  : 'text-gray-700 bg-gray-100 border border-gray-300 hover:bg-yellow-100 hover:text-yellow-700 hover:border-yellow-300'
              }`}
            >
              ⏳ Pendentes
            </button>
            <button
              onClick={() => applyQuickFilter('recurring')}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                isQuickFilterActive('recurring')
                  ? 'bg-purple-500 text-white border-purple-600 shadow-sm'
                  : 'text-gray-700 bg-gray-100 border border-gray-300 hover:bg-purple-100 hover:text-purple-700 hover:border-purple-300'
              }`}
            >
              🔄 Recorrentes
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
                placeholder="Paciente, disciplina ou terapeuta..."
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
            <div className="pt-4 border-t border-gray-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* ✅ FASE 3: Filtro de recorrentes */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recurringOnly"
                  checked={filters.recurringOnly}
                  onChange={(e) => handleFilterChange('recurringOnly', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="recurringOnly" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer flex items-center">
                  <FontAwesomeIcon icon={faSync} className="mr-2 text-purple-600" />
                  Mostrar apenas agendamentos recorrentes
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contador de Resultados */}
      {appointments.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">
              📊 Mostrando{' '}
              <span className="text-blue-600 font-semibold">{sortedAppointments.length}</span>
              {sortedAppointments.length !== appointments.length && (
                <span className="text-gray-500"> de {appointments.length}</span>
              )}
              {' '}agendamento{sortedAppointments.length !== 1 ? 's' : ''}
            </span>
            {activeFiltersCount > 0 && (
              <span className="text-gray-500 text-xs">
                {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
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
                  Área de Intervenção
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
                {/* ✅ FASE 3: Nova coluna de Recorrência */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faSync} className="mr-2" />
                    Recorrência
                  </div>
                </th>
                {/* ✅ MELHORIA: Coluna de Anotações (apenas desktop) */}
                {!isTablet && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faStickyNote} className="mr-2" />
                      Anotações
                    </div>
                  </th>
                )}
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
                      {appointment.discipline_name || 'Sessão Geral'}
                    </div>
                    {appointment.active_programs_count > 0 && (
                      <div className="text-sm text-gray-500">
                        {appointment.active_programs_count} programa(s) ativo(s)
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {appointment.therapist_name}
                    </div>
                  </td>
                  {/* ✅ FASE 3: Célula de Recorrência */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRecurrenceText(appointment) ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        <FontAwesomeIcon icon={faSync} className="mr-1 w-3 h-3" />
                        {getRecurrenceText(appointment)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  {/* ✅ MELHORIA: Célula de Anotações (apenas desktop) */}
                  {!isTablet && (
                    <td className="px-6 py-4 max-w-xs">
                      {appointment.notes ? (
                        <div
                          className="text-sm text-gray-600 truncate cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => openNotesModal(appointment)}
                          title="Clique para ver anotação completa"
                        >
                          {appointment.notes.substring(0, 50)}
                          {appointment.notes.length > 50 && '...'}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                      {translateStatus(appointment.status, appointment.justified_at)}
                    </span>
                  </td>
                  {/* ✅ FASE 3: Menu contextual de ações */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {/* ✅ MELHORIA: Ícone de anotações no mobile */}
                    {isTablet && appointment.notes && (
                      <button
                        onClick={() => openNotesModal(appointment)}
                        className="mr-2 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Ver anotações"
                      >
                        <FontAwesomeIcon icon={faStickyNote} className="w-4 h-4" />
                      </button>
                    )}
                    <AppointmentActions
                      appointment={appointment}
                      onEdit={onEdit}
                      onEditSeries={onEditSeries}
                      onDelete={onDelete}
                      onDeleteSeries={onDeleteSeries}
                      onViewDetails={onView}
                      onJustify={onJustify}
                      onViewNextOccurrences={onViewNextOccurrences}
                      onCancel={onCancel}  // ✅ NOVO: Passar handler de cancelamento
                    />
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

      {/* ✅ MELHORIA: Modal para visualizar anotações completas */}
      <NotesModal
        isOpen={notesModal.isOpen}
        onClose={closeNotesModal}
        appointment={notesModal.appointment}
      />
    </div>
  );
};

export default AppointmentsList;