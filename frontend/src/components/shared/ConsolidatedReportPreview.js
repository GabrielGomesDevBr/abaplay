import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit, faCheck, faTimes, faSpinner, faFilePdf, faChartLine,
  faUser, faUserMd, faNotesMedical, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { generateConsolidatedReportPDF } from '../../utils/pdfGenerator';

const formatDate = (dateString) => {
  if (!dateString) return 'Não informado';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return 'Data inválida';
  }
};

const ConsolidatedReportPreview = ({
  isOpen,
  onClose,
  patientData,
  reportText,
  professionalData,
  sessionData,
  assignedPrograms,
  onUpdateReportText
}) => {
  const [editingText, setEditingText] = useState(false);
  const [tempReportText, setTempReportText] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    setTempReportText(reportText);
  }, [reportText]);

  if (!isOpen) return null;

  const handleEditText = () => {
    setEditingText(true);
  };

  const handleSaveText = () => {
    onUpdateReportText(tempReportText);
    setEditingText(false);
  };

  const handleCancelEdit = () => {
    setTempReportText(reportText);
    setEditingText(false);
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const patientForReport = { ...patientData, sessionData };
      const professionalDataForPDF = professionalData ? {
        ...professionalData,
        professional_name: professionalData.professional_name || 'Profissional'
      } : null;
      
      await generateConsolidatedReportPDF(patientForReport, reportText, professionalDataForPDF);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Processar markdown básico para preview
  const processMarkdownText = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^• (.*$)/gim, '&bull; $1')
      .replace(/^(\d+)\. (.*$)/gim, '$1. $2')
      .replace(/\n/g, '<br/>');
  };

  // Calcular estatísticas básicas
  const totalSessions = sessionData?.length || 0;
  const avgScore = totalSessions > 0 
    ? (sessionData.reduce((sum, session) => sum + (session.score || 0), 0) / totalSessions).toFixed(1)
    : 0;

  // Criar lista única de programas usando os dados completos de assignedPrograms
  const programsWithSessions = sessionData?.reduce((acc, session) => {
    const programId = session.program_id;
    
    if (!programId) {
      return acc; // Pula sessões sem program_id
    }
    
    // Buscar informações completas do programa no assignedPrograms
    const programInfo = assignedPrograms?.find(p => p.program_id === programId);
    
    const existingProgram = acc.find(p => p.id === programId);
    if (!existingProgram) {
      const sessionsCount = sessionData.filter(s => s.program_id === programId).length;
      
      acc.push({
        id: programId,
        name: programInfo?.program_name || `Programa ${programId}`,
        discipline: programInfo?.discipline_name || 'Área não informada',
        sessionsCount: sessionsCount
      });
    }
    return acc;
  }, []) || [];


  // Ordenar programas por nome para consistência
  programsWithSessions.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">
              Preview - Relatório Consolidado
            </h2>
            <p className="text-indigo-100 text-sm">
              {patientData?.name} • Revise e personalize antes de gerar o PDF
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
            <div className="flex items-center space-x-3 mb-4">
              <FontAwesomeIcon icon={faUser} className="text-indigo-600 text-lg" />
              <h3 className="text-lg font-semibold text-gray-800">Identificação do Usuário</h3>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Nome:</span>
                <p className="text-gray-800">{patientData?.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Clínica:</span>
                <p className="text-gray-800">{patientData?.clinic_name || 'Não informado'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Data de Nascimento:</span>
                <p className="text-gray-800">{formatDate(patientData?.dob)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Diagnóstico:</span>
                <p className="text-gray-800">{patientData?.diagnosis || 'Não informado'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Responsável:</span>
                <p className="text-gray-800">
                  {patientData?.guardian_name ? 
                    `${patientData.guardian_name} (${patientData.guardian_relationship})` : 
                    'Não informado'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* 2. Resumo do Período */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FontAwesomeIcon icon={faChartLine} className="text-blue-600 text-lg" />
              <h3 className="text-lg font-semibold text-gray-800">Resumo do Período</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalSessions}</div>
                <div className="text-gray-600 text-sm">Sessões Realizadas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{avgScore}%</div>
                <div className="text-gray-600 text-sm">Média Geral</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{programsWithSessions.length}</div>
                <div className="text-gray-600 text-sm">Programas Trabalhados</div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-3">Programas Trabalhados:</h4>
              {programsWithSessions.length > 0 ? (
                <div className="space-y-2">
                  {programsWithSessions.map((program, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-white border border-gray-200 rounded-md">
                      <div>
                        <span className="font-medium text-gray-800 text-sm">{program.name}</span>
                        <div className="text-xs text-gray-500">{program.discipline}</div>
                      </div>
                      <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {program.sessionsCount} {program.sessionsCount === 1 ? 'sessão' : 'sessões'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic p-2 bg-gray-100 rounded-md">
                  Nenhum programa encontrado para o período selecionado
                </div>
              )}
            </div>
          </div>

          {/* 3. Análise do Terapeuta */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <FontAwesomeIcon icon={faNotesMedical} className="text-green-600 text-lg" />
                <h3 className="text-lg font-semibold text-gray-800">Análise e Observações</h3>
              </div>
              <button
                onClick={handleEditText}
                className="text-green-600 hover:text-green-800 transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
            </div>
            
            {editingText ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Análise Qualitativa:
                  </label>
                  <textarea
                    value={tempReportText}
                    onChange={(e) => setTempReportText(e.target.value)}
                    placeholder="Digite sua análise qualitativa sobre o período..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows="8"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleSaveText}
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
              <div>
                {reportText ? (
                  <div 
                    className="text-gray-800 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: processMarkdownText(reportText)
                    }} 
                  />
                ) : (
                  <div className="text-gray-500 italic">
                    Clique em "Editar" para adicionar sua análise qualitativa sobre o período.
                  </div>
                )}
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

          {/* Informação sobre gráficos */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 mt-1" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Gráficos de Progresso</p>
                <p>
                  Os gráficos detalhados de cada programa serão incluídos automaticamente no PDF final, 
                  organizados por área de intervenção conforme visualizado na pré-visualização do modal.
                </p>
              </div>
            </div>
          </div>

          {/* Aviso de responsabilidade profissional */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-amber-600 mt-1 flex-shrink-0">⚠️</span>
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Responsabilidade Profissional</p>
                <p>
                  Este relatório contém dados quantitativos e análises automáticas baseadas em métricas de sessões. 
                  Como profissional responsável, você deve assegurar que:
                </p>
                <ul className="text-xs mt-2 space-y-1">
                  <li>• O texto reflita adequadamente a condição e progresso individual do paciente</li>
                  <li>• Aspectos comportamentais e contextuais relevantes estejam incluídos</li>
                  <li>• As interpretações estejam alinhadas com sua avaliação clínica</li>
                  <li>• O conteúdo esteja adequado ao público-alvo (escola, família, outros profissionais)</li>
                </ul>
                <p className="text-xs mt-2 font-medium">
                  A responsabilidade técnica e ética pelo conteúdo final é sempre do profissional emissor.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Preview do relatório • Edite o texto se necessário antes de gerar o PDF final
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

export default ConsolidatedReportPreview;