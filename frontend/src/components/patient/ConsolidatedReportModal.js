import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner, faChartLine, faMagic, faUserMd, faEdit, faEye } from '@fortawesome/free-solid-svg-icons';
import { usePatients } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
// A importação do usePrograms não é mais necessária.
// A importação generateConsolidatedReportPDF foi movida para o componente de preview
import DateRangeSelector from '../shared/DateRangeSelector';
import { getLegendLevels } from '../../utils/promptLevelColors';
import SuggestionPreviewModal from '../shared/SuggestionPreviewModal';
import ProfessionalDataModal from '../shared/ProfessionalDataModal';
import RichTextEditor from '../shared/RichTextEditor';
import ReportMetrics from '../shared/ReportMetrics';
import ConsolidatedReportPreview from '../shared/ConsolidatedReportPreview';
import reportPreFillService from '../../services/reportPreFillService';
import { Line } from 'react-chartjs-2';
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
} from 'chart.js';

// Regista os componentes do Chart.js que vamos usar
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Função auxiliar para formatar a data
const formatDate = (dateString, format = 'long') => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    const options = format === 'short' 
        ? { day: '2-digit', month: '2-digit' } 
        : { day: '2-digit', month: '2-digit', year: 'numeric' };
    return adjustedDate.toLocaleDateString('pt-BR', options);
};

// <<< NOVO COMPONENTE PARA O GRÁFICO DE PRÉ-VISUALIZAÇÃO >>>
const ReportChart = ({ program, sessionData }) => {
    const programSessionData = (sessionData || [])
      .filter(session => session.program_id === program.program_id);
      // Dados já vêm ordenados do backend

    if (programSessionData.length === 0) {
        return null; // Não renderiza nada se não houver dados
    }

    const chartData = {
        labels: programSessionData.map(session => formatDate(session.session_date, 'short')),
        datasets: [{
            label: 'Pontuação (%)',
            data: programSessionData.map(session => session.score),
            borderColor: '#4f46e5',
            backgroundColor: (context) => {
                const chart = context.chart;
                const {ctx, chartArea} = chart;
                if (!chartArea) return 'rgba(79, 70, 229, 0.1)';
                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
                gradient.addColorStop(0.5, 'rgba(79, 70, 229, 0.2)');
                gradient.addColorStop(1, 'rgba(67, 56, 202, 0.1)');
                return gradient;
            },
            borderWidth: 2.5,
            pointRadius: programSessionData.map(session => {
              // Linha de base = estrela maior
              return session.is_baseline ? 6 : 5;
            }),
            pointBackgroundColor: programSessionData.map(session => {
              // Prioridade: Linha de base > Nível de prompting > Padrão
              if (session.is_baseline) {
                return '#f59e0b'; // Amarelo para linha de base
              } else if (session.details?.promptLevelColor) {
                return session.details.promptLevelColor; // Cor específica do nível de prompting
              } else {
                return '#4f46e5'; // Cor padrão (azul)
              }
            }),
            pointBorderColor: programSessionData.map(session => {
              // Linha de base = borda amarela mais grossa
              return session.is_baseline ? '#f59e0b' : '#ffffff';
            }),
            pointBorderWidth: programSessionData.map(session => {
              // Linha de base = borda mais grossa para efeito estrela
              return session.is_baseline ? 3 : 2;
            }),
            pointStyle: programSessionData.map(session => {
              // Linha de base = estrela, outros = círculo
              return session.is_baseline ? 'star' : 'circle';
            }),
            pointHoverRadius: 7,
            pointHoverBorderWidth: 3,
            fill: true,
            tension: 0.4,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        scales: { 
            y: { 
                display: true,
                beginAtZero: true, 
                max: 105,
                grid: {
                    display: true,
                    color: 'rgba(156, 163, 175, 0.2)',
                    drawBorder: false,
                },
                ticks: { 
                    font: { size: 10, weight: 500 },
                    color: '#6b7280',
                    callback: (value) => value + '%'
                },
                border: {
                    display: false
                }
            }, 
            x: { 
                display: true,
                grid: {
                    display: true,
                    color: 'rgba(156, 163, 175, 0.2)',
                    drawBorder: false,
                },
                ticks: { 
                    font: { size: 10, weight: 500 },
                    color: '#6b7280'
                },
                border: {
                    display: false
                }
            } 
        },
        plugins: { 
            legend: { display: false },
            tooltip: {
                enabled: false
            } 
        }
    };
    
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 px-4 py-3">
                <h5 className="text-sm font-semibold text-gray-800 text-center">{program.program_name}</h5>
                <p className="text-xs text-indigo-600 text-center mt-1">{program.discipline_name}</p>
            </div>
            <div className="p-4">
                <div className="w-full h-56 relative bg-gradient-to-br from-gray-50 to-indigo-50 rounded-lg p-2">
                    <Line options={chartOptions} data={chartData} />
                </div>
                
                {/* Legenda de cores dos níveis de prompting */}
                <div className="mt-3 bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <div className="mb-2">
                        <h6 className="text-xs font-medium text-gray-700 mb-1">Níveis de Prompting:</h6>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {getLegendLevels().map(level => (
                                <div key={level.id} className="flex items-center space-x-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: level.hex }}></div>
                                    <span className="text-gray-600">{level.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-1">
                        <div className="flex flex-wrap gap-3 text-xs">
                            <div className="flex items-center space-x-1">
                                <span className="text-amber-500 text-sm">⭐</span>
                                <span className="text-gray-600">Linha de Base</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                <span className="text-gray-600">Sessão Regular</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const ConsolidatedReportModal = ({ isOpen, onClose }) => {
  const { selectedPatient, refreshAndReselectPatient } = usePatients();
  const { user, updateUser } = useAuth();
  // A chamada a usePrograms() foi removida.

  const [reportText, setReportText] = useState('');
  const [error, setError] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Estados para funcionalidade de pré-preenchimento
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestedText, setSuggestedText] = useState('');
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  
  // Estados para dados profissionais
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [professionalData, setProfessionalData] = useState(null);
  const [needsProfessionalData, setNeedsProfessionalData] = useState(false);
  
  // Estados para pré-visualização
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReportText('');
      setStartDate('');
      setEndDate('');
      setError('');
      setSuggestedText('');
      setSuggestionError('');
      setShowSuggestionModal(false);
      setShowPreview(false);
      
      // Validação mais rigorosa dos dados profissionais
      if (user) {
        const hasValidProfessionalId = user.professional_id && user.professional_id.trim().length > 0;
        const hasValidQualifications = user.qualifications && user.qualifications.trim().length > 0;
        const needsData = !hasValidProfessionalId || !hasValidQualifications;

        setNeedsProfessionalData(needsData);

        if (!needsData) {
          setProfessionalData({
            professional_id: user.professional_id.trim(),
            qualifications: user.qualifications.trim(),
            professional_signature: user.professional_signature?.trim() || ''
          });
        } else {
          // Limpar dados profissionais se inválidos
          setProfessionalData(null);
        }
      }
    }
  }, [isOpen, user]);

  const filteredSessionData = useMemo(() => {
    if (!selectedPatient?.sessionData) return [];
    const start = startDate ? new Date(startDate + 'T00:00:00') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59') : null;
    return (selectedPatient.sessionData || []).filter(session => {
        const sessionDate = new Date(session.session_date);
        if (start && sessionDate < start) return false;
        if (end && sessionDate > end) return false;
        return true;
      });
  }, [selectedPatient, startDate, endDate]);

  // CORREÇÃO: A lógica agora usa diretamente os dados do paciente selecionado.
  const assignedPrograms = useMemo(() => {
    if (!selectedPatient?.assigned_programs) return [];
    return selectedPatient.assigned_programs;
  }, [selectedPatient]);


  const handlePreview = () => {
    if (!selectedPatient || !reportText.trim() || needsProfessionalData) return;
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  const handleUpdateReportText = (newText) => {
    setReportText(newText);
  };
  
  const clearFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  // Função para gerar sugestão de texto
  const handleGenerateSuggestion = async () => {
    if (!selectedPatient) return;
    
    setIsGeneratingSuggestion(true);
    setSuggestionError('');
    
    try {
      const periodOptions = {
        startDate: startDate || null,
        endDate: endDate || null
      };
      
      const suggestion = await reportPreFillService.generateConventionalReportSuggestion(
        selectedPatient.id,
        filteredSessionData,
        periodOptions
      );
      
      setSuggestedText(suggestion);
      setShowSuggestionModal(true);
      
    } catch (err) {
      console.error('Erro ao gerar sugestão:', err);
      setSuggestionError(err.message || 'Erro ao gerar sugestão de texto.');
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  // Função para usar sugestão (substituir texto atual)
  const handleUseSuggestion = (suggestion) => {
    setReportText(suggestion);
  };

  // Função para adicionar sugestão ao texto existente
  const handleAppendSuggestion = (combinedText) => {
    setReportText(combinedText);
  };

  // Função para fechar modal de sugestão
  const handleCloseSuggestionModal = () => {
    setShowSuggestionModal(false);
    setSuggestedText('');
    setSuggestionError('');
  };
  
  // Função para abrir modal de dados profissionais
  const handleOpenProfessionalModal = () => {
    setShowProfessionalModal(true);
  };
  
  // Função para salvar dados profissionais
  const handleSaveProfessionalData = async (data, error = null) => {
    if (error) {
      // Em caso de erro, manter a necessidade de dados profissionais
      console.error('Erro ao salvar dados profissionais:', error);
      setNeedsProfessionalData(true);
      // Modal permanece aberto para nova tentativa
      return;
    }

    if (data) {
      setProfessionalData(data);
      setNeedsProfessionalData(false);
      setShowProfessionalModal(false);

      // Atualizar dados do usuário no contexto para persistir entre sessões
      updateUser({
        professional_id: data.professional_id,
        qualifications: data.qualifications,
        professional_signature: data.professional_signature
      });

      // Re-selecionar paciente após atualização para manter sincronização
      if (refreshAndReselectPatient && selectedPatient) {
        try {
          await refreshAndReselectPatient(selectedPatient.id);
        } catch (err) {
          console.warn('Aviso: Não foi possível re-selecionar paciente:', err);
        }
      }
    }
  };

  if (!isOpen || !selectedPatient) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            Gerar Relatório Consolidado para: <span className="text-indigo-600">{selectedPatient.name}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={faTimes} className="text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Seção de dados profissionais */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-indigo-800 flex items-center">
                  <FontAwesomeIcon icon={faUserMd} className="mr-2" />
                  Dados Profissionais
                </h3>
                <button
                  onClick={handleOpenProfessionalModal}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center transition-colors"
                >
                  <FontAwesomeIcon icon={faEdit} className="mr-1" />
                  {needsProfessionalData ? 'Configurar' : 'Editar'}
                </button>
              </div>
              
              {needsProfessionalData ? (
                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠️ É necessário configurar seus dados profissionais antes de gerar o relatório.
                </div>
              ) : professionalData ? (
                <div className="text-sm text-indigo-700 space-y-1">
                  <p><strong>Nome:</strong> {user?.full_name || user?.name}</p>
                  <p><strong>Registro:</strong> {professionalData.professional_id}</p>
                  <p><strong>Qualificações:</strong> {professionalData.qualifications}</p>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Carregando dados profissionais...
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Período do Relatório</label>
              <DateRangeSelector
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onClear={clearFilter}
                showInfo={false}
              />
              <p className="text-xs text-gray-500 mt-2">Padrão: último mês. Limpe os filtros para incluir todos os dados.</p>
            </div>
            
            {/* Layout responsivo para editor e métricas */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Editor de texto (3/4 no desktop, full no mobile) */}
              <div className="lg:col-span-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <label className="block text-sm font-medium text-gray-700">Análise e Observações do Terapeuta</label>
                  <button
                    onClick={handleGenerateSuggestion}
                    disabled={isGeneratingSuggestion || !selectedPatient || needsProfessionalData}
                    className="flex items-center px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium rounded-md transition duration-150 ease-in-out shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FontAwesomeIcon 
                      icon={isGeneratingSuggestion ? faSpinner : faMagic} 
                      className={`mr-1.5 ${isGeneratingSuggestion ? 'fa-spin' : ''}`} 
                    />
                    {isGeneratingSuggestion ? 'Gerando...' : 'Sugerir Texto'}
                  </button>
                </div>
                
                <div className="mb-3 space-y-2">
                  <p className="text-xs text-gray-500">
                    Este texto será incluído no início do relatório em PDF. Use o botão "Sugerir Texto" para gerar automaticamente uma análise baseada nos dados do paciente.
                    <span className="hidden sm:inline"> Melhor experiência em desktop para formatação avançada.</span>
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                    <p className="text-xs text-amber-800">
                      <strong>⚠️ Responsabilidade Profissional:</strong> A sugestão automática é baseada apenas em métricas quantitativas. 
                      É <strong>imprescindível</strong> que o terapeuta revise, adapte e complemente o texto com sua análise clínica qualitativa, 
                      considerando aspectos comportamentais, contextuais e individuais do paciente que não são capturados pelos dados numéricos.
                    </p>
                  </div>
                </div>
                
                {/* Mostrar erro de sugestão se houver */}
                {suggestionError && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-600">{suggestionError}</p>
                  </div>
                )}
                
                <RichTextEditor
                  value={reportText}
                  onChange={setReportText}
                  placeholder="Escreva aqui a sua análise qualitativa ou use o botão 'Sugerir Texto' para gerar automaticamente..."
                  rows={8}
                  disabled={needsProfessionalData}
                />
              </div>
              
              {/* Métricas (1/4 no desktop, full no mobile) */}
              <div className="lg:col-span-1">
                <ReportMetrics
                  sessionData={filteredSessionData}
                  startDate={startDate}
                  endDate={endDate}
                  assignedPrograms={assignedPrograms}
                  className="sticky top-4"
                />
              </div>
            </div>

          {/* <<< NOVA SECÇÃO DE PRÉ-VISUALIZAÇÃO DOS GRÁFICOS >>> */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <FontAwesomeIcon icon={faChartLine} className="mr-3 text-indigo-500" />
                Pré-visualização do Progresso no Período
            </h3>
            <div className="space-y-4">
              {assignedPrograms.length > 0 ? (
                (() => {
                  // Agrupa programas por disciplina (área)
                  const programsByArea = assignedPrograms.reduce((acc, program) => {
                    const areaKey = program.discipline_name;
                    if (!acc[areaKey]) {
                      acc[areaKey] = [];
                    }
                    acc[areaKey].push(program);
                    return acc;
                  }, {});
                  
                  // Ordena áreas alfabeticamente (igual ao PDF)
                  const sortedAreas = Object.keys(programsByArea).sort();
                  
                  return sortedAreas.map(areaName => (
                    <div key={areaName}>
                      {/* Cabeçalho da área */}
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3 mb-3">
                        <h4 className="text-sm font-semibold text-indigo-800">{areaName}</h4>
                      </div>
                      
                      {/* Gráficos da área */}
                      <div className="space-y-3 mb-6">
                        {programsByArea[areaName].map(program => (
                          <ReportChart 
                            key={program.program_id} 
                            program={program} 
                            sessionData={filteredSessionData} 
                          />
                        ))}
                      </div>
                    </div>
                  ));
                })()
              ) : (
                <p className="text-center text-gray-500 py-4">Nenhum programa para exibir.</p>
              )}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 mt-auto">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handlePreview}
            disabled={needsProfessionalData || !reportText.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md text-sm transition duration-150 ease-in-out shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 flex items-center space-x-2"
          >
            <FontAwesomeIcon icon={faEye} />
            <span>
              {needsProfessionalData 
                ? 'Configure Dados Profissionais' 
                : !reportText.trim() 
                  ? 'Adicione Texto para Visualizar'
                  : 'Visualizar PDF'
              }
            </span>
          </button>
        </div>
      </div>
      
      {/* Modal de Sugestão */}
      <SuggestionPreviewModal
        isOpen={showSuggestionModal}
        onClose={handleCloseSuggestionModal}
        suggestedText={suggestedText}
        currentText={reportText}
        onUseSuggestion={handleUseSuggestion}
        onAppendSuggestion={handleAppendSuggestion}
        isGenerating={isGeneratingSuggestion}
      />
      
      {/* Modal de Dados Profissionais */}
      <ProfessionalDataModal
        isOpen={showProfessionalModal}
        onClose={() => setShowProfessionalModal(false)}
        onSave={handleSaveProfessionalData}
        currentUser={user}
        title="Configurar Dados Profissionais para Relatório"
      />
      
      {/* Modal de Pré-visualização */}
      <ConsolidatedReportPreview
        isOpen={showPreview}
        onClose={handleClosePreview}
        patientData={selectedPatient}
        reportText={reportText}
        professionalData={professionalData ? {
          ...professionalData,
          professional_name: user?.full_name || user?.name || 'Profissional'
        } : null}
        sessionData={filteredSessionData}
        assignedPrograms={assignedPrograms}
        onUpdateReportText={handleUpdateReportText}
      />
    </div>
  );
};

export default ConsolidatedReportModal;
