import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit, faCheck, faTimes, faSpinner, faFilePdf, faChartLine,
  faUser, faUserMd, faNotesMedical, faClipboardList, faLightbulb,
  faExclamationTriangle, faCheckCircle, faInfoCircle, faSave
} from '@fortawesome/free-solid-svg-icons';
import { generateEvolutionReportPDF } from '../../utils/pdfGenerator';

const formatDate = (dateString) => {
  if (!dateString) return 'Não informado';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return 'Data inválida';
  }
};

const ReportPreview = ({
  isOpen,
  onClose,
  reportData,
  analysisData,
  patientData,
  professionalData,
  onEditSection,
  customizations = {},
  onUpdateCustomizations
}) => {
  const [editingSection, setEditingSection] = useState(null);
  const [tempCustomizations, setTempCustomizations] = useState({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    setTempCustomizations(customizations);
  }, [customizations]);

  if (!isOpen) return null;

  const handleEditSection = (sectionKey) => {
    setEditingSection(sectionKey);
  };

  const handleSaveEdit = (sectionKey) => {
    onUpdateCustomizations({
      ...customizations,
      [sectionKey]: tempCustomizations[sectionKey]
    });
    setEditingSection(null);
  };

  const handleCancelEdit = () => {
    setTempCustomizations(customizations);
    setEditingSection(null);
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateEvolutionReportPDF({
        reportData,
        analysisData,
        patientData,
        professionalData,
        customizations
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'positive':
        return { icon: faCheckCircle, color: 'text-green-600' };
      case 'attention':
        return { icon: faExclamationTriangle, color: 'text-yellow-600' };
      default:
        return { icon: faInfoCircle, color: 'text-blue-600' };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">
              Preview - Relatório de Evolução Terapêutica
            </h2>
            <p className="text-indigo-100 text-sm">
              {reportData?.name} • Revise e personalize antes de gerar o PDF
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isGeneratingPDF ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faFilePdf} />
                  <span>Gerar PDF</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-200 transition-colors text-xl"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. Identificação do Paciente */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faUser} className="text-indigo-600 text-lg" />
                <h3 className="text-lg font-semibold text-gray-800">1. Identificação do Usuário</h3>
              </div>
              <button
                onClick={() => handleEditSection('identification')}
                className="text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Nome:</span>
                <p className="text-gray-800">{reportData?.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Data de Nascimento:</span>
                <p className="text-gray-800">{formatDate(reportData?.dob)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Diagnóstico:</span>
                <p className="text-gray-800">{reportData?.diagnosis || 'Não informado'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Ocupação:</span>
                <p className="text-gray-800">{patientData?.patient_occupation || 'Não informado'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Responsável:</span>
                <p className="text-gray-800">
                  {patientData?.guardian_name} ({patientData?.guardian_relationship})
                </p>
              </div>
            </div>
          </div>

          {/* 2. Descrição da Demanda */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faNotesMedical} className="text-blue-600 text-lg" />
                <h3 className="text-lg font-semibold text-gray-800">2. Descrição da Demanda</h3>
              </div>
              <button
                onClick={() => handleEditSection('demand')}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
            </div>
            
            {editingSection === 'demand' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Queixa Principal:
                  </label>
                  <textarea
                    value={tempCustomizations.demand?.main_complaint || patientData?.main_complaint || ''}
                    onChange={(e) => setTempCustomizations(prev => ({
                      ...prev,
                      demand: {
                        ...prev.demand,
                        main_complaint: e.target.value
                      }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objetivos do Tratamento:
                  </label>
                  <textarea
                    value={tempCustomizations.demand?.treatment_objectives || patientData?.treatment_objectives || ''}
                    onChange={(e) => setTempCustomizations(prev => ({
                      ...prev,
                      demand: {
                        ...prev.demand,
                        treatment_objectives: e.target.value
                      }
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows="3"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleSaveEdit('demand')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    <span>Salvar</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-600">Queixa Principal:</span>
                  <p className="text-gray-800 mt-1">
                    {customizations.demand?.main_complaint || patientData?.main_complaint || 'Não informado'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Objetivos do Tratamento:</span>
                  <p className="text-gray-800 mt-1">
                    {customizations.demand?.treatment_objectives || patientData?.treatment_objectives || 'Não informado'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3. Evolução das Sessões */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faChartLine} className="text-purple-600 text-lg" />
                <h3 className="text-lg font-semibold text-gray-800">3. Registro da Evolução das Sessões</h3>
              </div>
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                Dados objetivos - Não editável
              </span>
            </div>
            
            {analysisData?.statistics && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisData.statistics.total_sessions}
                  </div>
                  <div className="text-gray-600">Sessões Realizadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisData.statistics.avg_score.toFixed(1)}%
                  </div>
                  <div className="text-gray-600">Média de Acertos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysisData.statistics.independence_percentage.toFixed(1)}%
                  </div>
                  <div className="text-gray-600">Independência</div>
                </div>
              </div>
            )}
            
            {analysisData?.frequent_observations && analysisData.frequent_observations.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-2">Observações Mais Frequentes:</h4>
                <ul className="space-y-1 text-sm">
                  {analysisData.frequent_observations.slice(0, 5).map((obs, index) => (
                    <li key={index} className="flex justify-between">
                      <span className="text-gray-800">"{obs.note}"</span>
                      <span className="text-gray-500">({obs.frequency}x)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 4. Análise */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faLightbulb} className="text-yellow-600 text-lg" />
                <h3 className="text-lg font-semibold text-gray-800">4. Análise</h3>
              </div>
              <button
                onClick={() => handleEditSection('analysis')}
                className="text-yellow-600 hover:text-yellow-800 transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
            </div>
            
            {editingSection === 'analysis' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Análise Comportamental:
                  </label>
                  <textarea
                    value={tempCustomizations.analysis?.clinical_interpretation || ''}
                    onChange={(e) => setTempCustomizations(prev => ({
                      ...prev,
                      analysis: {
                        ...prev.analysis,
                        clinical_interpretation: e.target.value
                      }
                    }))}
                    placeholder="Interpretação dos dados baseada nos princípios da Análise do Comportamento..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows="5"
                  />
                </div>
                
                {analysisData?.insights && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Insights Sugeridos (clique para adicionar):
                    </label>
                    <div className="space-y-2">
                      {analysisData.insights.map((insight, index) => {
                        const { icon, color } = getInsightIcon(insight.type);
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              const currentText = tempCustomizations.analysis?.clinical_interpretation || '';
                              const newText = currentText ? 
                                `${currentText}\n\n• ${insight.text}` : 
                                `• ${insight.text}`;
                              setTempCustomizations(prev => ({
                                ...prev,
                                analysis: {
                                  ...prev.analysis,
                                  clinical_interpretation: newText
                                }
                              }));
                            }}
                            className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start space-x-3">
                              <FontAwesomeIcon icon={icon} className={`${color} mt-1`} />
                              <span className="text-sm text-gray-800">{insight.text}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleSaveEdit('analysis')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    <span>Salvar</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {customizations.analysis?.clinical_interpretation ? (
                  <div>
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {customizations.analysis.clinical_interpretation}
                    </p>
                  </div>
                ) : (
                  <div className="text-gray-500 italic">
                    Clique em "Editar" para adicionar sua interpretação clínica baseada nos dados apresentados.
                  </div>
                )}
                
                {analysisData?.insights && !customizations.analysis?.clinical_interpretation && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Insights Automáticos Disponíveis:</h4>
                    <div className="space-y-2">
                      {analysisData.insights.map((insight, index) => {
                        const { icon, color } = getInsightIcon(insight.type);
                        return (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                            <FontAwesomeIcon icon={icon} className={`${color} mt-1`} />
                            <span className="text-sm text-gray-800">{insight.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Conclusões */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faClipboardList} className="text-green-600 text-lg" />
                <h3 className="text-lg font-semibold text-gray-800">5. Conclusão e Encaminhamentos</h3>
              </div>
              <button
                onClick={() => handleEditSection('conclusions')}
                className="text-green-600 hover:text-green-800 transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
            </div>
            
            {editingSection === 'conclusions' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Síntese e Conclusões:
                  </label>
                  <textarea
                    value={tempCustomizations.conclusions?.summary || ''}
                    onChange={(e) => setTempCustomizations(prev => ({
                      ...prev,
                      conclusions: {
                        ...prev.conclusions,
                        summary: e.target.value
                      }
                    }))}
                    placeholder="Síntese do trabalho realizado e resultados alcançados..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows="4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recomendações e Encaminhamentos:
                  </label>
                  <textarea
                    value={tempCustomizations.conclusions?.recommendations || ''}
                    onChange={(e) => setTempCustomizations(prev => ({
                      ...prev,
                      conclusions: {
                        ...prev.conclusions,
                        recommendations: e.target.value
                      }
                    }))}
                    placeholder="Recomendações para continuidade do tratamento e próximos passos..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows="4"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleSaveEdit('conclusions')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <FontAwesomeIcon icon={faCheck} />
                    <span>Salvar</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-600">Síntese:</span>
                  <p className="text-gray-800 mt-1">
                    {customizations.conclusions?.summary || 'Clique em "Editar" para adicionar síntese do período.'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Recomendações:</span>
                  <p className="text-gray-800 mt-1">
                    {customizations.conclusions?.recommendations || 'Clique em "Editar" para adicionar recomendações.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Dados Profissionais */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <FontAwesomeIcon icon={faUserMd} className="text-indigo-600" />
              <h4 className="font-medium text-indigo-800">Dados Profissionais</h4>
            </div>
            <div className="text-sm text-indigo-700">
              <p><strong>Profissional:</strong> {professionalData?.professional_name}</p>
              <p><strong>Registro:</strong> {professionalData?.professional_id}</p>
              <p><strong>Qualificações:</strong> {professionalData?.qualifications}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Preview do relatório • Todas as edições serão incluídas no PDF final
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Fechar Preview
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center space-x-2"
            >
              {isGeneratingPDF ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faFilePdf} />
                  <span>Gerar PDF Final</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;