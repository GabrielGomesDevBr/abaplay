import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faSpinner,
  faCheck,
  faBullseye,
  faChartLine,
  faInfoCircle,
  faChevronDown,
  faChevronUp,
  faDumbbell,
  faBox,
  faListOl,
  faTrophy
} from '@fortawesome/free-solid-svg-icons';
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
import annotationPlugin from 'chartjs-plugin-annotation';
import { recordProgress, getAssignmentEvolution } from '../../api/programApi';
import { useAuth } from '../../context/AuthContext';
import { usePatients } from '../../context/PatientContext';
import PromptLevelSelector from './PromptLevelSelector';
import Toast from '../shared/Toast';

// Opções para Modalidade de Ensino
const TEACHING_MODALITIES = [
  { value: 'dtt', label: 'DTT (Discrete Trial Training)', description: 'Tentativas Discretas' },
  { value: 'net', label: 'NET (Natural Environment Teaching)', description: 'Ensino no Ambiente Natural' },
  { value: 'incidental', label: 'Incidental Teaching', description: 'Ensino Incidental' },
  { value: 'structured_play', label: 'Structured Play', description: 'Brincadeira Estruturada' },
  { value: 'group_instruction', label: 'Group Instruction', description: 'Instrução em Grupo' }
];



ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

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

const SessionProgress = ({ program, assignment }) => {
  const { user } = useAuth();
  const { selectedPatient, getPromptLevelForProgram, setPromptLevelForProgram } = usePatients();
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [attempts, setAttempts] = useState(program?.trials || program?.default_trials || '');
  const [successes, setSuccesses] = useState('');
  const [notes, setNotes] = useState('');
  const [isBaseline, setIsBaseline] = useState(false);
  const [teachingModality, setTeachingModality] = useState('');
  
  // Nível de prompting - SEMPRE carregado do banco (sem cache)
  const [promptLevel, setPromptLevel] = useState(null); // null = ainda carregando
  const [isLoadingPromptLevel, setIsLoadingPromptLevel] = useState(true);
  const [isSavingPromptLevel, setIsSavingPromptLevel] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'

  // Estados para Toast
  const [toast, setToast] = useState(null);

  // Timer para debounce
  const debounceTimer = useRef(null);

  // Carrega o nível de prompting SEMPRE do banco de dados
  useEffect(() => {
    const loadPromptLevel = async () => {
      if (selectedPatient && program) {
        const programId = program.program_id || program.id;
        if (programId) {
          setIsLoadingPromptLevel(true);
          try {
            console.log(`[SESSION-PROGRESS] Carregando prompt level para paciente ${selectedPatient.id}, programa ${programId}`);
            const level = await getPromptLevelForProgram(selectedPatient.id, programId);

            setPromptLevel(level);
            console.log(`[SESSION-PROGRESS] Prompt level carregado: ${level}`);
          } catch (error) {
            console.error(`[SESSION-PROGRESS] Erro ao carregar prompt level:`, error);
            setPromptLevel(5); // Fallback para independente apenas em caso de erro
          } finally {
            setIsLoadingPromptLevel(false);
          }
        }
      }
    };

    loadPromptLevel();
  }, [selectedPatient, program, getPromptLevelForProgram]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [evolutionData, setEvolutionData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Estados para controlar expansão das seções do protocolo
  const [expandedSections, setExpandedSections] = useState({
    objective: true,      // Objetivo sempre expandido por padrão
    skill: false,         // Habilidade
    materials: false,     // Materiais
    procedure: false,     // Procedimento
    advancement: false    // Critério de Avanço
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const procedureSteps = useMemo(() => {
    if (!program?.procedure) return [];
    try {
      return typeof program.procedure === 'string'
        ? JSON.parse(program.procedure)
        : program.procedure;
    } catch (e) {
      // Falha ao analisar o 'procedure' do programa
      return [];
    }
  }, [program]);

  const fetchEvolutionHistory = useCallback(async () => {
    if (!assignment?.assignment_id) return;
    setIsLoadingHistory(true);
    try {
      const history = await getAssignmentEvolution(assignment.assignment_id);
      const validHistory = Array.isArray(history) ? history : [];

      // Filtrar últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const filteredHistory = validHistory.filter(session => {
        const sessionDate = new Date(session.session_date);
        return sessionDate >= thirtyDaysAgo;
      });

      // Backend já retorna ordenado por data ascendente
      setEvolutionData(filteredHistory);
    } catch (err) {
      setError('Não foi possível carregar o histórico de progresso.');
      // Erro ao carregar histórico
    } finally {
      setIsLoadingHistory(false);
    }
  }, [assignment]);

  // Função auxiliar para mostrar toast
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  // Função para fechar toast
  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  // Função interna que realmente salva (usada pelo debounce)
  const savePromptLevelInternal = useCallback(async (newLevel) => {
    const programId = program?.program_id || program?.id;
    const assignmentId = assignment?.assignment_id || assignment?.id;

    if (!selectedPatient || !program || !programId || !assignmentId) {
      console.error('[SessionProgress] Dados insuficientes para atualizar o nível de prompt.');
      showToast('error', 'Dados insuficientes para salvar o nível de prompting.');
      setIsSavingPromptLevel(false);
      setSaveStatus(null);
      return;
    }

    setIsSavingPromptLevel(true);
    setSaveStatus('saving');

    try {
      const result = await setPromptLevelForProgram(selectedPatient.id, programId, newLevel, assignmentId);

      if (result && result.success) {
        // Sucesso! Mostra badge "Salvo!" e toast verde
        setSaveStatus('saved');
        showToast('success', 'Nível de prompting alterado com sucesso!');

        // Remove badge "Salvo!" após 1 segundo
        setTimeout(() => {
          setSaveStatus(null);
        }, 1000);
      } else if (result && result.reason === 'locked') {
        // Operação já em andamento - estado raro mas possível
        setSaveStatus(null);
        showToast('info', 'Aguarde... salvamento em andamento.');
      } else {
        // Erro genérico
        setSaveStatus('error');
        showToast('error', result?.error || 'Erro ao salvar o nível de prompting. Tente novamente.');

        // Remove badge de erro após 2 segundos
        setTimeout(() => {
          setSaveStatus(null);
        }, 2000);
      }
    } catch (error) {
      console.error(`[SessionProgress] Falha ao salvar o nível de prompt:`, error);
      setSaveStatus('error');
      showToast('error', 'Erro ao salvar. Verifique sua conexão e tente novamente.');

      // Remove badge de erro após 2 segundos
      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    } finally {
      setIsSavingPromptLevel(false);
    }
  }, [selectedPatient, program, assignment, setPromptLevelForProgram, showToast]);

  // Função para atualizar o nível de prompting - COM DEBOUNCE
  const handlePromptLevelChange = useCallback((newLevel) => {
    const programId = program?.program_id || program?.id;
    const assignmentId = assignment?.assignment_id || assignment?.id;

    if (!selectedPatient || !program || !programId || !assignmentId) {
      console.error('[SessionProgress] Dados insuficientes para atualizar o nível de prompt.');
      return;
    }

    // Atualiza a UI imediatamente para feedback rápido (Atualização Otimista)
    setPromptLevel(newLevel);

    // Cancela o timer anterior se existir
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Configura novo timer com debounce de 500ms
    debounceTimer.current = setTimeout(() => {
      savePromptLevelInternal(newLevel);
    }, 500);
  }, [selectedPatient, program, assignment, savePromptLevelInternal]);

  // Cleanup do debounce ao desmontar
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!program || !assignment) {
      // Limpa os dados quando nenhum programa é selecionado
      setEvolutionData([]);
      setIsLoadingHistory(false);
      return;
    }
    
    fetchEvolutionHistory();
    setAttempts(program.trials || program.default_trials || '');

    // Nível de prompting é carregado pelo useEffect dedicado acima
    // Removido para evitar conflitos - busca sempre do banco
  }, [program, assignment, fetchEvolutionHistory, procedureSteps, selectedPatient, getPromptLevelForProgram]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAttempts = parseInt(attempts, 10);
    const numSuccesses = parseInt(successes, 10);

    if (isNaN(numAttempts) || numAttempts <= 0) {
      setError('O número de tentativas é inválido.');
      return;
    }
    if (isNaN(numSuccesses) || numSuccesses < 0 || numSuccesses > numAttempts) {
      setError(`O número de acertos deve ser entre 0 e ${numAttempts}.`);
      return;
    }
    if (!teachingModality) {
      setError('Por favor, selecione uma modalidade de ensino.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    setSaveSuccess(false);
    
    const score = (numAttempts > 0) ? (numSuccesses / numAttempts) * 100 : 0;
    
    const evolutionPayload = {
      assignment_id: assignment.assignment_id,
      step_id: null,
      session_date: sessionDate,
      attempts: numAttempts,
      successes: numSuccesses,
      score: parseFloat(score.toFixed(2)),
      details: {
        notes: notes,
        isBaseline: isBaseline,
        promptLevel: promptLevel,
        teachingModality: teachingModality,
      },
    };

    try {
        await recordProgress(evolutionPayload);
        setSuccesses('');
        setNotes('');
        setIsBaseline(false);
        setTeachingModality('');
        setSaveSuccess(true);
        fetchEvolutionHistory();
        setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
        setError(err.response?.data?.message || 'Ocorreu um erro ao salvar a sessão.');
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const chartData = {
    labels: evolutionData.map(session => session.session_date),
    datasets: [{
        label: 'Pontuação (%)',
        data: evolutionData.map(session => {
          const score = parseFloat(session.score);
          return isNaN(score) ? 0 : score;
        }),
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
        borderWidth: 3,
        pointRadius: evolutionData.map(session => {
          // Linha de base = estrela maior
          return session.details?.isBaseline ? 8 : 6;
        }),
        pointBackgroundColor: evolutionData.map(session => {
          // Prioridade: Linha de base > Nível de prompting > Padrão
          if (session.details?.isBaseline) {
            return '#f59e0b'; // Amarelo para linha de base
          } else if (session.details?.promptLevelColor) {
            return session.details.promptLevelColor; // Cor específica do nível de prompting
          } else {
            return '#4f46e5'; // Cor padrão (azul)
          }
        }),
        pointBorderColor: evolutionData.map(session => {
          // Linha de base = borda amarela mais grossa
          return session.details?.isBaseline ? '#f59e0b' : '#ffffff';
        }),
        pointBorderWidth: evolutionData.map(session => {
          // Linha de base = borda mais grossa para efeito estrela
          return session.details?.isBaseline ? 4 : 2;
        }),
        pointHoverRadius: evolutionData.map(session => {
          return session.details?.isBaseline ? 10 : 8;
        }),
        pointHoverBorderWidth: 3,
        pointStyle: evolutionData.map(session => {
          // Linha de base = estrela, outros = círculo
          return session.details?.isBaseline ? 'star' : 'circle';
        }),
        fill: true,
        tension: 0.4,
        shadowColor: 'rgba(79, 70, 229, 0.3)',
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
    }]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#e5e7eb',
            borderColor: '#4f46e5',
            borderWidth: 2,
            padding: 16,
            cornerRadius: 12,
            displayColors: false,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
                title: (context) => {
                    const dataIndex = context[0].dataIndex;
                    const session = evolutionData[dataIndex];
                    const isBaselinePoint = session?.details?.isBaseline;
                    const sessionDate = formatDate(context[0].label);
                    
                    // Título básico para todos os usuários
                    let title = `Sessão de ${sessionDate}`;
                    if (isBaselinePoint) {
                        title = `📋 [LINHA DE BASE] ${title}`;
                    } else {
                        title = `📈 ${title}`;
                    }
                    
                    return title;
                },
                
                label: (context) => {
                    const score = context.parsed.y.toFixed(1);
                    return `🎯 Pontuação: ${score}%`;
                },
                
                afterLabel: (context) => {
                    if (!context || context.dataIndex === undefined) return '';
                    const dataIndex = context.dataIndex;
                    const session = evolutionData[dataIndex];
                    
                    // Verifica estrutura dos dados
                    
                    const attempts = session?.attempts || 0;
                    const successes = session?.successes || 0;
                    
                    let result = [`📊 Acertos: ${successes}/${attempts}`];
                    
                    // Adiciona informações do nível de prompting se disponível
                    if (session?.details?.promptLevelName) {
                        result.push(`🎯 Nível: ${session.details.promptLevelName}`);
                    }
                    
                    // Adiciona informações do terapeuta se disponível
                    if (session && session.therapist_name && session.therapist_name.trim() !== '') {
                        result.push(`👨‍⚕️ Terapeuta: ${session.therapist_name}`);
                    } else if (session && session.therapist_id && session.therapist_id !== null) {
                        result.push(`👨‍⚕️ Terapeuta ID: ${session.therapist_id}`);
                    }
                    
                    // Informações do terapeuta
                    
                    return result;
                },
                
                afterBody: (context) => {
                    if (!context || !context[0] || context[0].dataIndex === undefined) return '';
                    const dataIndex = context[0].dataIndex;
                    const session = evolutionData[dataIndex];
                    const sessionNotes = session?.details?.notes;
                    
                    let result = [];
                    
                    // Observações da sessão (para todos)
                    if (sessionNotes) {
                        result.push(`\n📝 Observações:`); 
                        result.push(`${sessionNotes}`);
                    }
                    
                    // Papel do usuário
                    
                    // Horário do registro para terapeutas e admins (suporta 'therapist'/'terapeuta' e 'admin'/'administrador')
                    if (user && (user.role === 'therapist' || user.role === 'terapeuta' || user.role === 'admin' || user.role === 'administrador')) {
                        if (session?.created_at) {
                            const recordedTime = new Date(session.created_at).toLocaleString('pt-BR');
                            result.push(`\n📅 Registrado: ${recordedTime}`);
                        }
                    }
                    
                    return result.length > 0 ? result : '';
                }
            }
        },
        annotation: {
            annotations: {
                goalLine: {
                    type: 'line',
                    yMin: 80,
                    yMax: 80,
                    borderColor: '#10b981',
                    borderWidth: 3,
                    borderDash: [8, 4],
                    label: {
                        content: '🎯 Meta (80%)',
                        position: 'end',
                        backgroundColor: 'rgba(16, 185, 129, 0.9)',
                        font: { size: 12, weight: 'bold' },
                        color: 'white',
                        padding: 8,
                        borderRadius: 6,
                        yAdjust: -10
                    }
                }
            }
        }
    },
    scales: {
        x: {
            display: true,
            grid: {
              display: true,
              color: 'rgba(156, 163, 175, 0.2)',
              drawBorder: false,
            },
            ticks: {
                color: '#6b7280',
                font: {
                  size: 11,
                  weight: 500
                },
                maxTicksLimit: 8,
                callback: function(value) {
                    const label = this.getLabelForValue(value);
                    return formatDate(label, 'short');
                }
            },
            border: {
              display: false
            }
        },
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
                color: '#6b7280',
                font: {
                  size: 11,
                  weight: 500
                },
                stepSize: 20,
                callback: (value) => (value >= 0 && value <= 100) ? `${value}%` : ''
            },
            border: {
              display: false
            }
        }
    }
  };

  // Estado vazio redesenhado
  if (!program || !assignment) {
    return (
        <div className="flex flex-col items-center justify-center text-center p-12 h-full">
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-8 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <FontAwesomeIcon icon={faChartLine} className="text-4xl text-indigo-600" />
          </div>
          <h4 className="font-semibold text-xl text-gray-700 mb-3">Nenhum Programa Selecionado</h4>
          <p className="text-gray-500 leading-relaxed max-w-md">
            Selecione um programa na lista ao lado para visualizar gráficos de progresso e registrar sessões.
          </p>
          <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-indigo-600">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Aguardando seleção</span>
            </div>
          </div>
        </div>
      );
  }

  return (
    <div>
      {/* Toast de Feedback */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={closeToast}
          duration={4000}
        />
      )}

      {/* 📋 PROTOCOLO DO PROGRAMA - Seções Expansíveis */}
      <div className="mb-6 space-y-3">
        {/* 🎯 OBJETIVO */}
        {program?.objective && (
          <div className="bg-white border-2 border-blue-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            <button
              onClick={() => toggleSection('objective')}
              className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-4 flex items-center justify-between transition-colors hover:from-blue-100 hover:to-indigo-100"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-full">
                  <FontAwesomeIcon icon={faBullseye} className="text-white text-sm" />
                </div>
                <h5 className="font-bold text-blue-800 text-sm sm:text-base">Objetivo do Programa</h5>
              </div>
              <FontAwesomeIcon
                icon={expandedSections.objective ? faChevronUp : faChevronDown}
                className="text-blue-600 text-sm"
              />
            </button>
            {expandedSections.objective && (
              <div className="px-4 py-4 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 border-t-2 border-blue-100">
                <p className="text-blue-900 leading-relaxed text-sm sm:text-base">{program.objective}</p>
              </div>
            )}
          </div>
        )}

        {/* 💪 HABILIDADE */}
        {program?.skill && (
          <div className="bg-white border-2 border-purple-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            <button
              onClick={() => toggleSection('skill')}
              className="w-full bg-gradient-to-r from-purple-50 to-violet-50 px-4 py-4 flex items-center justify-between transition-colors hover:from-purple-100 hover:to-violet-100"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-purple-500 to-violet-600 p-2 rounded-full">
                  <FontAwesomeIcon icon={faDumbbell} className="text-white text-sm" />
                </div>
                <h5 className="font-bold text-purple-800 text-sm sm:text-base">Habilidade Trabalhada</h5>
              </div>
              <FontAwesomeIcon
                icon={expandedSections.skill ? faChevronUp : faChevronDown}
                className="text-purple-600 text-sm"
              />
            </button>
            {expandedSections.skill && (
              <div className="px-4 py-4 bg-gradient-to-r from-purple-50/30 to-violet-50/30 border-t-2 border-purple-100">
                <p className="text-purple-900 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">{program.skill}</p>
              </div>
            )}
          </div>
        )}

        {/* 📦 MATERIAIS */}
        {program?.materials && program.materials.length > 0 && (
          <div className="bg-white border-2 border-amber-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            <button
              onClick={() => toggleSection('materials')}
              className="w-full bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-4 flex items-center justify-between transition-colors hover:from-amber-100 hover:to-orange-100"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-2 rounded-full">
                  <FontAwesomeIcon icon={faBox} className="text-white text-sm" />
                </div>
                <h5 className="font-bold text-amber-800 text-sm sm:text-base">
                  Materiais Necessários
                  <span className="ml-2 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {Array.isArray(program.materials) ? program.materials.length : JSON.parse(program.materials || '[]').length}
                  </span>
                </h5>
              </div>
              <FontAwesomeIcon
                icon={expandedSections.materials ? faChevronUp : faChevronDown}
                className="text-amber-600 text-sm"
              />
            </button>
            {expandedSections.materials && (
              <div className="px-4 py-4 bg-gradient-to-r from-amber-50/30 to-orange-50/30 border-t-2 border-amber-100">
                <ul className="space-y-2">
                  {(Array.isArray(program.materials) ? program.materials : JSON.parse(program.materials || '[]')).map((material, index) => (
                    <li key={index} className="flex items-start text-sm sm:text-base">
                      <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span className="text-amber-900 leading-relaxed">{material}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 📋 PROCEDIMENTO */}
        {procedureSteps && procedureSteps.length > 0 && (
          <div className="bg-white border-2 border-emerald-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            <button
              onClick={() => toggleSection('procedure')}
              className="w-full bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-4 flex items-center justify-between transition-colors hover:from-emerald-100 hover:to-teal-100"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-2 rounded-full">
                  <FontAwesomeIcon icon={faListOl} className="text-white text-sm" />
                </div>
                <h5 className="font-bold text-emerald-800 text-sm sm:text-base">
                  Procedimento
                  <span className="ml-2 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {procedureSteps.length} {procedureSteps.length === 1 ? 'passo' : 'passos'}
                  </span>
                </h5>
              </div>
              <FontAwesomeIcon
                icon={expandedSections.procedure ? faChevronUp : faChevronDown}
                className="text-emerald-600 text-sm"
              />
            </button>
            {expandedSections.procedure && (
              <div className="px-4 py-4 bg-gradient-to-r from-emerald-50/30 to-teal-50/30 border-t-2 border-emerald-100">
                <div className="space-y-4">
                  {procedureSteps.map((step, index) => (
                    <div key={index} className="bg-white border-l-4 border-emerald-400 rounded-r-lg p-4 shadow-sm">
                      <div className="flex items-start space-x-3">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="font-bold text-emerald-900 mb-2 text-sm sm:text-base break-words">
                            {step.name || step.step_name || `Passo ${index + 1}`}
                          </h6>
                          <p className="text-emerald-800 leading-relaxed text-sm whitespace-pre-wrap break-words">
                            {step.description || step.step_description || 'Sem descrição'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ✅ CRITÉRIO DE AVANÇO */}
        {program?.advancement_criterion && (
          <div className="bg-white border-2 border-green-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
            <button
              onClick={() => toggleSection('advancement')}
              className="w-full bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-4 flex items-center justify-between transition-colors hover:from-green-100 hover:to-emerald-100"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-2 rounded-full">
                  <FontAwesomeIcon icon={faTrophy} className="text-white text-sm" />
                </div>
                <h5 className="font-bold text-green-800 text-sm sm:text-base">Critério de Avanço</h5>
              </div>
              <FontAwesomeIcon
                icon={expandedSections.advancement ? faChevronUp : faChevronDown}
                className="text-green-600 text-sm"
              />
            </button>
            {expandedSections.advancement && (
              <div className="px-4 py-4 bg-gradient-to-r from-green-50/30 to-emerald-50/30 border-t-2 border-green-100">
                <p className="text-green-900 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">{program.advancement_criterion}</p>
              </div>
            )}
          </div>
        )}
      </div>


      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center">
            <div className="bg-indigo-100 p-2 rounded-full mr-2 sm:mr-3">
              <FontAwesomeIcon icon={faSave} className="text-indigo-600" />
            </div>
            Registrar Nova Sessão
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Insira os dados da sessão para acompanhar o progresso</p>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
          {/* Informações Básicas - Modernizado */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 sm:p-4 lg:p-6">
            <h4 className="text-sm font-semibold text-blue-700 mb-4 flex items-center">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mr-2"></div>
              Informações da Sessão
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="session-date" className="block text-sm font-medium text-blue-700 mb-2">
                  Data da Sessão
                </label>
                <input 
                  type="date" 
                  id="session-date" 
                  required 
                  value={sessionDate} 
                  onChange={e => setSessionDate(e.target.value)} 
                  className="w-full px-4 py-3 border border-blue-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white" 
                />
              </div>
              <div>
                <label htmlFor="teaching-modality" className="block text-sm font-medium text-blue-700 mb-2">
                  Modalidade de Ensino
                </label>
                <select
                  id="teaching-modality"
                  value={teachingModality}
                  onChange={e => setTeachingModality(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-blue-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="" disabled>Selecione a modalidade</option>
                  {TEACHING_MODALITIES.map(modality => (
                    <option key={modality.value} value={modality.value} title={modality.description}>
                      {modality.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dados Quantitativos - Modernizado */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 sm:p-4 lg:p-6">
            <h4 className="text-sm font-semibold text-emerald-700 mb-4 flex items-center">
              <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full mr-2"></div>
              Dados da Sessão
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="session-attempts" className="block text-sm font-medium text-emerald-700 mb-2">
                  Tentativas
                </label>
                <input 
                  type="number" 
                  id="session-attempts" 
                  value={attempts} 
                  readOnly 
                  className="w-full px-4 py-3 border border-emerald-200 rounded-xl shadow-sm bg-emerald-100/50 cursor-not-allowed text-emerald-800 font-medium" 
                />
              </div>
              <div>
                <label htmlFor="session-successes" className="block text-sm font-medium text-emerald-700 mb-2">
                  Acertos
                </label>
                <input 
                  type="number" 
                  id="session-successes" 
                  value={successes} 
                  onChange={e => setSuccesses(e.target.value)} 
                  min="0" 
                  step="1" 
                  required 
                  placeholder="Ex: 8" 
                  className="w-full px-4 py-3 border border-emerald-300 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white" 
                />
              </div>
            </div>
          </div>
          {/* Observações - Modernizado */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 sm:p-4 lg:p-6">
            <label htmlFor="session-notes" className="block text-sm font-medium text-amber-700 mb-3 flex items-center">
              <div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full mr-2"></div>
              Observações da Sessão
            </label>
            <textarea 
              id="session-notes" 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              rows="4" 
              placeholder="Registre observações importantes sobre a sessão: comportamento, estratégias utilizadas, contexto, etc..." 
              className="w-full px-4 py-3 border border-amber-300 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white resize-none" 
            />
          </div>
          
          {/* Nível de Prompting e Linha de Base - Modernizado */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3 sm:p-4 lg:p-6">
            <h4 className="text-sm font-semibold text-purple-700 mb-3 sm:mb-4 flex items-center">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full mr-2"></div>
              Nível de Suporte e Configurações
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                {isLoadingPromptLevel ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Nível de Prompting</label>
                    <div className="animate-pulse bg-gray-200 h-10 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500 text-sm">Carregando...</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <PromptLevelSelector
                      selectedLevel={promptLevel}
                      onLevelChange={handlePromptLevelChange}
                      disabled={isSubmitting || isSavingPromptLevel}
                    />
                    {/* Indicadores de Status de Salvamento - Responsivo */}
                    {saveStatus === 'saving' && (
                      <div className="lg:absolute lg:-right-2 lg:top-1/2 lg:transform lg:-translate-y-1/2 bg-blue-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center space-x-2 animate-pulse">
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-sm" />
                        <span className="text-xs font-medium">Salvando...</span>
                      </div>
                    )}
                    {saveStatus === 'saved' && (
                      <div className="lg:absolute lg:-right-2 lg:top-1/2 lg:transform lg:-translate-y-1/2 bg-green-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center space-x-2 animate-slide-in-right">
                        <FontAwesomeIcon icon={faCheck} className="text-sm" />
                        <span className="text-xs font-medium">Salvo!</span>
                      </div>
                    )}
                    {saveStatus === 'error' && (
                      <div className="lg:absolute lg:-right-2 lg:top-1/2 lg:transform lg:-translate-y-1/2 bg-red-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center space-x-2">
                        <FontAwesomeIcon icon={faBullseye} className="text-sm" />
                        <span className="text-xs font-medium">Erro</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-start lg:justify-center pt-2 lg:pt-8">
                <div className="flex items-center space-x-3 bg-white border border-purple-200 rounded-xl px-4 py-3 shadow-sm">
                  <input 
                    type="checkbox" 
                    id="is-baseline" 
                    checked={isBaseline} 
                    onChange={e => setIsBaseline(e.target.checked)} 
                    className="h-4 w-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500 transition-all" 
                  />
                  <label htmlFor="is-baseline" className="block text-sm font-medium text-purple-700 cursor-pointer">
                    Marcar como Linha de Base
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Submit - Modernizado */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className={`
                  font-semibold py-4 px-8 rounded-xl text-sm transition-all duration-300 flex items-center justify-center min-w-[200px] shadow-lg transform hover:scale-105 disabled:hover:scale-100 border-2
                  ${saveSuccess 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-green-200 border-green-300' 
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-200 border-indigo-300 disabled:from-gray-300 disabled:to-gray-400 disabled:border-gray-300'
                  }
                `}
              >
                <div className="bg-white bg-opacity-20 p-2 rounded-full mr-3">
                  <FontAwesomeIcon icon={isSubmitting ? faSpinner : (saveSuccess ? faCheck : faSave)} className={`text-base ${isSubmitting && 'fa-spin'}`} />
                </div>
                <span className="text-base">
                  {isSubmitting ? 'Salvando...' : saveSuccess ? 'Salvo com Sucesso!' : 'Salvar Sessão'}
                </span>
              </button>
            </div>
          </div>
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex items-start">
                <FontAwesomeIcon icon={faBullseye} className="text-red-600 mt-1 mr-3" />
                <div>
                  <p className="text-red-800 font-medium mb-1">Erro na Sessão</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                <div className="bg-emerald-100 p-2 rounded-full mr-3">
                  <FontAwesomeIcon icon={faChartLine} className="text-emerald-600" />
                </div>
                Gráfico de Evolução
              </h4>
              <p className="text-sm text-gray-600 mt-1">Histórico de desempenho ao longo das sessões</p>
            </div>
            {evolutionData.length > 0 && (
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{evolutionData.length}</span> sessões registradas
                </div>
                <div className="text-xs text-emerald-600 mt-1">
                  {(() => {
                    const validScores = evolutionData.filter(s => s.score !== null && s.score !== undefined && !isNaN(s.score));
                    const hasInvalidScores = validScores.length < evolutionData.length;
                    
                    if (validScores.length === 0) {
                      return 'Média: N/A';
                    }
                    
                    const average = validScores.reduce((sum, s) => sum + parseFloat(s.score), 0) / validScores.length;
                    const averageText = `Média: ${average.toFixed(1)}%`;
                    
                    if (hasInvalidScores && evolutionData.length > 0) {
                      return (
                        <>
                          {averageText}
                          <span className="text-xs text-gray-500 ml-1">
                            ({validScores.length} de {evolutionData.length} com pontuação)
                          </span>
                        </>
                      );
                    }
                    
                    return averageText;
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mensagem informativa sobre período de 30 dias */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-blue-700">
              <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500" />
              <span className="font-medium">📊 Mostrando últimos 30 dias</span>
            </div>
            <Link
              to="/dashboard"
              className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline transition-colors flex items-center space-x-1"
            >
              <span>Ver histórico completo no Dashboard</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        <div className="p-6">
          <div className="relative h-80 md:h-96">
              {isLoadingHistory ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl text-indigo-600" />
                      </div>
                      <p className="text-gray-600 font-medium">Carregando histórico...</p>
                    </div>
                  </div>
              ) : evolutionData.length > 0 ? (
                  <>
                    <div className="h-full bg-gradient-to-br from-gray-50 to-indigo-50 rounded-lg p-4">
                      <Line options={chartOptions} data={chartData} />
                    </div>
                    
                    {/* Legenda de cores dos níveis de prompting */}
                    <div className="mt-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="mb-3">
                        <h6 className="text-xs font-medium text-gray-700 mb-2">Legenda dos Níveis de Prompting:</h6>
                        <div className="flex flex-wrap gap-3 text-xs">
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                            <span className="text-gray-600">Independente</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
                            <span className="text-gray-600">Dica Verbal</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                            <span className="text-gray-600">Dica Gestual</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                            <span className="text-gray-600">Ajuda Física Parcial</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }}></div>
                            <span className="text-gray-600">Ajuda Física Total</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6b7280' }}></div>
                            <span className="text-gray-600">Não Executado</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-2">
                        <h6 className="text-xs font-medium text-gray-700 mb-2">Formas dos Pontos:</h6>
                        <div className="flex flex-wrap gap-4 text-xs">
                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              <span className="text-amber-500 text-sm">⭐</span>
                            </div>
                            <span className="text-gray-600">Linha de Base</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                            <span className="text-gray-600">Sessão Regular</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-amber-700 flex items-center space-x-1">
                        <span>💡</span>
                        <span>Apenas sessões "Independente" contam para critério de domínio (80%+)</span>
                      </div>
                    </div>
                  </>
              ) : (
                  <div className="flex items-center justify-center h-full text-center bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div>
                      <div className="bg-gradient-to-br from-gray-100 to-slate-100 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <FontAwesomeIcon icon={faChartLine} className="text-3xl text-gray-400" />
                      </div>
                      <h5 className="font-semibold text-gray-600 mb-2">Nenhum Histórico</h5>
                      <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                        Registre a primeira sessão para começar a visualizar o progresso no gráfico.
                      </p>
                    </div>
                  </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionProgress;
