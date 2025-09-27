// frontend/src/components/scheduling/ReportConfigModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCalendarAlt,
  faUsers,
  faUser,
  faFilePdf,
  faSpinner,
  faCheck,
  faChartBar,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

/**
 * Modal de configuração para geração de relatórios de agendamentos
 * Segue padrão dos relatórios existentes com step de configuração e preview
 */
const ReportConfigModal = ({
  isOpen,
  onClose,
  onGenerate,
  therapists = [],
  isGenerating = false
}) => {
  // Estados do formulário
  const [period, setPeriod] = useState({
    type: 'week',
    startDate: '',
    endDate: ''
  });

  const [scope, setScope] = useState({
    type: 'all',
    therapistId: null
  });

  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1: Configuração, 2: Preview
  const [reportConfig, setReportConfig] = useState(null);

  // Calcular datas pré-definidas
  useEffect(() => {
    const today = new Date();
    let startDate, endDate;

    switch (period.type) {
      case 'week':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = today;
        break;
      case '2weeks':
        startDate = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
        endDate = today;
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        endDate = today;
        break;
      case 'quarter':
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
        endDate = today;
        break;
      default:
        return; // Para custom, não alterar as datas
    }

    if (period.type !== 'custom') {
      setPeriod(prev => ({
        ...prev,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }));
    }
  }, [period.type]);

  // Reset states quando modal abre
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrors({});
      setReportConfig(null);
      setPeriod({
        type: 'week',
        startDate: '',
        endDate: ''
      });
      setScope({
        type: 'all',
        therapistId: null
      });
    }
  }, [isOpen]);

  // Validar formulário
  const validateForm = () => {
    const newErrors = {};

    // Para período customizado, exigir datas específicas
    if (period.type === 'custom') {
      if (!period.startDate) {
        newErrors.startDate = 'Data inicial é obrigatória';
      }
      if (!period.endDate) {
        newErrors.endDate = 'Data final é obrigatória';
      }
      if (period.startDate && period.endDate && period.startDate > period.endDate) {
        newErrors.dateRange = 'Data inicial deve ser anterior à data final';
      }
    }

    // Para relatório individual, exigir seleção de terapeuta
    if (scope.type === 'individual' && !scope.therapistId) {
      newErrors.therapist = 'Selecione um terapeuta para relatório individual';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Avançar para próximo step ou gerar relatório
  const handleNextStep = async () => {
    if (step === 1) {
      if (!validateForm()) return;

      // Garantir que as datas estão corretas mesmo para períodos pré-definidos
      let finalStartDate = period.startDate;
      let finalEndDate = period.endDate;

      // Se as datas não estão definidas para períodos pré-definidos, calcular agora
      if (!finalStartDate || !finalEndDate) {
        const today = new Date();
        let startDate, endDate;

        switch (period.type) {
          case 'week':
            startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = today;
            break;
          case '2weeks':
            startDate = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
            endDate = today;
            break;
          case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
            endDate = today;
            break;
          case 'quarter':
            startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
            endDate = today;
            break;
          default:
            startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = today;
        }

        finalStartDate = startDate.toISOString().split('T')[0];
        finalEndDate = endDate.toISOString().split('T')[0];
      }

      // Preparar dados e ir para preview
      const config = {
        period: {
          type: period.type,
          startDate: finalStartDate,
          endDate: finalEndDate
        },
        scope: {
          type: scope.type,
          therapistId: scope.therapistId
        }
      };

      setReportConfig(config);
      setStep(2);
    } else {
      // Gerar relatório final
      if (reportConfig) {
        onGenerate(reportConfig);
      }
    }
  };

  const handlePrevStep = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  // Obter nome do terapeuta selecionado
  const getSelectedTherapistName = () => {
    if (scope.type === 'all') return 'Todos os Terapeutas';
    const therapist = therapists.find(t => t.id == scope.therapistId);
    return therapist ? therapist.full_name : 'Terapeuta não encontrado';
  };

  // Formatar período selecionado
  const getFormattedPeriod = () => {
    // Se estamos no step 2, usar os dados do reportConfig
    if (step === 2 && reportConfig) {
      const start = new Date(reportConfig.period.startDate).toLocaleDateString('pt-BR');
      const end = new Date(reportConfig.period.endDate).toLocaleDateString('pt-BR');
      return `${start} a ${end}`;
    }

    // Se estamos no step 1, usar os dados do period
    if (!period.startDate || !period.endDate) return 'Período será calculado automaticamente';

    try {
      const start = new Date(period.startDate).toLocaleDateString('pt-BR');
      const end = new Date(period.endDate).toLocaleDateString('pt-BR');
      return `${start} a ${end}`;
    } catch (error) {
      return 'Período será calculado automaticamente';
    }
  };

  // Obter tipo de período em texto
  const getPeriodTypeText = () => {
    const types = {
      'week': 'Última Semana',
      '2weeks': 'Últimas 2 Semanas',
      'month': 'Último Mês',
      'quarter': 'Último Trimestre',
      'custom': 'Período Customizado'
    };
    return types[period.type] || 'Período não definido';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Relatório de Agendamentos
              </h2>
              <p className="text-red-100 text-sm">
                {step === 1 ? 'Configuração do Relatório' : 'Confirmar e Gerar PDF'}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="text-white hover:text-red-200 transition-colors disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xl" />
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-red-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
                <FontAwesomeIcon icon={faCalendarAlt} className="text-sm" />
              </div>
              <span className="font-medium">Configuração</span>
            </div>

            <div className={`flex-1 h-1 ${step >= 2 ? 'bg-red-600' : 'bg-gray-200'} rounded`}></div>

            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-red-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
                <FontAwesomeIcon icon={faFilePdf} className="text-sm" />
              </div>
              <span className="font-medium">Gerar PDF</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-br from-red-100 to-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FontAwesomeIcon icon={faFilePdf} className="text-2xl text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Configuração do Relatório
                </h3>
                <p className="text-gray-600 text-sm">
                  Configure o período e escopo do relatório de agendamentos
                </p>
              </div>

              {/* Seleção de Período */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-red-500" />
                  Período do Relatório
                </label>

                <div className="space-y-2">
                  {[
                    { value: 'week', label: 'Última Semana' },
                    { value: '2weeks', label: 'Últimas 2 Semanas' },
                    { value: 'month', label: 'Último Mês' },
                    { value: 'quarter', label: 'Último Trimestre' },
                    { value: 'custom', label: 'Período Customizado' }
                  ].map(option => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="period"
                        value={option.value}
                        checked={period.type === option.value}
                        onChange={(e) => setPeriod(prev => ({ ...prev, type: e.target.value }))}
                        disabled={isGenerating}
                        className="mr-3 text-red-600 focus:ring-red-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>

                {/* Datas customizadas */}
                {period.type === 'custom' && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Data Inicial</label>
                      <input
                        type="date"
                        value={period.startDate}
                        onChange={(e) => setPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                        disabled={isGenerating}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      {errors.startDate && (
                        <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Data Final</label>
                      <input
                        type="date"
                        value={period.endDate}
                        onChange={(e) => setPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                        disabled={isGenerating}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      {errors.endDate && (
                        <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Preview das datas selecionadas */}
                {period.startDate && period.endDate && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                    Período: {getFormattedPeriod()}
                  </div>
                )}

                {errors.dateRange && (
                  <p className="text-red-500 text-sm mt-2">{errors.dateRange}</p>
                )}
              </div>

              {/* Seleção de Escopo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <FontAwesomeIcon icon={faUsers} className="mr-2 text-red-500" />
                  Escopo do Relatório
                </label>

                <div className="space-y-3">
                  <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      value="all"
                      checked={scope.type === 'all'}
                      onChange={(e) => setScope({ type: e.target.value, therapistId: null })}
                      disabled={isGenerating}
                      className="mr-3 text-red-600 focus:ring-red-500"
                    />
                    <FontAwesomeIcon icon={faUsers} className="mr-3 text-blue-600" />
                    <div>
                      <div className="font-medium">Todos os Terapeutas</div>
                      <div className="text-sm text-gray-500">Relatório geral com todos os profissionais</div>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      value="individual"
                      checked={scope.type === 'individual'}
                      onChange={(e) => setScope(prev => ({ ...prev, type: e.target.value }))}
                      disabled={isGenerating}
                      className="mr-3 text-red-600 focus:ring-red-500"
                    />
                    <FontAwesomeIcon icon={faUser} className="mr-3 text-green-600" />
                    <div>
                      <div className="font-medium">Terapeuta Individual</div>
                      <div className="text-sm text-gray-500">Relatório detalhado de um profissional específico</div>
                    </div>
                  </label>
                </div>

                {/* Seleção de terapeuta específico */}
                {scope.type === 'individual' && (
                  <div className="mt-4">
                    <select
                      value={scope.therapistId || ''}
                      onChange={(e) => setScope(prev => ({ ...prev, therapistId: e.target.value || null }))}
                      disabled={isGenerating}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Selecione um terapeuta...</option>
                      {therapists.map(therapist => (
                        <option key={therapist.id} value={therapist.id}>
                          {therapist.full_name}
                        </option>
                      ))}
                    </select>
                    {errors.therapist && (
                      <p className="text-red-500 text-xs mt-2">{errors.therapist}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FontAwesomeIcon icon={faChartBar} className="text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-blue-800">Sobre os Relatórios</h4>
                    <p className="text-blue-700 text-sm">
                      Os relatórios incluem estatísticas detalhadas, taxa de comparecimento,
                      agenda completa e análises de performance. Dados baseados nos agendamentos reais.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && reportConfig && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-br from-green-100 to-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FontAwesomeIcon icon={faCheck} className="text-2xl text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Configuração Confirmada
                </h3>
                <p className="text-gray-600 text-sm">
                  Revise as configurações e gere o relatório PDF
                </p>
              </div>

              {/* Resumo da Configuração */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faCheck} className="mr-2 text-green-600" />
                  Resumo da Configuração
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center mb-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-red-500" />
                      <span className="font-medium text-gray-700">Período</span>
                    </div>
                    <p className="text-sm text-gray-600">{getPeriodTypeText()}</p>
                    <p className="text-sm text-gray-800 font-medium">{getFormattedPeriod()}</p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center mb-2">
                      <FontAwesomeIcon icon={scope.type === 'all' ? faUsers : faUser} className="mr-2 text-red-500" />
                      <span className="font-medium text-gray-700">Escopo</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {scope.type === 'all' ? 'Relatório Geral' : 'Relatório Individual'}
                    </p>
                    <p className="text-sm text-gray-800 font-medium">{getSelectedTherapistName()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FontAwesomeIcon icon={faFilePdf} className="text-green-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-green-800">Pronto para Gerar</h4>
                    <p className="text-green-700 text-sm">
                      O relatório será gerado em formato PDF profissional com estatísticas completas,
                      gráficos e tabelas detalhadas. O download iniciará automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {step === 2 && (
              <button
                onClick={handlePrevStep}
                disabled={isGenerating}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
              >
                Voltar
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              onClick={handleNextStep}
              disabled={isGenerating}
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <span>{step === 2 ? 'Gerar Relatório PDF' : 'Continuar'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportConfigModal;