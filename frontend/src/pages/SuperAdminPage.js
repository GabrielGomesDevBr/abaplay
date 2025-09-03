// frontend/src/pages/SuperAdminPage.js

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt, faBuilding, faDollarSign, faUsers, faChartLine,
  faExclamationTriangle, faCheckCircle, faInfoCircle, faSpinner,
  faPlus, faEdit, faBan, faPlay, faEye, faSearch, faFilter,
  faCreditCard, faCalendarAlt, faUserTie, faChartPie, faArrowTrendUp,
  faUserPlus, faMoneyBillWave, faClipboardList, faHistory, faTimes, faTrash,
  faCogs, faLightbulb, faHeartbeat, faBullseye, faBrain, faMedal, faRocket,
  faExclamationCircle, faTrophy, faTable
} from '@fortawesome/free-solid-svg-icons';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement
} from 'chart.js';
import {
  getSystemMetrics,
  getAllClinics,
  getAllBillings,
  getRevenueEvolution,
  getGrowthStats,
  createClinic,
  suspendClinic,
  reactivateClinic,
  updatePatientLimit,
  resetClinicAdminPassword,
  recordPayment,
  createBilling,
  deleteClinic,
  editBillingDueDate
} from '../api/superAdminApi';
import {
  getExecutiveDashboard,
  getCustomerHealth,
  getCohortAnalysis,
  getChurnPrediction,
  getExpansionOpportunities,
  getExecutiveReport
} from '../api/enterpriseApi';
import CreateClinicModal from '../components/superAdmin/CreateClinicModal';
import PatientLimitModal from '../components/superAdmin/PatientLimitModal';
import SuspendClinicModal from '../components/superAdmin/SuspendClinicModal';
import PaymentModal from '../components/superAdmin/PaymentModal';
import BillingCalendar from '../components/superAdmin/BillingCalendar';
import CreateBillingModal from '../components/superAdmin/CreateBillingModal';
import EditDueDateModal from '../components/superAdmin/EditDueDateModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement
);

// Helper function to safely format numbers
const safeToFixed = (value, decimals = 2) => {
  const num = parseFloat(value) || 0;
  return num.toFixed(decimals);
};

// Componente de Card de Métricas (igual ao DashboardPage)
const StatCard = ({ title, value, icon, colorClass, interpretation, trend }) => {
  const getInterpretationStyle = (interp) => {
    switch (interp) {
      case 'good': return { bg: 'bg-green-100', border: 'border-green-200', icon: faCheckCircle, color: 'text-green-600' };
      case 'attention': return { bg: 'bg-yellow-100', border: 'border-yellow-200', icon: faExclamationTriangle, color: 'text-yellow-600' };
      case 'critical': return { bg: 'bg-red-100', border: 'border-red-200', icon: faExclamationTriangle, color: 'text-red-600' };
      default: return { bg: 'bg-gray-100', border: 'border-gray-200', icon: faInfoCircle, color: 'text-gray-600' };
    }
  };

  const interpStyle = interpretation ? getInterpretationStyle(interpretation) : null;

  return (
    <div className={`bg-white p-4 rounded-lg shadow border ${interpStyle ? interpStyle.border : 'border-gray-200'} flex items-start space-x-4 relative transition-all hover:shadow-md`}>
      <div className={`text-xl p-3 rounded-full ${colorClass.bg} ${colorClass.text}`}>
        <FontAwesomeIcon icon={icon} className="fa-fw" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
        <div className="flex items-center space-x-2">
          <p className={`text-3xl font-semibold ${colorClass.text}`}>{value}</p>
          {trend && (
            <span className={`text-sm font-medium ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
      {interpStyle && (
        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full ${interpStyle.bg} flex items-center justify-center`}>
          <FontAwesomeIcon icon={interpStyle.icon} className={`text-xs ${interpStyle.color}`} />
        </div>
      )}
    </div>
  );
};

const SuperAdminPage = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados para dados
  const [metrics, setMetrics] = useState({});
  const [clinics, setClinics] = useState([]);
  const [billings, setBillings] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [growthData, setGrowthData] = useState([]);
  
  // Estados para filtros
  const [clinicFilters, setClinicFilters] = useState({ status: '', search: '' });
  const [billingFilters, setBillingFilters] = useState({ status: '', clinic_id: '' });
  
  // Estados para modais
  const [showCreateClinic, setShowCreateClinic] = useState(false);
  const [showPatientLimit, setShowPatientLimit] = useState(false);
  const [showSuspendClinic, setShowSuspendClinic] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showClinicDetails, setShowClinicDetails] = useState(false);
  const [showCreateBilling, setShowCreateBilling] = useState(false);
  const [showEditDueDate, setShowEditDueDate] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [selectedBilling, setSelectedBilling] = useState(null);

  // Verificar se é super admin
  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      logout();
    }
  }, [user, logout]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsResponse, clinicsResponse, revenueResponse, growthResponse] = await Promise.all([
        getSystemMetrics(),
        getAllClinics(),
        getRevenueEvolution(),
        getGrowthStats()
      ]);

      setMetrics(metricsResponse.data || {});
      setClinics(clinicsResponse.data || []);
      setRevenueData(revenueResponse.data || []);
      setGrowthData(growthResponse.data || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados do sistema.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Função para carregar clínicas com useCallback
  const loadClinics = useCallback(async () => {
    try {
      const response = await getAllClinics(clinicFilters);
      setClinics(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
    }
  }, [clinicFilters]);

  const loadBillings = useCallback(async () => {
    try {
      const response = await getAllBillings(billingFilters);
      setBillings(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
    }
  }, [billingFilters]);

  // Recarregar dados quando filtros mudam
  useEffect(() => {
    if (activeTab === 'clinics') {
      loadClinics();
    }
  }, [activeTab, loadClinics]);

  useEffect(() => {
    if (activeTab === 'financial') {
      loadBillings();
    }
  }, [activeTab, loadBillings]);

  // Funções loadClinics e loadBillings movidas para cima com useCallback

  // Dados processados para gráficos
  const processedRevenueChart = useMemo(() => {
    if (!revenueData.length) return null;

    return {
      labels: revenueData.map(d => d.month_label),
      datasets: [{
        label: 'Receita Mensal (R$)',
        data: revenueData.map(d => parseFloat(d.revenue || 0)),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    };
  }, [revenueData]);

  const processedGrowthChart = useMemo(() => {
    if (!growthData.length) return null;

    return {
      labels: growthData.map(d => d.month_label),
      datasets: [
        {
          label: 'Novas Clínicas',
          data: growthData.map(d => parseInt(d.new_clinics || 0)),
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1
        },
        {
          label: 'Novos Usuários',
          data: growthData.map(d => parseInt(d.new_users || 0)),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }
      ]
    };
  }, [growthData]);

  const statusChart = useMemo(() => {
    const activeCount = parseInt(metrics.active_clinics || 0);
    const suspendedCount = parseInt(metrics.suspended_clinics || 0);
    const totalCount = parseInt(metrics.total_clinics || 0);
    const inactiveCount = totalCount - activeCount - suspendedCount;

    return {
      labels: ['Ativas', 'Suspensas', 'Inativas'],
      datasets: [{
        data: [activeCount, suspendedCount, inactiveCount],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)'
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(156, 163, 175)'
        ],
        borderWidth: 2
      }]
    };
  }, [metrics]);

  // Handlers para ações
  const handleCreateClinic = async (clinicData) => {
    try {
      await createClinic(clinicData);
      setShowCreateClinic(false);
      loadClinics();
      loadInitialData(); // Recarrega métricas
    } catch (error) {
      console.error('Erro ao criar clínica:', error);
    }
  };

  const handleSuspendClinic = async (clinicId, reason) => {
    try {
      await suspendClinic(clinicId, reason);
      setShowSuspendClinic(false);
      setSelectedClinic(null);
      loadClinics();
    } catch (error) {
      console.error('Erro ao suspender clínica:', error);
    }
  };

  const handleReactivateClinic = async (clinicId) => {
    try {
      await reactivateClinic(clinicId);
      loadClinics();
    } catch (error) {
      console.error('Erro ao reativar clínica:', error);
    }
  };

  const handleUpdatePatientLimit = async (clinicId, maxPatients) => {
    try {
      await updatePatientLimit(clinicId, maxPatients);
      setShowPatientLimit(false);
      setSelectedClinic(null);
      loadClinics();
    } catch (error) {
      console.error('Erro ao atualizar limite:', error);
    }
  };

  const handleResetClinicAdminPassword = async (clinicId) => {
    try {
      await resetClinicAdminPassword(clinicId);
      alert('Senha resetada! O administrador deverá cadastrar nova senha no próximo login.');
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      throw new Error('Erro ao resetar senha do administrador da clínica');
    }
  };

  const handleRecordPayment = async (paymentData) => {
    try {
      await recordPayment(selectedBilling.id, paymentData);
      setShowPaymentModal(false);
      setSelectedBilling(null);
      loadBillings();
      loadInitialData(); // Recarrega métricas
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
    }
  };

  const handleCreateBilling = async (billingData) => {
    try {
      await createBilling(billingData);
      setShowCreateBilling(false);
      loadBillings();
      loadInitialData(); // Recarrega métricas
    } catch (error) {
      console.error('Erro ao criar cobrança:', error);
    }
  };

  const handleEditDueDate = async (dueDateData) => {
    try {
      await editBillingDueDate(selectedBilling.id, dueDateData);
      setShowEditDueDate(false);
      setSelectedBilling(null);
      loadBillings();
      loadInitialData(); // Recarrega métricas
    } catch (error) {
      console.error('Erro ao editar data de vencimento:', error);
    }
  };

  const handleDeleteClinic = async (clinicId) => {
    try {
      await deleteClinic(clinicId);
      loadClinics();
      loadInitialData(); // Recarrega métricas
    } catch (error) {
      console.error('Erro ao eliminar clínica:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-500 animate-spin" />
        <span className="ml-3 text-lg">Carregando painel super admin...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-4xl mb-4" />
          <p className="text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faUserTie} className="text-2xl text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Super Admin</h1>
                <p className="text-sm text-gray-500">Painel de controle do sistema ABAplay</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Bem-vindo, <span className="font-semibold text-gray-700">{user?.name}</span>
              </div>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 bg-white">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: faTachometerAlt },
              { key: 'enterprise', label: 'Business Intelligence', icon: faBrain },
              { key: 'clinics', label: 'Clínicas', icon: faBuilding },
              { key: 'financial', label: 'Financeiro', icon: faDollarSign },
              { key: 'calendar', label: 'Calendário', icon: faCalendarAlt }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardContent 
            metrics={metrics} 
            processedRevenueChart={processedRevenueChart}
            processedGrowthChart={processedGrowthChart}
            statusChart={statusChart}
          />
        )}
        
        {activeTab === 'enterprise' && (
          <EnterpriseContent />
        )}
        
        {activeTab === 'clinics' && (
          <ClinicsContent 
            clinics={clinics}
            filters={clinicFilters}
            setFilters={setClinicFilters}
            onCreateClinic={() => setShowCreateClinic(true)}
            onEditLimit={(clinic) => {
              setSelectedClinic(clinic);
              setShowPatientLimit(true);
            }}
            onSuspend={(clinic) => {
              setSelectedClinic(clinic);
              setShowSuspendClinic(true);
            }}
            onReactivate={handleReactivateClinic}
            onViewDetails={(clinic) => {
              setSelectedClinic(clinic);
              setShowClinicDetails(true);
            }}
            onDeleteClinic={handleDeleteClinic}
          />
        )}
        
        {activeTab === 'financial' && (
          <FinancialContent 
            billings={billings}
            metrics={metrics}
            filters={billingFilters}
            setFilters={setBillingFilters}
            onRecordPayment={(billing) => {
              setSelectedBilling(billing);
              setShowPaymentModal(true);
            }}
            onCreateBilling={() => setShowCreateBilling(true)}
            loadInitialData={loadInitialData}
          />
        )}
        
        {activeTab === 'calendar' && (
          <CalendarContent 
            billings={billings}
            onViewBilling={(billing) => {
              setSelectedBilling(billing);
              // Podemos adicionar um modal de detalhes aqui
            }}
            onRecordPayment={(billing) => {
              setSelectedBilling(billing);
              setShowPaymentModal(true);
            }}
            onEditDueDate={(billing) => {
              setSelectedBilling(billing);
              setShowEditDueDate(true);
            }}
            onCreateBilling={() => setShowCreateBilling(true)}
          />
        )}
      </div>

      {/* Modals */}
      <CreateClinicModal
        isOpen={showCreateClinic}
        onClose={() => setShowCreateClinic(false)}
        onSubmit={handleCreateClinic}
      />

      <PatientLimitModal
        isOpen={showPatientLimit}
        onClose={() => {
          setShowPatientLimit(false);
          setSelectedClinic(null);
        }}
        clinic={selectedClinic}
        onSubmit={(maxPatients) => handleUpdatePatientLimit(selectedClinic.id, maxPatients)}
        onResetPassword={handleResetClinicAdminPassword}
      />

      <SuspendClinicModal
        isOpen={showSuspendClinic}
        onClose={() => {
          setShowSuspendClinic(false);
          setSelectedClinic(null);
        }}
        clinic={selectedClinic}
        onSubmit={(reason) => handleSuspendClinic(selectedClinic.id, reason)}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedBilling(null);
        }}
        billing={selectedBilling}
        onSubmit={handleRecordPayment}
      />

      <CreateBillingModal
        isOpen={showCreateBilling}
        onClose={() => setShowCreateBilling(false)}
        clinics={clinics}
        onSubmit={handleCreateBilling}
      />

      <EditDueDateModal
        isOpen={showEditDueDate}
        onClose={() => {
          setShowEditDueDate(false);
          setSelectedBilling(null);
        }}
        billing={selectedBilling}
        onSubmit={handleEditDueDate}
      />

      {/* Modal de Detalhes da Clínica */}
      {showClinicDetails && selectedClinic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalhes da Clínica: {selectedClinic.name}
              </h3>
              <button
                onClick={() => {
                  setShowClinicDetails(false);
                  setSelectedClinic(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`px-2 py-1 rounded text-sm ${
                    selectedClinic.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedClinic.status === 'suspended' 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedClinic.status === 'active' ? 'Ativa' : 
                     selectedClinic.status === 'suspended' ? 'Suspensa' : 'Inativa'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pacientes Atuais</label>
                  <p className="text-sm text-gray-900">{selectedClinic.current_patients || 0} / {selectedClinic.max_patients}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Terapeutas</label>
                  <p className="text-sm text-gray-900">{selectedClinic.therapists_count || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pais</label>
                  <p className="text-sm text-gray-900">{selectedClinic.parents_count || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data de Criação</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedClinic.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Administrador</label>
                  <p className="text-sm text-gray-900">{selectedClinic.admin_name || 'N/A'}</p>
                </div>
              </div>
              {selectedClinic.suspended_at && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <h4 className="font-medium text-red-800">Informações da Suspensão</h4>
                  <p className="text-sm text-red-700 mt-1">
                    <strong>Data:</strong> {new Date(selectedClinic.suspended_at).toLocaleDateString('pt-BR')}
                  </p>
                  {selectedClinic.suspension_reason && (
                    <p className="text-sm text-red-700 mt-1">
                      <strong>Motivo:</strong> {selectedClinic.suspension_reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Conteúdo do Dashboard
const DashboardContent = ({ metrics, processedRevenueChart, processedGrowthChart, statusChart }) => {
  return (
    <div className="space-y-8">
      {/* Métricas Principais */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <FontAwesomeIcon icon={faChartLine} className="mr-3 text-blue-600" />
          Métricas do Sistema
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total de Clínicas"
            value={metrics.total_clinics || '0'}
            icon={faBuilding}
            colorClass={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
            interpretation={parseInt(metrics.total_clinics || 0) > 20 ? 'good' : 'attention'}
          />
          
          <StatCard
            title="Receita Mensal (MRR)"
            value={`R$ ${parseFloat(metrics.monthly_revenue || 0).toLocaleString('pt-BR')}`}
            icon={faMoneyBillWave}
            colorClass={{ bg: 'bg-green-100', text: 'text-green-600' }}
            interpretation="good"
          />
          
          <StatCard
            title="Total de Usuários"
            value={metrics.total_users || '0'}
            icon={faUsers}
            colorClass={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
          />
          
          <StatCard
            title="Taxa de Inadimplência"
            value={`${safeToFixed(metrics.default_rate, 1)}%`}
            icon={faExclamationTriangle}
            colorClass={{ bg: 'bg-orange-100', text: 'text-orange-600' }}
            interpretation={parseFloat(metrics.default_rate || 0) < 5 ? 'good' : parseFloat(metrics.default_rate || 0) < 15 ? 'attention' : 'critical'}
          />
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Evolução da Receita */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FontAwesomeIcon icon={faArrowTrendUp} className="mr-2 text-green-600" />
            Evolução da Receita
          </h3>
          {processedRevenueChart ? (
            <Line 
              data={processedRevenueChart} 
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                      label: (context) => `R$ ${context.parsed.y.toLocaleString('pt-BR')}`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => `R$ ${value.toLocaleString('pt-BR')}`
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="flex justify-center items-center h-64">
              <FontAwesomeIcon icon={faSpinner} className="text-2xl text-gray-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Status das Clínicas */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FontAwesomeIcon icon={faChartPie} className="mr-2 text-blue-600" />
            Status das Clínicas
          </h3>
          {statusChart ? (
            <Doughnut 
              data={statusChart}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => `${context.label}: ${context.parsed}`
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="flex justify-center items-center h-64">
              <FontAwesomeIcon icon={faSpinner} className="text-2xl text-gray-400 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Crescimento */}
      {processedGrowthChart && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FontAwesomeIcon icon={faUserPlus} className="mr-2 text-purple-600" />
            Crescimento por Mês
          </h3>
          <Bar 
            data={processedGrowthChart}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                }
              },
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

// Conteúdo de Clínicas (continuará no próximo arquivo)
const ClinicsContent = ({ clinics, filters, setFilters, onCreateClinic, onEditLimit, onSuspend, onReactivate, onViewDetails, onDeleteClinic }) => {
  const handleStatusChange = (status) => {
    setFilters({ ...filters, status: status === filters.status ? '' : status });
  };

  const handleSearchChange = (search) => {
    setFilters({ ...filters, search });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return { icon: faCheckCircle, color: 'text-green-500' };
      case 'suspended': return { icon: faExclamationTriangle, color: 'text-red-500' };
      case 'inactive': return { icon: faInfoCircle, color: 'text-gray-500' };
      default: return { icon: faInfoCircle, color: 'text-gray-500' };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'suspended': return 'Suspensa';
      case 'inactive': return 'Inativa';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 lg:mb-0 flex items-center">
          <FontAwesomeIcon icon={faBuilding} className="mr-3 text-blue-600" />
          Gestão de Clínicas
        </h2>
        
        <div className="flex items-center space-x-4">
          {/* Filtros de Status */}
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faFilter} className="text-gray-400" />
            {['active', 'suspended', 'inactive'].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  filters.status === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
          
          {/* Busca */}
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clínicas..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Botão Criar */}
          <button
            onClick={onCreateClinic}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Nova Clínica
          </button>
        </div>
      </div>

      {/* Tabela de Clínicas */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clínica
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pacientes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuários
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Administrador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clinics.map((clinic) => {
                const statusConfig = getStatusIcon(clinic.status);
                return (
                  <tr key={clinic.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{clinic.name}</div>
                        <div className="text-sm text-gray-500">
                          Criada em {new Date(clinic.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={statusConfig.icon} className={`mr-2 ${statusConfig.color}`} />
                        <span className="text-sm font-medium">{getStatusLabel(clinic.status)}</span>
                      </div>
                      {clinic.suspension_reason && (
                        <div className="text-xs text-gray-500 mt-1">
                          {clinic.suspension_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {clinic.patients_count || 0} / {clinic.max_patients}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, ((clinic.patients_count || 0) / clinic.max_patients) * 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div>{(clinic.therapists_count || 0)} terapeutas</div>
                        <div className="text-gray-500">{(clinic.parents_count || 0)} pais</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{clinic.admin_name}</div>
                        <div className="text-sm text-gray-500">@{clinic.admin_username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onEditLimit(clinic)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar limite de pacientes"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        
                        {clinic.status === 'active' ? (
                          <button
                            onClick={() => onSuspend(clinic)}
                            className="text-red-600 hover:text-red-900"
                            title="Suspender clínica"
                          >
                            <FontAwesomeIcon icon={faBan} />
                          </button>
                        ) : (
                          <button
                            onClick={() => onReactivate(clinic.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Reativar clínica"
                          >
                            <FontAwesomeIcon icon={faPlay} />
                          </button>
                        )}
                        
                        <button
                          onClick={() => onViewDetails(clinic)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Ver detalhes"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        
                        <button
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja ELIMINAR permanentemente a clínica "${clinic.name}"?\n\nEsta ação irá:\n- Remover todos os usuários da clínica\n- Remover todos os pacientes e dados associados\n- Remover todas as cobranças\n- Esta ação É IRREVERSÍVEL!`)) {
                              onDeleteClinic(clinic.id);
                            }
                          }}
                          className="text-gray-600 hover:text-red-600"
                          title="Eliminar clínica (IRREVERSÍVEL)"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {clinics.length === 0 && (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faBuilding} className="text-4xl text-gray-400 mb-4" />
            <p className="text-gray-500">Nenhuma clínica encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Conteúdo Financeiro
const FinancialContent = ({ billings, metrics, filters, setFilters, onRecordPayment, onCreateBilling, loadInitialData }) => {
  const handleStatusChange = (status) => {
    setFilters({ ...filters, status: status === filters.status ? '' : status });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'paid': return { bg: 'bg-green-100', text: 'text-green-800', label: 'Pago' };
      case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente' };
      case 'overdue': return { bg: 'bg-red-100', text: 'text-red-800', label: 'Vencida' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Desconhecido' };
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value) || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para mostrar alertas baseados nos dados das cobranças
  const generateAlerts = () => {
    const alerts = {
      suspend_now: [],
      overdue: [],
      due_soon: []
    };

    billings.forEach(bill => {
      const today = new Date();
      const dueDate = new Date(bill.due_date);
      const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (bill.status !== 'paid') {
        if (daysDiff < -10) {
          alerts.suspend_now.push(bill);
        } else if (daysDiff < 0) {
          alerts.overdue.push(bill);
        } else if (daysDiff <= 3) {
          alerts.due_soon.push(bill);
        }
      }
    });

    return alerts;
  };

  const alerts = generateAlerts();
  const hasAlerts = alerts.suspend_now.length > 0 || alerts.overdue.length > 0 || alerts.due_soon.length > 0;

  return (
    <div className="space-y-6">
      {/* Sistema de Alertas */}
      {hasAlerts && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-amber-500" />
            Alertas de Cobrança
          </h3>
          
          {alerts.suspend_now.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">
                ⚠️ Suspender Agora ({alerts.suspend_now.length})
              </h4>
              <p className="text-sm text-red-700 mb-2">
                Clínicas com mais de 10 dias de atraso. Prazo de suspensão atingido.
              </p>
              {alerts.suspend_now.slice(0, 3).map(bill => (
                <div key={bill.id} className="text-sm text-red-600">
                  • {bill.clinic_name} - {formatCurrency(bill.amount)} - Venceu em {formatDate(bill.due_date)}
                </div>
              ))}
              {alerts.suspend_now.length > 3 && (
                <div className="text-sm text-red-600 mt-1">
                  ... e mais {alerts.suspend_now.length - 3} clínicas
                </div>
              )}
            </div>
          )}

          {alerts.overdue.length > 0 && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2">
                🔶 Em Atraso ({alerts.overdue.length})
              </h4>
              <p className="text-sm text-orange-700 mb-2">
                Cobranças vencidas. Monitorar para eventual suspensão.
              </p>
              {alerts.overdue.slice(0, 3).map(bill => (
                <div key={bill.id} className="text-sm text-orange-600">
                  • {bill.clinic_name} - {formatCurrency(bill.amount)} - Venceu em {formatDate(bill.due_date)}
                </div>
              ))}
              {alerts.overdue.length > 3 && (
                <div className="text-sm text-orange-600 mt-1">
                  ... e mais {alerts.overdue.length - 3} clínicas
                </div>
              )}
            </div>
          )}

          {alerts.due_soon.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">
                📅 Vencem em Breve ({alerts.due_soon.length})
              </h4>
              <p className="text-sm text-yellow-700 mb-2">
                Cobranças que vencem nos próximos 3 dias. Acompanhar de perto.
              </p>
              {alerts.due_soon.slice(0, 3).map(bill => (
                <div key={bill.id} className="text-sm text-yellow-600">
                  • {bill.clinic_name} - {formatCurrency(bill.amount)} - Vence em {formatDate(bill.due_date)}
                </div>
              ))}
              {alerts.due_soon.length > 3 && (
                <div className="text-sm text-yellow-600 mt-1">
                  ... e mais {alerts.due_soon.length - 3} clínicas
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modelo de Negócios */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full mr-4">
              <FontAwesomeIcon icon={faUsers} className="text-green-600 text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Modelo de Assinatura ABAplay</h3>
              <p className="text-gray-600">
                <span className="font-bold text-green-600">R$ 34,90</span> por slot contratado • 
                Cobrança mensal pelos slots assinados (independente do uso)
              </p>
              <p className="text-sm text-blue-600 mt-1">
                💡 Clínica assina X slots, paga por X slots mesmo se usar menos
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Exemplo</div>
            <div className="text-lg font-bold text-green-600">
              100 slots = R$ 3.490,00/mês
            </div>
            <div className="text-xs text-gray-500">
              (mesmo usando só 80 pacientes)
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Financeiras */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faDollarSign} className="mr-3 text-green-600" />
            Gestão Financeira
            {hasAlerts && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                {alerts.suspend_now.length + alerts.overdue.length + alerts.due_soon.length} alertas
              </span>
            )}
          </h2>
          <div className="flex space-x-3">
            <button
              onClick={async () => {
                if (window.confirm('Esta ação irá recalcular todas as cobranças pendentes para o modelo por slots contratados.\n\nDeseja continuar?')) {
                  try {
                    const response = await fetch('/api/super-admin/billing/migrate-to-slot-model', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    const result = await response.json();
                    if (result.success) {
                      alert(`Migração concluída!\n\n${result.data.updated_count} cobranças atualizadas\nDiferença total: R$ ${safeToFixed(result.data.difference, 2)}\nVariação: ${result.data.percentage_change}%`);
                      loadInitialData(); // Recarrega dados
                    }
                  } catch (error) {
                    alert('Erro na migração: ' + error.message);
                  }
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg flex items-center text-sm"
            >
              <FontAwesomeIcon icon={faEdit} className="mr-1" />
              Migrar Cobranças
            </button>
            <button
              onClick={onCreateBilling}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Nova Cobrança
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Receita Mensal (MRR)"
            value={formatCurrency(metrics.monthly_revenue || 0)}
            icon={faMoneyBillWave}
            colorClass={{ bg: 'bg-green-100', text: 'text-green-600' }}
            interpretation="good"
          />
          
          <StatCard
            title="Valores Pendentes"
            value={formatCurrency(metrics.pending_amount || 0)}
            icon={faClipboardList}
            colorClass={{ bg: 'bg-yellow-100', text: 'text-yellow-600' }}
          />
          
          <StatCard
            title="Valores Vencidos"
            value={formatCurrency(metrics.overdue_amount || 0)}
            icon={faExclamationTriangle}
            colorClass={{ bg: 'bg-red-100', text: 'text-red-600' }}
            interpretation={parseFloat(metrics.overdue_amount || 0) === 0 ? 'good' : 'critical'}
          />
          
          <StatCard
            title="Taxa Inadimplência"
            value={`${safeToFixed(metrics.default_rate, 1)}%`}
            icon={faChartLine}
            colorClass={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
            interpretation={parseFloat(metrics.default_rate || 0) < 5 ? 'good' : parseFloat(metrics.default_rate || 0) < 15 ? 'attention' : 'critical'}
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faFilter} className="text-gray-400" />
          {['pending', 'overdue', 'paid'].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                filters.status === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {getStatusStyle(status).label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Cobranças */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clínica
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pacientes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Real
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billings.map((billing) => {
                const statusStyle = getStatusStyle(billing.status);
                const isOverdue = new Date(billing.due_date) < new Date() && billing.status === 'pending';
                
                return (
                  <tr key={billing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{billing.clinic_name}</div>
                        <div className="text-sm text-gray-500">
                          {billing.current_patients} pacientes / {billing.max_patients} limite
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(billing.max_patients * 34.90)}
                      </div>
                      <div className="text-xs text-blue-600 font-medium">
                        {billing.max_patients} slots × R$ 34,90
                      </div>
                      {(billing.current_patients || 0) < billing.max_patients && (
                        <div className="text-xs text-gray-500">
                          Usando {billing.current_patients || 0} de {billing.max_patients} slots
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                        {formatDate(billing.due_date)}
                      </div>
                      {billing.payment_date && (
                        <div className="text-xs text-green-600">
                          Pago em {formatDate(billing.payment_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {billing.current_patients || 0}
                        </div>
                        <div className="text-xs text-gray-500">
                          de {billing.max_patients} máx
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ 
                              width: `${Math.min(100, ((billing.current_patients || 0) / billing.max_patients) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-center">
                        <div className="text-sm font-bold text-purple-600">
                          {formatCurrency(billing.max_patients * 34.90)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {billing.max_patients} × R$ 34,90
                        </div>
                        {(billing.max_patients - (billing.current_patients || 0)) > 0 && (
                          <div className="text-xs text-amber-600 font-medium mt-1">
                            +{billing.max_patients - (billing.current_patients || 0)} slots livres
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {billing.status !== 'paid' && (
                          <button
                            onClick={() => onRecordPayment(billing)}
                            className="text-green-600 hover:text-green-900"
                            title="Registrar pagamento"
                          >
                            <FontAwesomeIcon icon={faCreditCard} />
                          </button>
                        )}
                        
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver histórico"
                        >
                          <FontAwesomeIcon icon={faHistory} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {billings.length === 0 && (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faDollarSign} className="text-4xl text-gray-400 mb-4" />
            <p className="text-gray-500">Nenhuma cobrança encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Conteúdo do Calendário
const CalendarContent = ({ billings, onViewBilling, onRecordPayment, onEditDueDate, onCreateBilling }) => {
  return (
    <div className="space-y-6">
      {/* Cabeçalho do Calendário */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <FontAwesomeIcon icon={faCalendarAlt} className="mr-3 text-blue-600" />
          Calendário de Vencimentos
        </h2>
        <button
          onClick={onCreateBilling}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Nova Cobrança
        </button>
      </div>

      {/* Componente do Calendário */}
      <BillingCalendar
        billings={billings}
        onViewBilling={onViewBilling}
        onRecordPayment={onRecordPayment}
        onEditDueDate={onEditDueDate}
      />
    </div>
  );
};

// Componente Enterprise (Business Intelligence)
const EnterpriseContent = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('executive');
  const [enterpriseData, setEnterpriseData] = useState({
    executiveDashboard: null,
    customerHealth: null,
    cohortAnalysis: null,
    churnPrediction: null,
    expansionOpportunities: null,
    executiveReport: null
  });

  useEffect(() => {
    loadEnterpriseData();
  }, []);

  const loadEnterpriseData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [
        executiveDashboard,
        customerHealth,
        cohortAnalysis,
        churnPrediction,
        expansionOpportunities,
        executiveReport
      ] = await Promise.all([
        getExecutiveDashboard().catch(err => ({ data: null, error: err })),
        getCustomerHealth().catch(err => ({ data: null, error: err })),
        getCohortAnalysis().catch(err => ({ data: null, error: err })),
        getChurnPrediction().catch(err => ({ data: null, error: err })),
        getExpansionOpportunities().catch(err => ({ data: null, error: err })),
        getExecutiveReport().catch(err => ({ data: null, error: err }))
      ]);

      setEnterpriseData({
        executiveDashboard: executiveDashboard.data,
        customerHealth: customerHealth.data,
        cohortAnalysis: cohortAnalysis.data,
        churnPrediction: churnPrediction.data,
        expansionOpportunities: expansionOpportunities.data,
        executiveReport: executiveReport.data
      });

    } catch (error) {
      console.error('Erro ao carregar dados empresariais:', error);
      setError('Erro ao carregar dados empresariais. Alguns recursos podem não estar disponíveis.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <FontAwesomeIcon icon={faSpinner} className="text-4xl text-blue-500 animate-spin mr-3" />
        <span className="text-lg">Carregando Business Intelligence...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho Enterprise */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2 flex items-center">
              <FontAwesomeIcon icon={faBrain} className="mr-3" />
              Business Intelligence & Analytics
            </h2>
            <p className="text-blue-100 text-lg">
              Insights avançados para decisões estratégicas baseadas em dados
            </p>
          </div>
          <div className="text-right">
            <div className="text-blue-100 text-sm">Última atualização</div>
            <div className="text-white font-semibold">
              {new Date().toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mr-2" />
            <p className="text-yellow-800">{error}</p>
          </div>
        </div>
      )}

      {/* Navegação de Seções */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'executive', label: 'Dashboard Executivo', icon: faUserTie, color: 'blue' },
              { key: 'health', label: 'Customer Health', icon: faHeartbeat, color: 'green' },
              { key: 'churn', label: 'Análise de Churn', icon: faBullseye, color: 'red' },
              { key: 'growth', label: 'Oportunidades', icon: faRocket, color: 'purple' },
              { key: 'cohort', label: 'Análise de Coortes', icon: faCogs, color: 'orange' }
            ].map((section) => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeSection === section.key
                    ? `border-${section.color}-500 text-${section.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FontAwesomeIcon icon={section.icon} className="mr-2" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Dashboard Executivo */}
          {activeSection === 'executive' && (
            <ExecutiveDashboardSection data={enterpriseData.executiveDashboard} />
          )}

          {/* Customer Health Score */}
          {activeSection === 'health' && (
            <CustomerHealthSection data={enterpriseData.customerHealth} />
          )}

          {/* Análise de Churn */}
          {activeSection === 'churn' && (
            <ChurnAnalysisSection data={enterpriseData.churnPrediction} />
          )}

          {/* Oportunidades de Crescimento */}
          {activeSection === 'growth' && (
            <GrowthOpportunitiesSection data={enterpriseData.expansionOpportunities} />
          )}

          {/* Análise de Coortes */}
          {activeSection === 'cohort' && (
            <CohortAnalysisSection data={enterpriseData.cohortAnalysis} />
          )}
        </div>
      </div>
    </div>
  );
};

// Seção do Dashboard Executivo
const ExecutiveDashboardSection = ({ data }) => {
  if (!data) {
    return (
      <div className="text-center py-12">
        <FontAwesomeIcon icon={faLightbulb} className="text-4xl text-gray-400 mb-4" />
        <p className="text-gray-500">Dados do dashboard executivo não disponíveis.</p>
        <p className="text-gray-400 text-sm mt-2">
          Verifique se o modelo EnterpriseMetricsModel está configurado corretamente.
        </p>
      </div>
    );
  }

  const { financial_kpis, insights } = data;
  // operational_metrics removido pois não é usado

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900">KPIs Executivos</h3>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          C-Level Dashboard
        </span>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="MRR (Monthly Recurring Revenue)"
          value={`R$ ${(financial_kpis?.current_mrr || 0).toLocaleString('pt-BR')}`}
          icon={faMoneyBillWave}
          colorClass={{ bg: 'bg-green-100', text: 'text-green-600' }}
          trend={financial_kpis?.mrr_growth_rate}
          interpretation={financial_kpis?.mrr_growth_rate > 0 ? 'good' : 'attention'}
        />
        
        <StatCard
          title="ARR (Annual Recurring Revenue)"
          value={`R$ ${(financial_kpis?.arr || 0).toLocaleString('pt-BR')}`}
          icon={faChartLine}
          colorClass={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
        />
        
        <StatCard
          title="LTV (Lifetime Value)"
          value={`R$ ${(financial_kpis?.ltv || 0).toLocaleString('pt-BR')}`}
          icon={faMedal}
          colorClass={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
        />
        
        <StatCard
          title="Churn Rate"
          value={`${safeToFixed(financial_kpis?.churn_rate, 1)}%`}
          icon={faExclamationTriangle}
          colorClass={{ bg: 'bg-red-100', text: 'text-red-600' }}
          interpretation={financial_kpis?.churn_rate < 5 ? 'good' : 'critical'}
        />
      </div>

      {/* Insights Estratégicos */}
      {insights && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FontAwesomeIcon icon={faLightbulb} className="mr-2 text-yellow-500" />
            Insights Estratégicos
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h5 className="font-medium text-gray-900 mb-2">Saúde do Negócio</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tendência MRR:</span>
                  <span className={`font-medium ${insights.mrr_trend === 'growing' ? 'text-green-600' : 'text-red-600'}`}>
                    {insights.mrr_trend === 'growing' ? 'Crescendo' : 'Declining'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Receita por Cliente:</span>
                  <span className="font-medium">R$ {safeToFixed(insights.avg_revenue_per_user, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Projeção ARR:</span>
                  <span className="font-medium">R$ {(insights.arr_projection || 0).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h5 className="font-medium text-gray-900 mb-2">Segmentação de Clientes</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Micro:</span>
                  <span className="font-medium">{insights.customer_segments?.micro || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pequeno:</span>
                  <span className="font-medium">{insights.customer_segments?.small || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Médio:</span>
                  <span className="font-medium">{insights.customer_segments?.medium || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Grande:</span>
                  <span className="font-medium">{insights.customer_segments?.large || 0}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h5 className="font-medium text-gray-900 mb-2">Riscos e Oportunidades</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Clientes em Risco:</span>
                  <span className="font-medium text-red-600">{insights.total_customers_at_risk || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Receita em Risco:</span>
                  <span className="font-medium text-red-600">R$ {safeToFixed(insights.revenue_at_risk, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Oportunidades Expansão:</span>
                  <span className="font-medium text-green-600">{insights.expansion_opportunities || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Seção Customer Health Score
const CustomerHealthSection = ({ data }) => {
  if (!data) {
    return (
      <div className="text-center py-12">
        <FontAwesomeIcon icon={faHeartbeat} className="text-4xl text-gray-400 mb-4" />
        <p className="text-gray-500">Dados de Customer Health não disponíveis.</p>
      </div>
    );
  }

  const { summary } = data;
  // customers removido pois não é usado neste contexto

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900">Customer Health Score</h3>
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          Análise Comportamental
        </span>
      </div>

      {/* Resumo da Saúde dos Clientes */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 mr-2" />
              <span className="text-green-800 font-medium">Saudáveis</span>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {summary.healthy_customers || 0}
            </div>
            <div className="text-sm text-green-600">
              Health Score ≥ 80
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500 mr-2" />
              <span className="text-yellow-800 font-medium">Em Risco</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600 mt-2">
              {summary.at_risk_customers || 0}
            </div>
            <div className="text-sm text-yellow-600">
              Health Score &lt; 60
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faUsers} className="text-blue-500 mr-2" />
              <span className="text-blue-800 font-medium">Total Clientes</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              {summary.total_customers || 0}
            </div>
            <div className="text-sm text-blue-600">
              Média: {safeToFixed(summary.avg_health_score, 1)}
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faMoneyBillWave} className="text-purple-500 mr-2" />
              <span className="text-purple-800 font-medium">Receita Total</span>
            </div>
            <div className="text-2xl font-bold text-purple-600 mt-2">
              R$ {(summary.total_revenue || 0).toLocaleString('pt-BR')}
            </div>
            <div className="text-sm text-purple-600">
              Idade média: {Math.round(summary.avg_customer_age || 0)} meses
            </div>
          </div>
        </div>
      )}

      <p className="text-gray-600">
        O Customer Health Score é calculado com base em múltiplos fatores incluindo utilização da plataforma, 
        histórico de pagamentos, engajamento e crescimento do negócio do cliente.
      </p>
    </div>
  );
};

// Seções placeholder para as outras abas
const ChurnAnalysisSection = ({ data }) => {
  if (!data) {
    return (
      <div className="text-center py-12">
        <FontAwesomeIcon icon={faBullseye} className="text-4xl text-gray-400 mb-4" />
        <p className="text-gray-500">Análise Preditiva de Churn</p>
        <p className="text-gray-400 text-sm mt-2">Dados não disponíveis</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900">Análise Preditiva de Churn</h3>
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
          Prevenção de Churn
        </span>
      </div>

      {/* Risk Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="bg-red-100 rounded-full p-3 mr-4">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 text-xl" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-red-900">Alto Risco</h4>
              <p className="text-red-600 text-sm">Ação imediata necessária</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-red-700 mb-2">
            {data.high_risk_count || 0}
          </div>
          <p className="text-red-600 text-sm">
            clínicas em risco crítico
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="bg-yellow-100 rounded-full p-3 mr-4">
              <FontAwesomeIcon icon={faExclamationCircle} className="text-yellow-600 text-xl" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-yellow-900">Médio Risco</h4>
              <p className="text-yellow-600 text-sm">Monitoramento ativo</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-yellow-700 mb-2">
            {data.medium_risk_count || 0}
          </div>
          <p className="text-yellow-600 text-sm">
            clínicas para acompanhar
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 rounded-full p-3 mr-4">
              <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 text-xl" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-green-900">Baixo Risco</h4>
              <p className="text-green-600 text-sm">Clientes saudáveis</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-700 mb-2">
            {data.low_risk_count || 0}
          </div>
          <p className="text-green-600 text-sm">
            clínicas estáveis
          </p>
        </div>
      </div>

      {/* Churn Factors */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Principais Fatores de Churn
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-gray-700">Inadimplência prolongada</span>
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
              Alto impacto
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-gray-700">Baixa utilização da plataforma</span>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
              Médio impacto
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-gray-700">Ausência de crescimento</span>
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">
              Médio impacto
            </span>
          </div>
        </div>
      </div>

      {/* Action Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
          <FontAwesomeIcon icon={faLightbulb} className="mr-2" />
          Recomendações de Ação
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded border">
            <h5 className="font-medium text-gray-900 mb-2">Contato Proativo</h5>
            <p className="text-sm text-gray-600">
              Entre em contato com clínicas de alto risco para entender dificuldades
            </p>
          </div>
          <div className="bg-white p-4 rounded border">
            <h5 className="font-medium text-gray-900 mb-2">Ofertas Personalizadas</h5>
            <p className="text-sm text-gray-600">
              Crie planos especiais para clientes em risco médio
            </p>
          </div>
          <div className="bg-white p-4 rounded border">
            <h5 className="font-medium text-gray-900 mb-2">Treinamento & Suporte</h5>
            <p className="text-sm text-gray-600">
              Ofereça sessões de treinamento para melhorar a adoção
            </p>
          </div>
          <div className="bg-white p-4 rounded border">
            <h5 className="font-medium text-gray-900 mb-2">Monitoramento Contínuo</h5>
            <p className="text-sm text-gray-600">
              Acompanhe métricas de uso e engagement regularmente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const GrowthOpportunitiesSection = ({ data }) => {
  if (!data) {
    return (
      <div className="text-center py-12">
        <FontAwesomeIcon icon={faRocket} className="text-4xl text-gray-400 mb-4" />
        <p className="text-gray-500">Oportunidades de Crescimento</p>
        <p className="text-gray-400 text-sm mt-2">Dados não disponíveis</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900">Oportunidades de Crescimento</h3>
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          Expansão de Receita
        </span>
      </div>

      {/* Growth Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 rounded-full p-3">
              <FontAwesomeIcon icon={faArrowTrendUp} className="text-blue-600 text-xl" />
            </div>
            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
              Expansão
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-700 mb-1">
            R$ {safeToFixed((data.expansion_potential || 0) / 1000, 1)}K
          </div>
          <p className="text-blue-600 text-sm">
            Receita potencial de expansão
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <FontAwesomeIcon icon={faUserPlus} className="text-green-600 text-xl" />
            </div>
            <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
              Pronto
            </span>
          </div>
          <div className="text-2xl font-bold text-green-700 mb-1">
            {data.ready_for_expansion || 0}
          </div>
          <p className="text-green-600 text-sm">
            Clientes prontos para expansão
          </p>
        </div>
      </div>

      {/* Top Expansion Candidates */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2 text-green-600" />
          Principais Candidatos à Expansão
        </h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div>
              <h5 className="font-medium text-gray-900">Clínicas com Alta Utilização</h5>
              <p className="text-sm text-gray-600">Utilizando &gt; 85% dos slots contratados</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{data.high_utilization_clinics || 0}</div>
              <p className="text-sm text-green-600">clínicas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expansion Strategies */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FontAwesomeIcon icon={faRocket} className="mr-2 text-blue-600" />
          Estratégias de Expansão Recomendadas
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h5 className="font-medium text-gray-900 mb-3">Outreach Proativo</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Contatar clínicas com alta utilização</li>
              <li>• Oferecer consulta gratuita de expansão</li>
              <li>• Demonstrar ROI de slots adicionais</li>
            </ul>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h5 className="font-medium text-gray-900 mb-3">Incentivos de Upgrades</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Desconto de 15% no primeiro mês</li>
              <li>• Período de teste de 30 dias</li>
              <li>• Suporte premium incluído</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const CohortAnalysisSection = ({ data }) => {
  if (!data) {
    return (
      <div className="text-center py-12">
        <FontAwesomeIcon icon={faCogs} className="text-4xl text-gray-400 mb-4" />
        <p className="text-gray-500">Análise de Coortes</p>
        <p className="text-gray-400 text-sm mt-2">Dados não disponíveis</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900">Análise de Coortes</h3>
        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
          Retenção de Clientes
        </span>
      </div>

      {/* Cohort Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-blue-900">Taxa de Retenção Global</h4>
            <FontAwesomeIcon icon={faUsers} className="text-blue-600 text-xl" />
          </div>
          <div className="text-3xl font-bold text-blue-700 mb-2">
            {safeToFixed((data.global_retention_rate || 0) * 100, 1)}%
          </div>
          <p className="text-blue-600 text-sm">
            Clientes ativos após 12 meses
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-green-900">Melhor Coorte</h4>
            <FontAwesomeIcon icon={faTrophy} className="text-green-600 text-xl" />
          </div>
          <div className="text-3xl font-bold text-green-700 mb-2">
            {data.best_cohort_period || 'Jun/24'}
          </div>
          <p className="text-green-600 text-sm">
            {safeToFixed((data.best_cohort_retention || 0) * 100, 1)}% de retenção
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-orange-900">Tendência</h4>
            <FontAwesomeIcon icon={faChartLine} className="text-orange-600 text-xl" />
          </div>
          <div className="text-3xl font-bold text-orange-700 mb-2">
            +{safeToFixed((data.retention_trend || 0) * 100, 1)}%
          </div>
          <p className="text-orange-600 text-sm">
            Melhoria últimos 3 meses
          </p>
        </div>
      </div>

      {/* Cohort Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FontAwesomeIcon icon={faTable} className="mr-2 text-purple-600" />
          Matriz de Retenção por Coorte
        </h4>
        
        {/* Simplified Cohort Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 text-gray-600">Período</th>
                <th className="text-center p-3 text-gray-600">Novos Clientes</th>
                <th className="text-center p-3 text-gray-600">Mês 1</th>
                <th className="text-center p-3 text-gray-600">Mês 3</th>
                <th className="text-center p-3 text-gray-600">Mês 6</th>
                <th className="text-center p-3 text-gray-600">Mês 12</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              <tr className="border-b border-gray-100">
                <td className="p-3 font-medium">Jan/24</td>
                <td className="text-center p-3">15</td>
                <td className="text-center p-3">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">93%</span>
                </td>
                <td className="text-center p-3">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">87%</span>
                </td>
                <td className="text-center p-3">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">73%</span>
                </td>
                <td className="text-center p-3">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">67%</span>
                </td>
              </tr>
              
              <tr className="border-b border-gray-100">
                <td className="p-3 font-medium">Jun/24</td>
                <td className="text-center p-3">23</td>
                <td className="text-center p-3">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">96%</span>
                </td>
                <td className="text-center p-3">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">91%</span>
                </td>
                <td className="text-center p-3">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">87%</span>
                </td>
                <td className="text-center p-3">
                  <span className="text-gray-400">-</span>
                </td>
              </tr>
              
              <tr className="border-b border-gray-100">
                <td className="p-3 font-medium">Set/24</td>
                <td className="text-center p-3">18</td>
                <td className="text-center p-3">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">89%</span>
                </td>
                <td className="text-center p-3">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">78%</span>
                </td>
                <td className="text-center p-3">
                  <span className="text-gray-400">-</span>
                </td>
                <td className="text-center p-3">
                  <span className="text-gray-400">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights and Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <FontAwesomeIcon icon={faLightbulb} className="mr-2" />
            Insights de Retenção
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-start">
              <div className="bg-green-100 rounded-full p-1 mr-3 mt-1">
                <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 text-xs" />
              </div>
              <p className="text-blue-800">
                Clientes do primeiro semestre apresentam maior taxa de retenção a longo prazo
              </p>
            </div>
            <div className="flex items-start">
              <div className="bg-yellow-100 rounded-full p-1 mr-3 mt-1">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 text-xs" />
              </div>
              <p className="text-blue-800">
                Período crítico de churn ocorre entre o 3º e 6º mês
              </p>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 rounded-full p-1 mr-3 mt-1">
                <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 text-xs" />
              </div>
              <p className="text-blue-800">
                Coortes recentes mostram tendência de melhora na retenção inicial
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
            <FontAwesomeIcon icon={faBullseye} className="mr-2" />
            Ações Recomendadas
          </h4>
          <div className="space-y-3">
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-1">Programa de Onboarding</h5>
              <p className="text-sm text-gray-600">
                Fortalecer processo de integração nos primeiros 90 dias
              </p>
            </div>
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-1">Check-ins Proativos</h5>
              <p className="text-sm text-gray-600">
                Agendar reuniões no 3º e 6º mês para identificar problemas
              </p>
            </div>
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-900 mb-1">Programa de Fidelidade</h5>
              <p className="text-sm text-gray-600">
                Criar incentivos para clientes que completam 12 meses
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminPage;