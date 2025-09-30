// frontend/src/pages/SchedulingPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarPlus,
  faCalendarAlt,
  faChartBar,
  faRefresh,
  faExclamationTriangle,
  faFilePdf,
  faBrain
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import AppointmentForm from '../components/scheduling/AppointmentForm';
import AppointmentsList from '../components/scheduling/AppointmentsList';
import AppointmentDetailsModal from '../components/scheduling/AppointmentDetailsModal';
import ReportConfigModal from '../components/scheduling/ReportConfigModal';
import OrphanSessionsList from '../components/scheduling/OrphanSessionsList';
import IntelligentDetectionModal from '../components/scheduling/IntelligentDetectionModal';
import RetroactiveAppointmentModal from '../components/scheduling/RetroactiveAppointmentModal';
import RecurringTemplatesList from '../components/scheduling/RecurringTemplatesList';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getClinicStatistics,
  markMissedAppointments
} from '../api/schedulingApi';
import { fetchAllAssignments } from '../api/adminApi';
import { generateAppointmentReport } from '../components/scheduling/AppointmentReportGenerator';

/**
 * Página principal de agendamento para administradores
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 */
const SchedulingPage = () => {
  const { user, token } = useAuth();

  // Estados principais
  const [appointments, setAppointments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados dos modais
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showIntelligentDetection, setShowIntelligentDetection] = useState(false);
  const [showRetroactiveModal, setShowRetroactiveModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedOrphanSession, setSelectedOrphanSession] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Estado para abas
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'orphans' | 'recurring'
  const [orphanRefreshTrigger, setOrphanRefreshTrigger] = useState(0);

  // Estados de filtros e paginação
  const [filters, setFilters] = useState({
    therapist_id: '',
    patient_id: '',
    status: '',
    start_date: '',
    end_date: '',
    page: 1,
    limit: 20
  });

  const [pagination, setPagination] = useState(null);

  // Função para lidar com criação de agendamento retroativo
  const handleCreateRetroactive = (orphanSession) => {
    setSelectedOrphanSession(orphanSession);
    setShowRetroactiveModal(true);
  };

  // Função para lidar com conclusão da detecção inteligente
  const handleDetectionComplete = (results) => {
    loadAppointments();
    setOrphanRefreshTrigger(prev => prev + 1);
  };

  // Função para lidar com sucesso de agendamento retroativo
  const handleRetroactiveSuccess = () => {
    loadAppointments();
    setOrphanRefreshTrigger(prev => prev + 1);
  };

  // Função para criar novo template recorrente
  const handleCreateRecurringTemplate = () => {
    setShowAppointmentForm(true);
    setEditingAppointment(null);
  };

  // Função para ver agendamentos de um template
  const handleViewTemplateAppointments = (template) => {
    // Implementar modal ou navegação para ver agendamentos do template
    // Por agora, só mostrar alerta
    alert(`Visualizar agendamentos do template:\n\n${template.patient_name} - ${template.therapist_name}\nTemplate ID: ${template.id}`);
  };

  const refreshAssignments = useCallback(async () => {
    try {
      if (!token) return;
      const assignmentsData = await fetchAllAssignments(token);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Erro ao carregar assignments');
    }
  }, [token]);

  const loadAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getAppointments(filters);
      setAppointments(response.appointments || []);
      setPagination(response.pagination || null);
    } catch (error) {
      console.error('Erro ao carregar agendamentos');
      setError('Erro ao carregar agendamentos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadStatistics = useCallback(async () => {
    try {
      const startDate = filters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = filters.end_date || new Date().toISOString().split('T')[0];

      const stats = await getClinicStatistics(startDate, endDate);
      setStatistics(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas');
    }
  }, [filters]);

  // Carregar dados iniciais
  useEffect(() => {
    loadAppointments();
    loadStatistics();
    refreshAssignments();
  }, [loadAppointments, loadStatistics, refreshAssignments]);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleCreateAppointment = async (appointmentData) => {
    try {
      setIsSubmitting(true);

      // Verificar se é agendamento recorrente ou único
      if (appointmentData.type === 'recurring') {
        // Agendamento recorrente - mostrar resultado
        const { template, generated_appointments, conflicts } = appointmentData;

        setShowAppointmentForm(false);
        setEditingAppointment(null);

        // Mostrar resultado
        alert(`Template recorrente criado com sucesso!\n\n${generated_appointments} agendamentos gerados\n${conflicts} conflitos encontrados\n\nTemplate ID: ${template.id}`);

        // Atualizar listas
        await loadAppointments();
        await loadStatistics();
      } else {
        // Agendamento único
        const newAppointment = await createAppointment(appointmentData);

        // Atualizar lista
        await loadAppointments();
        await loadStatistics();

        setShowAppointmentForm(false);
        setEditingAppointment(null);

        // Mostrar detalhes do novo agendamento
        setSelectedAppointment(newAppointment.appointment);
        setShowAppointmentDetails(true);
      }
    } catch (error) {
      console.error('Erro ao criar agendamento');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAppointment = async (appointmentData) => {
    try {
      setIsSubmitting(true);
      const updatedAppointment = await updateAppointment(editingAppointment.id, appointmentData);

      // Atualizar lista
      await loadAppointments();
      await loadStatistics();

      setShowAppointmentForm(false);
      setEditingAppointment(null);

      // Mostrar detalhes do agendamento atualizado
      setSelectedAppointment(updatedAppointment.appointment);
      setShowAppointmentDetails(true);
    } catch (error) {
      console.error('Erro ao atualizar agendamento');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAppointment = (appointment) => {
    setEditingAppointment(appointment);
    setShowAppointmentForm(true);
    setShowAppointmentDetails(false);
  };

  const handleDeleteAppointment = async (appointment) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja remover o agendamento de ${appointment.patient_name} para ${appointment.scheduled_date} às ${appointment.scheduled_time}?`
    );

    if (!confirmDelete) return;

    try {
      await deleteAppointment(appointment.id);
      await loadAppointments();
      await loadStatistics();
      setShowAppointmentDetails(false);
    } catch (error) {
      console.error('Erro ao remover agendamento');
      alert('Erro ao remover agendamento. Tente novamente.');
    }
  };

  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleMarkMissedAppointments = async () => {
    const confirmMark = window.confirm(
      'Tem certeza que deseja marcar automaticamente os agendamentos vencidos como perdidos? Esta ação não pode ser desfeita.'
    );

    if (!confirmMark) return;

    try {
      const result = await markMissedAppointments(24); // 24 horas após o agendamento
      await loadAppointments();
      await loadStatistics();

      alert(`${result.marked_count || 0} agendamentos foram marcados como perdidos.`);
    } catch (error) {
      console.error('Erro ao marcar agendamentos perdidos');
      alert('Erro ao processar agendamentos perdidos. Tente novamente.');
    }
  };

  const handleRefresh = () => {
    loadAppointments();
    loadStatistics();
  };

  const handleGenerateReport = async (config) => {
    try {
      setIsGeneratingReport(true);

      // Gerar relatório usando AppointmentReportGenerator
      const result = await generateAppointmentReport(config);

      if (result.success) {
        alert(`Relatório gerado com sucesso! Arquivo: ${result.fileName}`);
        setShowReportModal(false);
      } else {
        throw new Error('Falha na geração do relatório');
      }

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Extrair terapeutas únicos dos assignments E dos appointments
  const getTherapists = () => {
    const therapistsMap = new Map();

    // Buscar terapeutas dos assignments
    assignments.forEach(assignment => {
      if (assignment.therapist_id && assignment.therapist_name) {
        therapistsMap.set(assignment.therapist_id, {
          id: assignment.therapist_id,
          full_name: assignment.therapist_name
        });
      }
    });

    // Buscar terapeutas dos appointments (para incluir todos que têm agendamentos)
    appointments.forEach(appointment => {
      if (appointment.therapist_id && appointment.therapist_name) {
        therapistsMap.set(appointment.therapist_id, {
          id: appointment.therapist_id,
          full_name: appointment.therapist_name
        });
      }
    });

    return Array.from(therapistsMap.values());
  };

  const getQuickStatsCards = () => {
    if (!statistics) return [];

    return [
      {
        title: 'Total de Agendamentos',
        value: statistics.total_appointments || 0,
        icon: faCalendarAlt,
        color: 'bg-blue-500'
      },
      {
        title: 'Agendamentos Hoje',
        value: statistics.today_appointments || 0,
        icon: faCalendarAlt,
        color: 'bg-green-500'
      },
      {
        title: 'Taxa de Comparecimento',
        value: `${statistics.attendance_rate || 0}%`,
        icon: faChartBar,
        color: 'bg-purple-500'
      },
      {
        title: 'Agendamentos Perdidos',
        value: statistics.missed_appointments || 0,
        icon: faExclamationTriangle,
        color: 'bg-red-500'
      }
    ];
  };

  // Verificar permissões
  const canCreateAppointments = user && user.is_admin;
  const canEditAppointments = user && user.is_admin;
  const canDeleteAppointments = user && user.is_admin;

  if (!canCreateAppointments) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-4xl mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
            <p className="text-gray-600">
              Você não tem permissão para acessar o sistema de agendamento.
              Esta funcionalidade está disponível apenas para administradores.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-3 text-blue-600" />
                Sistema de Agendamento
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gerencie agendamentos de sessões e acompanhe estatísticas da clínica
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              >
                <FontAwesomeIcon icon={faRefresh} className="mr-2 w-4 h-4" />
                Atualizar
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
              >
                <FontAwesomeIcon icon={faFilePdf} className="mr-2 w-4 h-4" />
                Gerar Relatório
              </button>
              <button
                onClick={() => setShowIntelligentDetection(true)}
                className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 border border-purple-300 rounded-md shadow-sm hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center"
              >
                <FontAwesomeIcon icon={faBrain} className="mr-2 w-4 h-4" />
                Detecção Inteligente
              </button>
              <button
                onClick={handleMarkMissedAppointments}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md shadow-sm hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
              >
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 w-4 h-4" />
                Marcar Perdidos
              </button>
              <button
                onClick={() => setShowAppointmentForm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              >
                <FontAwesomeIcon icon={faCalendarPlus} className="mr-2 w-4 h-4" />
                Novo Agendamento
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {getQuickStatsCards().map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                    <FontAwesomeIcon icon={stat.icon} className="text-white w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">{stat.title}</h3>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Abas de Navegação */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('appointments')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'appointments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                Agendamentos
              </button>
              <button
                onClick={() => setActiveTab('orphans')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orphans'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                Sessões Órfãs
              </button>
              <button
                onClick={() => setActiveTab('recurring')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'recurring'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FontAwesomeIcon icon={faRefresh} className="mr-2" />
                Recorrentes
              </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        {activeTab === 'appointments' && (
          <AppointmentsList
            appointments={appointments}
            onEdit={handleEditAppointment}
            onDelete={handleDeleteAppointment}
            onView={handleViewAppointment}
            isLoading={isLoading}
            pagination={pagination}
            onPageChange={handlePageChange}
            showFilters={true}
          />
        )}

        {activeTab === 'orphans' && (
          <OrphanSessionsList
            onCreateRetroactive={handleCreateRetroactive}
            refreshTrigger={orphanRefreshTrigger}
          />
        )}

        {activeTab === 'recurring' && (
          <RecurringTemplatesList
            onCreateNew={handleCreateRecurringTemplate}
            onViewAppointments={handleViewTemplateAppointments}
          />
        )}
      </div>

      {/* Modals */}
      <AppointmentForm
        isOpen={showAppointmentForm}
        onClose={() => {
          setShowAppointmentForm(false);
          setEditingAppointment(null);
        }}
        onSubmit={editingAppointment ? handleUpdateAppointment : handleCreateAppointment}
        assignments={assignments}
        editingAppointment={editingAppointment}
        isLoading={isSubmitting}
      />

      <AppointmentDetailsModal
        isOpen={showAppointmentDetails}
        onClose={() => {
          setShowAppointmentDetails(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onEdit={handleEditAppointment}
        onDelete={handleDeleteAppointment}
        canEdit={canEditAppointments}
        canDelete={canDeleteAppointments}
      />

      <ReportConfigModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onGenerate={handleGenerateReport}
        therapists={getTherapists()}
        isGenerating={isGeneratingReport}
      />

      {/* Novos Modais para Gestão de Órfãs */}
      <IntelligentDetectionModal
        isOpen={showIntelligentDetection}
        onClose={() => setShowIntelligentDetection(false)}
        onDetectionComplete={handleDetectionComplete}
      />

      <RetroactiveAppointmentModal
        isOpen={showRetroactiveModal}
        onClose={() => {
          setShowRetroactiveModal(false);
          setSelectedOrphanSession(null);
        }}
        orphanSession={selectedOrphanSession}
        onSuccess={handleRetroactiveSuccess}
      />
    </div>
  );
};

export default SchedulingPage;