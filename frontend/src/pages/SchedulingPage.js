// frontend/src/pages/SchedulingPage.js

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarPlus,
  faCalendarAlt,
  faChartBar,
  faRefresh,
  faExclamationTriangle,
  faFilePdf,
  faBrain,
  faCalendarWeek,  // ✅ NOVO: Ícone para visualização de calendário
  faEllipsisV,  // ✅ Ícone para menu mobile
  faSearch,  // ✅ AGENDAMENTO INTELIGENTE: Busca rápida
  faMagic  // ✅ AGENDAMENTO INTELIGENTE: Assistente
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
import RetroactiveSessionModal from '../components/scheduling/RetroactiveSessionModal'; // ✅ SOLUÇÃO 4: Modal para registro retroativo
import AvailabilitySearchModal from '../components/scheduling/AvailabilitySearchModal'; // ✅ AGENDAMENTO INTELIGENTE: Busca rápida
import AppointmentWizard from '../components/scheduling/AppointmentWizard'; // ✅ AGENDAMENTO INTELIGENTE: Assistente
import ManageRecurrenceModal from '../components/scheduling/ManageRecurrenceModal'; // ✅ NOVO: Gerenciar recorrências
import LinkSessionModal from '../components/scheduling/LinkSessionModal'; // ✅ NOVO: Registro de sessão com vinculação
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
import recurrenceApi from '../api/recurrenceApi'; // ✅ NOVO: API de gerenciamento de recorrências
import { fetchAllAssignments } from '../api/adminApi';
import { generateAppointmentReport } from '../components/scheduling/AppointmentReportGenerator';
import { getPatientAttendanceData } from '../api/reportApi';
import { generatePatientAttendanceReportPDF } from '../utils/pdfGenerator';
import usePendingActions from '../hooks/usePendingActions';

/**
 * Página principal de agendamento para administradores
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 */
const SchedulingPage = () => {
  const { user, token } = useAuth();

  // Hook de ações pendentes (órfãs + perdidas)
  const { orphansCount, missedCount, pendingCount } = usePendingActions();

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
  const [showActionsMenu, setShowActionsMenu] = useState(false); // ✅ NOVO: Menu de ações mobile
  const [showRetroactiveSessionModal, setShowRetroactiveSessionModal] = useState(false); // ✅ SOLUÇÃO 4: Modal retroativo
  const [showAvailabilitySearch, setShowAvailabilitySearch] = useState(false); // ✅ AGENDAMENTO INTELIGENTE: Busca rápida
  const [showAppointmentWizard, setShowAppointmentWizard] = useState(false); // ✅ AGENDAMENTO INTELIGENTE: Assistente
  const [showManageRecurrence, setShowManageRecurrence] = useState(false); // ✅ NOVO: Modal de gerenciamento de recorrências
  const [showLinkSessionModal, setShowLinkSessionModal] = useState(false); // ✅ NOVO: Modal de vinculação de sessão
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
    // Por agora, só mostrar toast
    toast.success(`Template: ${template.patient_name} - ${template.therapist_name}\nID: ${template.id}`, {
      duration: 5000
    });
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
        toast.success(
          `Template recorrente criado com sucesso!\n${generated_appointments} agendamentos gerados\n${conflicts > 0 ? conflicts + ' conflitos encontrados' : 'Sem conflitos'}`,
          { duration: 5000 }
        );

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
      toast.error('Erro ao remover agendamento. Tente novamente.');
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

      toast.success(`${result.count} agendamento(s) da série foram removidos com sucesso!`);
    } catch (error) {
      console.error('Erro ao excluir série recorrente:', error);
      toast.error(`Erro ao excluir série: ${error.message}`);
    }
  };

  const handleViewNextOccurrences = async (appointment) => {
    try {
      const result = await getNextOccurrences(appointment.recurring_template_id, 10);
      const occurrences = result.occurrences || [];

      if (occurrences.length === 0) {
        toast('Não há mais ocorrências futuras para esta série.', { icon: 'ℹ️' });
        return;
      }

      // Formatar lista de ocorrências
      const occurrencesList = occurrences.map(occ => {
        const date = new Date(occ.scheduled_date).toLocaleDateString('pt-BR');
        const time = occ.scheduled_time.substring(0, 5);
        return `• ${date} às ${time}`;
      }).join('\n');

      toast.success(`Próximas ${occurrences.length} Ocorrências:\n\n${occurrencesList}`, {
        duration: 7000
      });
    } catch (error) {
      console.error('Erro ao buscar próximas ocorrências:', error);
      toast.error(`Erro: ${error.message}`);
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
      toast.success('Justificativa adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao justificar ausência:', error);
      toast.error(`Erro ao justificar: ${error.message}`);
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
      toast.success('Agendamento cancelado com sucesso!');
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      toast.error(`Erro ao cancelar: ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  // ✅ NOVO: Handler para gerenciar recorrências
  const handleManageRecurrence = (appointment) => {
    setSelectedAppointment(appointment);
    setShowManageRecurrence(true);
  };

  const handleConfirmManageRecurrence = async (params) => {
    try {
      const result = await recurrenceApi.manageRecurrence(params);
      await loadAppointments();
      setShowManageRecurrence(false);
      setSelectedAppointment(null);

      const message = recurrenceApi.formatCancellationMessage(result.data);
      toast.success(message);
    } catch (error) {
      console.error('Erro ao gerenciar recorrência:', error);
      toast.error(error.message || 'Erro ao processar ação');
      throw error; // Re-throw para o modal saber que falhou
    }
  };

  // ✅ NOVO: Handler para registrar sessão vinculada (Plano Pro)
  const handleRecordSession = (appointment) => {
    setSelectedAppointment(appointment);
    setShowLinkSessionModal(true);
  };

  const handleSessionRecordSuccess = async (data) => {
    await loadAppointments();
    console.log('[SUCCESS] Sessão registrada:', data);
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

      toast.success(`${result.marked_count || 0} agendamentos foram marcados como perdidos.`);
    } catch (error) {
      console.error('Erro ao marcar agendamentos perdidos');
      toast.error('Erro ao processar agendamentos perdidos. Tente novamente.');
    }
  };

  const handleRefresh = () => {
    loadAppointments();
  };

  // ✅ AGENDAMENTO INTELIGENTE: Handlers para busca rápida e assistente
  const handleAvailabilitySlotSelected = (slotData) => {
    // Preencher formulário de agendamento com os dados do slot selecionado
    setEditingAppointment({
      therapist_id: slotData.therapist_id,
      scheduled_date: slotData.scheduled_date,
      scheduled_time: slotData.scheduled_time,
      duration_minutes: slotData.duration_minutes,
      room_id: slotData.room_id,
      notes: slotData.notes || ''
    });
    setShowAppointmentForm(true);
  };

  const handleWizardScheduleAppointments = async (appointmentsToCreate) => {
    try {
      setIsSubmitting(true);

      // Criar todos os agendamentos em sequência
      const results = [];
      for (const appointmentData of appointmentsToCreate) {
        const result = await createAppointment(appointmentData);
        results.push(result);
      }

      await loadAppointments();
      setShowAppointmentWizard(false);

      toast.success(
        `${results.length} agendamento${results.length > 1 ? 's' : ''} criado${results.length > 1 ? 's' : ''} com sucesso!`,
        { duration: 4000 }
      );
    } catch (error) {
      console.error('Erro ao criar agendamentos via assistente:', error);
      toast.error(`Erro ao criar agendamentos: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ SOLUÇÃO 4: Handler para criar sessão retroativa (plano Agendamento)
  const handleCreateRetroactiveSession = async (sessionData) => {
    try {
      setIsSubmitting(true);

      // Usar a mesma API de criação de agendamento, mas marcado como retroativo
      const retroactiveData = {
        ...sessionData,
        status: 'completed' // Já criar como completo
      };

      await createAppointment(retroactiveData);
      await loadAppointments();

      setShowRetroactiveSessionModal(false);
      toast.success('Sessão retroativa registrada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar sessão retroativa:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateReport = async (config) => {
    try {
      setIsGeneratingReport(true);

      // Verificar se é relatório de presenças do paciente
      if (config.scope.type === 'patient-attendance') {
        // Buscar dados do backend
        const data = await getPatientAttendanceData(
          config.scope.patientId,
          config.period.startDate,
          config.period.endDate
        );

        // Gerar PDF
        const success = await generatePatientAttendanceReportPDF(data);

        if (success) {
          toast.success('Relatório de presenças gerado com sucesso!');
          setShowReportModal(false);
        } else {
          throw new Error('Falha na geração do relatório de presenças');
        }
      } else {
        // Gerar relatório de agendamentos usando AppointmentReportGenerator
        const result = await generateAppointmentReport(config);

        if (result.success) {
          setShowReportModal(false);
        } else {
          throw new Error('Falha na geração do relatório');
        }
      }

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório. Tente novamente.');
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

  // ✅ NOVO: Extrair pacientes únicos dos appointments
  const getPatients = () => {
    const patientsMap = new Map();

    // Buscar pacientes dos appointments
    appointments.forEach(appointment => {
      if (appointment.patient_id && appointment.patient_name) {
        patientsMap.set(appointment.patient_id, {
          id: appointment.patient_id,
          name: appointment.patient_name
        });
      }
    });

    return Array.from(patientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
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
        <div className="px-2 sm:px-4">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 sm:mr-3 text-blue-600" />
                <span className="hidden sm:inline">Sistema de Agendamento</span>
                <span className="sm:hidden">Agendamentos</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 hidden sm:block">
                Gerencie agendamentos de sessões e acompanhe estatísticas da clínica
              </p>
            </div>

            {/* Desktop: Botões normais */}
            <div className="hidden sm:flex space-x-2 sm:space-x-3">
              <button
                onClick={handleRefresh}
                className="px-3 py-2 sm:px-4 sm:py-2 min-h-[44px] text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow transition-all duration-200 flex items-center"
              >
                <FontAwesomeIcon icon={faRefresh} className="mr-2 w-4 h-4" />
                Atualizar
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="px-3 py-2 sm:px-4 sm:py-2 min-h-[44px] text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 border border-transparent rounded-lg shadow-sm hover:from-red-600 hover:to-red-700 hover:shadow transition-all duration-200 flex items-center"
              >
                <FontAwesomeIcon icon={faFilePdf} className="mr-2 w-4 h-4" />
                Gerar Relatório
              </button>
              {/* ✅ AGENDAMENTO INTELIGENTE: Botão Busca Rápida */}
              <button
                onClick={() => setShowAvailabilitySearch(true)}
                className="px-3 py-2 sm:px-4 sm:py-2 min-h-[44px] text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-green-500 to-teal-600 border border-transparent rounded-lg shadow-sm hover:from-green-600 hover:to-teal-700 hover:shadow transition-all duration-200 flex items-center"
              >
                <FontAwesomeIcon icon={faSearch} className="mr-2 w-4 h-4" />
                Buscar Horários
              </button>
              {/* ✅ AGENDAMENTO INTELIGENTE: Botão Assistente */}
              <button
                onClick={() => setShowAppointmentWizard(true)}
                className="px-3 py-2 sm:px-4 sm:py-2 min-h-[44px] text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 border border-transparent rounded-lg shadow-sm hover:from-purple-600 hover:to-indigo-700 hover:shadow transition-all duration-200 flex items-center"
              >
                <FontAwesomeIcon icon={faMagic} className="mr-2 w-4 h-4" />
                Assistente
              </button>
              {/* ✅ SOLUÇÃO 4: Botão Registrar Sessão Passada (apenas plano Agendamento) */}
              {user?.subscription_plan === 'scheduling' && !user?.trial_pro_enabled && (
                <button
                  onClick={() => setShowRetroactiveSessionModal(true)}
                  className="px-3 py-2 sm:px-4 sm:py-2 min-h-[44px] text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 border border-transparent rounded-lg shadow-sm hover:from-orange-600 hover:to-red-700 hover:shadow transition-all duration-200 flex items-center"
                >
                  <FontAwesomeIcon icon={faCalendarPlus} className="mr-2 w-4 h-4" />
                  Sessão Passada
                </button>
              )}
              <button
                onClick={() => setShowAppointmentForm(true)}
                className="px-3 py-2 sm:px-4 sm:py-2 min-h-[44px] text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 border border-transparent rounded-lg shadow-sm hover:from-blue-600 hover:to-indigo-700 hover:shadow-md transition-all duration-200 flex items-center transform hover:scale-105"
              >
                <FontAwesomeIcon icon={faCalendarPlus} className="mr-2 w-4 h-4" />
                Novo Agendamento
              </button>
            </div>

            {/* Mobile: Botão Menu */}
            <button
              onClick={() => setShowActionsMenu(true)}
              className="sm:hidden p-2 min-h-[44px] min-w-[44px] text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faEllipsisV} className="text-xl" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-2 sm:px-4 py-4 sm:py-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}


        {/* ✅ CORREÇÃO: Painel de Ações Pendentes apenas no plano Pro */}
        {(user?.subscription_plan === 'pro' || user?.trial_pro_enabled) && (
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
                toast(`Funcionalidade de criação em lote de ${sessions.length} retroativos será implementada em breve.`, {
                  icon: '🚀',
                  duration: 4000
                });
              }}
              refreshTrigger={orphanRefreshTrigger}
            />
          </div>
        )}

        {/* Abas de Navegação */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('appointments')}
                className={`py-2 px-1 min-h-[44px] border-b-2 font-medium text-xs sm:text-sm flex items-center ${
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
                className={`py-2 px-1 min-h-[44px] border-b-2 font-medium text-xs sm:text-sm flex items-center ${
                  activeTab === 'calendar'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FontAwesomeIcon icon={faCalendarWeek} className="mr-2" />
                Calendário
              </button>
              {/* ✅ CORREÇÃO: Mostrar "Sessões Órfãs" apenas no plano Pro */}
              {(user?.subscription_plan === 'pro' || user?.trial_pro_enabled) && (
                <button
                  onClick={() => setActiveTab('orphans')}
                  className={`py-2 px-1 min-h-[44px] border-b-2 font-medium text-xs sm:text-sm relative group flex items-center ${
                    activeTab === 'orphans'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  title={orphansCount > 0 ? `${orphansCount} sessão(ões) órfã(s) detectada(s)` : 'Nenhuma sessão órfã detectada'}
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                  Sessões Órfãs
                  {orphansCount > 0 && (
                    <>
                      {/* Badge de notificação */}
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-orange-500 rounded-full animate-pulse">
                        {orphansCount}
                      </span>
                      {/* Tooltip personalizado */}
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs font-normal text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-lg">
                        {orphansCount} sessão(ões) realizada(s) sem agendamento prévio
                        <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></span>
                      </span>
                    </>
                  )}
                </button>
              )}
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
            onManageRecurrence={handleManageRecurrence}  // ✅ NOVO: Gerenciar recorrências
            onRecordSession={handleRecordSession}        // ✅ NOVO: Registrar sessão (Pro)
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
        patients={getPatients()}
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

      {/* ✅ NOVO: Modal de Gerenciamento de Recorrências */}
      <ManageRecurrenceModal
        isOpen={showManageRecurrence}
        onClose={() => {
          setShowManageRecurrence(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onConfirm={handleConfirmManageRecurrence}
      />

      {/* ✅ NOVO: Modal de Registro de Sessão com Vinculação (Plano Pro) */}
      <LinkSessionModal
        isOpen={showLinkSessionModal}
        onClose={() => {
          setShowLinkSessionModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        patient={selectedAppointment ? {
          id: selectedAppointment.patient_id,
          name: selectedAppointment.patient_name
        } : null}
        assignments={assignments.filter(a => a.patient_id === selectedAppointment?.patient_id)}
        onSuccess={handleSessionRecordSuccess}
      />

      {/* ✅ SOLUÇÃO 4: Modal para Registrar Sessão Retroativa (Plano Agendamento) */}
      <RetroactiveSessionModal
        isOpen={showRetroactiveSessionModal}
        onClose={() => setShowRetroactiveSessionModal(false)}
        onSubmit={handleCreateRetroactiveSession}
        patients={getPatients()}
        therapists={getTherapists()}
        isLoading={isSubmitting}
      />

      {/* ✅ AGENDAMENTO INTELIGENTE: Modal de Busca Rápida de Disponibilidade */}
      <AvailabilitySearchModal
        isOpen={showAvailabilitySearch}
        onClose={() => setShowAvailabilitySearch(false)}
        onSelectSlot={handleAvailabilitySlotSelected}
      />

      {/* ✅ AGENDAMENTO INTELIGENTE: Assistente de Agendamento */}
      <AppointmentWizard
        isOpen={showAppointmentWizard}
        onClose={() => setShowAppointmentWizard(false)}
        onScheduleAppointments={handleWizardScheduleAppointments}
        isLoading={isSubmitting}
      />

      {/* Modal de Ações - Mobile */}
      {showActionsMenu && (
        <div className="sm:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end" onClick={() => setShowActionsMenu(false)}>
          <div className="bg-white rounded-t-2xl w-full p-4 pb-8 space-y-3 slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Menu de Ações</h3>
              <button
                onClick={() => setShowActionsMenu(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={faEllipsisV} className="text-xl rotate-90" />
              </button>
            </div>

            <button
              onClick={() => {
                handleRefresh();
                setShowActionsMenu(false);
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 rounded-lg font-medium hover:from-gray-100 hover:to-slate-100 active:scale-95 transition-all flex items-center"
            >
              <FontAwesomeIcon icon={faRefresh} className="mr-3 text-lg" />
              Atualizar
            </button>

            <button
              onClick={() => {
                setShowReportModal(true);
                setShowActionsMenu(false);
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-red-50 to-pink-50 text-red-700 rounded-lg font-medium hover:from-red-100 hover:to-pink-100 active:scale-95 transition-all flex items-center"
            >
              <FontAwesomeIcon icon={faFilePdf} className="mr-3 text-lg" />
              Gerar Relatório
            </button>

            {/* ✅ SOLUÇÃO 4: Botão mobile para Sessão Passada (apenas plano Agendamento) */}
            {user?.subscription_plan === 'scheduling' && !user?.trial_pro_enabled && (
              <button
                onClick={() => {
                  setShowRetroactiveSessionModal(true);
                  setShowActionsMenu(false);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 rounded-lg font-medium hover:from-orange-100 hover:to-red-100 active:scale-95 transition-all flex items-center"
              >
                <FontAwesomeIcon icon={faCalendarPlus} className="mr-3 text-lg" />
                Sessão Passada (Últimos 7 dias)
              </button>
            )}

            <button
              onClick={() => {
                setShowAppointmentForm(true);
                setShowActionsMenu(false);
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg font-medium hover:from-blue-100 hover:to-indigo-100 active:scale-95 transition-all flex items-center"
            >
              <FontAwesomeIcon icon={faCalendarPlus} className="mr-3 text-lg" />
              Novo Agendamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulingPage;