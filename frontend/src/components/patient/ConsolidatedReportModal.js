import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faFilePdf, faSpinner, faCalendarAlt, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { usePatients } from '../../context/PatientContext';
import { usePrograms } from '../../context/ProgramContext';
import { generateConsolidatedReportPDF } from '../../utils/pdfGenerator';

const ConsolidatedReportModal = ({ isOpen, onClose }) => {
  const { selectedPatient } = usePatients();
  const { getProgramById } = usePrograms();

  const [reportText, setReportText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para o filtro de data
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Reseta os estados quando o modal é fechado ou o paciente muda
  useEffect(() => {
    if (isOpen) {
      setReportText('');
      setStartDate('');
      setEndDate('');
      setError('');
    }
  }, [isOpen]);

  const handleGenerate = () => {
    if (!selectedPatient) {
      alert("Erro: nenhum paciente selecionado.");
      return;
    }
    
    setIsGenerating(true);
    setError('');

    try {
      // Filtra os dados da sessão com base no intervalo de datas selecionado
      const start = startDate ? new Date(startDate + 'T00:00:00') : null;
      const end = endDate ? new Date(endDate + 'T23:59:59') : null;
      
      const filteredSessionData = (selectedPatient.sessionData || []).filter(session => {
        const sessionDate = new Date(session.session_date);
        if (start && sessionDate < start) return false;
        if (end && sessionDate > end) return false;
        return true;
      });
      
      // Cria um objeto de paciente temporário com os dados filtrados
      const patientForReport = {
        ...selectedPatient,
        sessionData: filteredSessionData,
      };

      generateConsolidatedReportPDF(patientForReport, reportText, getProgramById);
      
      setTimeout(() => {
        onClose();
      }, 1000); 

    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao gerar o relatório.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const clearFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  if (!isOpen || !selectedPatient) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col transform transition-all">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            Gerar Relatório Consolidado para: <span className="text-indigo-600">{selectedPatient.name}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={faTimes} className="text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período do Relatório (opcional)
            </label>
            <div className="bg-gray-50 p-3 rounded-lg border flex flex-wrap items-center gap-2 text-sm">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 ml-2" />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 border rounded-md text-xs" />
                <span className="text-gray-500">até</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 border rounded-md text-xs" />
                <button onClick={clearFilter} className="text-xs text-gray-500 hover:text-red-600 p-1.5 rounded-full hover:bg-gray-100" title="Limpar filtro">
                    <FontAwesomeIcon icon={faTimesCircle} />
                </button>
            </div>
             <p className="text-xs text-gray-500 mt-2">Deixe em branco para incluir todos os dados de sessão.</p>
          </div>
        
          <div>
            <label htmlFor="report-text" className="block text-sm font-medium text-gray-700 mb-1">
              Análise e Observações do Terapeuta
            </label>
            <p className="text-xs text-gray-500 mb-2">Este texto será incluído no início do relatório em PDF.</p>
            <textarea
              id="report-text"
              rows="8"
              placeholder="Escreva aqui a sua análise qualitativa, observações sobre o progresso geral, dificuldades, e próximos passos recomendados..."
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-vertical"
            ></textarea>
          </div>
           {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 text-right">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md text-sm transition duration-150 ease-in-out shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
          >
            <FontAwesomeIcon icon={isGenerating ? faSpinner : faFilePdf} className={`mr-2 ${isGenerating && 'fa-spin'}`} />
            {isGenerating ? 'Gerando...' : 'Gerar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedReportModal;
