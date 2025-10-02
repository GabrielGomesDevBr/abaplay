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
  faBrain,
  faCalendarWeek  // ✅ NOVO: Ícone para visualização de calendário
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
import PendingActionsPanel from '../components/scheduling/PendingActionsPanel';
import EditRecurringSeriesModal from '../components/scheduling/EditRecurringSeriesModal'; // ✅ FASE 3
import CancelAppointmentModal from '../components/scheduling/CancelAppointmentModal'; // ✅ NOVO: Modal de cancelamento
import WeekCalendarView from '../components/scheduling/WeekCalendarView'; // ✅ NOVO: Visualização de calendário
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  markMissedAppointments,
  updateRecurringSeries, // ✅ FASE 3
  deleteRecurringSeries, // ✅ FASE 3
  getNextOccurrences,    // ✅ FASE 3
  justifyAbsence,        // ✅ FASE 3
  cancelAppointment      // ✅ NOVO: Função de cancelamento
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
  const [therapists, setTherapists] = useState([]); // ✅ NOVO: Lista de terapeutas para filtro
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados dos modais
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showIntelligentDetection, setShowIntelligentDetection] = useState(false);
  const [showRetroactiveModal, setShowRetroactiveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false); // ✅ NOVO: Modal de cancelamento
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedOrphanSession, setSelectedOrphanSession] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false); // ✅ NOVO: Loading de cancelamento

  // Estado para abas (✅ FASE 3: Removida aba 'recurring')
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'calendar' | 'orphans'
  const [orphanRefreshTrigger, setOrphanRefreshTrigger] = useState(0);

  // ✅ FASE 3: Estados para funcionalidades de séries recorrentes
  const [showEditSeriesModal, setShowEditSeriesModal] = useState(false);
  const [seriesModalAction, setSeriesModalAction] = useState('edit'); // 'edit' | 'delete'
  const [selectedSeriesAppointment, setSelectedSeriesAppointment] = useState(null);

  // Estados de filtros e paginação (✅ FASE 3: Adicionado filtro recurring_only)
  const [filters, setFilters] = useState({
    therapist_id: '',
    patient_id: '',
    status: '',
    start_date: '',
    end_date: '',
    recurring_only: false, // ✅ FASE 3: Filtro para mostrar apenas recorrentes
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

      // ✅ NOVO: Extrair lista única de terapeutas dos assignments
      const uniqueTherapists = Array.from(
        new Map(
          assignmentsData.map(a => [a.therapist_id, {
            id: a.therapist_id,
            full_name: a.therapist_name
          }])
        ).values()
      );
      setTherapists(uniqueTherapists);
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

  // Carregar dados iniciais
  useEffect(() => {
    loadAppointments();
    refreshAssignments();
  }, [loadAppointments, refreshAssignments]);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // ✅ NOVO: Ajustar filtros quando mudar para aba de calendário
  useEffect(() => {
    if (activeTab === 'calendar') {
      // Para calendário, buscar agendamentos de um range amplo (últimos 30 dias + próximos 60 dias)
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 30); // 30 dias atrás

      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 60); // 60 dias à frente

      setFilters(prev => ({
        ...prev,
        start_date: pastDate.toISOString().split('T')[0],
        end_date: futureDate.toISOString().split('T')[0],
        limit: 1000, // Aumentar limite para mostrar todos do período
        page: 1
      }));
    } else if (activeTab === 'appointments') {
      // Para lista, manter um range padrão razoável (últimos 60 dias + próximos 90 dias)
      // Isso garante que a busca funcione bem sem sobrecarregar
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 60); // 60 dias atrás

      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 90); // 90 dias à frente

      setFilters(prev => ({
        ...prev,
        start_date: pastDate.toISOString().split('T')[0],
        end_date: futureDate.toISOString().split('T')[0],
        limit: 500, // Limite maior para busca funcionar bem
        page: 1
      }));
    }
  }, [activeTab]);

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
      } else {
        // Agendamento único
        const newAppointment = await createAppointment(appointmentData);

        // Atualizar lista
        await loadAppointments();

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

  // ✅ FASE 3: Handlers para séries recorrentes
  const handleEditSeries = (appointment) => {
    setSelectedSeriesAppointment(appointment);
    setSeriesModalAction('edit');
    setShowEditSeriesModal(true);
  };

  const handleDeleteSeries = (appointment) => {
    setSelectedSeriesAppointment(appointment);
    setSeriesModalAction('delete');
    setShowEditSeriesModal(true);
  };

  const handleEditSeriesSingle = (appointment) => {
    // Editar apenas este agendamento (comportamento normal)
    handleEditAppointment(appointment);
    setShowEditSeriesModal(false);
  };

  const handleEditSeriesAll = async (appointment) => {
    // Abrir form de edição para toda a série
    setEditingAppointment({ ...appointment, editMode: 'series' });
    setShowAppointmentForm(true);
    setShowEditSeriesModal(false);
  };

  const handleDeleteSeriesSingle = async (appointment) => {
    setShowEditSeriesModal(false);
    handleDeleteAppointment(appointment);
  };

  const handleDeleteSeriesAll = async (appointment) => {
    setShowEditSeriesModal(false);

    const confirmDelete = window.confirm(
      `Tem certeza que deseja remover TODA A SÉRIE de agendamentos recorrentes?\n\nIsso afetará todos os agendamentos futuros desta série.`
    );

    if (!confirmDelete) return;

    try {
      const result = await deleteRecurringSeries(appointment.recurring_template_id, appointment.id);
      await loadAppointments();
      
      alert(`✅ ${result.count} agendamento(s) da série foram removidos com sucesso!`);
    } catch (error) {
      console.error('Erro ao excluir série recorrente:', error);
      alert(`❌ Erro ao excluir série: ${error.message}`);
    }
  };

  const handleViewNextOccurrences = async (appointment) => {
    try {
      const result = await getNextOccurrences(appointment.recurring_template_id, 10);
      const occurrences = result.occurrences || [];

      if (occurrences.length === 0) {
        alert('Não há mais ocorrências futuras para esta série.');
        return;
      }

      // Formatar lista de ocorrências
      const occurrencesList = occurrences.map(occ => {
        const date = new Date(occ.scheduled_date).toLocaleDateString('pt-BR');
        const time = occ.scheduled_time.substring(0, 5);
        return `• ${date} às ${time}`;
      }).join('\n');

      alert(`📅 Próximas ${occurrences.length} Ocorrências:\n\n${occurrencesList}`);
    } catch (error) {
      console.error('Erro ao buscar próximas ocorrências:', error);
      alert(`❌ Erro: ${error.message}`);
    }
  };

  const handleJustifyAppointment = async (appointment) => {
    const reason = prompt(`Justificar ausência do agendamento:\n\nPaciente: ${appointment.patient_name}\nData: ${new Date(appointment.scheduled_date).toLocaleDateString('pt-BR')}\n\nDigite o motivo da ausência:`);

    if (!reason || reason.trim() === '') return;

    try {
      await justifyAbsence(appointment.id, {
        missed_reason_type: 'other',
        missed_reason_description: reason,
        admin_override: true
      });

      await loadAppointments();
      alert('✅ Justificativa adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao justificar ausência:', error);
      alert(`❌ Erro ao justificar: ${error.message}`);
    }
  };

  // ✅ NOVO: Handler para cancelamento de agendamento
  const handleCancelAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async (appointment, cancellationData) => {
    try {
      setIsCancelling(true);
      await cancelAppointment(appointment.id, cancellationData);
      await loadAppointments();
      setShowCancelModal(false);
      setSelectedAppointment(null);
      alert('✅ Agendamento cancelado com sucesso!');
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      alert(`❌ Erro ao cancelar: ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
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
      

      alert(`${result.marked_count || 0} agendamentos foram marcados como perdidos.`);
    } catch (error) {
      console.error('Erro ao marcar agendamentos perdidos');
      alert('Erro ao processar agendamentos perdidos. Tente novamente.');
    }
  };

  const handleRefresh = () => {
    loadAppointments();
    
  };

  const handleGenerateReport = async (config) => {
    try {
      setIsGeneratingReport(true);

      // Gerar relatório usando AppointmentReportGenerator
      const result = await generateAppointmentReport(config);

      if (result.success) {
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow transition-all duration-200 flex items-center"
              >
                <FontAwesomeIcon icon={faRefresh} className="mr-2 w-4 h-4" />
                Atualizar
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 border border-transparent rounded-lg shadow-sm hover:from-red-600 hover:to-red-700 hover:shadow transition-all duration-200 flex items-center"
              >
                <FontAwesomeIcon icon={faFilePdf} className="mr-2 w-4 h-4" />
                Gerar Relatório
              </button>
              <button
                onClick={() => setShowAppointmentForm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 border border-transparent rounded-lg shadow-sm hover:from-blue-600 hover:to-indigo-700 hover:shadow-md transition-all duration-200 flex items-center transform hover:scale-105"
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


        {/* NOVO: Painel de Ações Pendentes */}
        <div className="mb-8">
          <PendingActionsPanel
            onResolveOrphans={() => setActiveTab('orphans')}
            onResolveAll={() => setActiveTab('orphans')}
            onViewAppointmentDetails={handleViewAppointment}
            onJustifyAppointment={handleJustifyAppointment}
            onCreateRetroactive={handleCreateRetroactive}
            onCreateBatchRetroactive={(sessions) => {
              // Handler para criar múltiplos retroativos
              console.log('Criar retroativos em lote:', sessions);
              alert(`Funcionalidade de criação em lote de ${sessions.length} retroativos será implementada em breve.`);
            }}
            refreshTrigger={orphanRefreshTrigger}
          />
        </div>

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
                Lista
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'calendar'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FontAwesomeIcon icon={faCalendarWeek} className="mr-2" />
                Calendário
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
              {/* ✅ FASE 3: Aba "Recorrentes" removida - funcionalidade integrada na lista principal */}
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
            onEditSeries={handleEditSeries}              // ✅ FASE 3
            onDeleteSeries={handleDeleteSeries}          // ✅ FASE 3
            onJustify={handleJustifyAppointment}         // ✅ FASE 3
            onViewNextOccurrences={handleViewNextOccurrences} // ✅ FASE 3
            onCancel={handleCancelAppointment}           // ✅ NOVO: Cancelamento
            isLoading={isLoading}
            pagination={pagination}
            onPageChange={handlePageChange}
            showFilters={true}
          />
        )}

        {/* ✅ NOVO: Visualização em Calendário */}
        {activeTab === 'calendar' && (
          <WeekCalendarView
            appointments={appointments}
            therapists={therapists}
            onAppointmentClick={handleViewAppointment}
            onCreateAppointment={() => setShowAppointmentForm(true)}
          />
        )}

        {activeTab === 'orphans' && (
          <OrphanSessionsList
            onCreateRetroactive={handleCreateRetroactive}
            refreshTrigger={orphanRefreshTrigger}
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

      {/* ✅ FASE 3: Modal para escolher escopo de edição/exclusão de séries */}
      <EditRecurringSeriesModal
        isOpen={showEditSeriesModal}
        onClose={() => {
          setShowEditSeriesModal(false);
          setSelectedSeriesAppointment(null);
        }}
        appointment={selectedSeriesAppointment}
        actionType={seriesModalAction}
        onEditSingle={handleEditSeriesSingle}
        onEditSeries={handleEditSeriesAll}
        onDeleteSingle={handleDeleteSeriesSingle}
        onDeleteSeries={handleDeleteSeriesAll}
      />

      {/* ✅ NOVO: Modal de Cancelamento com Auditoria */}
      <CancelAppointmentModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onConfirm={handleConfirmCancel}
        isLoading={isCancelling}
      />
    </div>
  );
};

export default SchedulingPage;