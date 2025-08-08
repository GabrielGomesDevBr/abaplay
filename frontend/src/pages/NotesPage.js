import React, { useState, useEffect } from 'react';
import { usePatients } from '../context/PatientContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faSave, faSpinner, faCheck, faPencilAlt, faFileAlt, faInfoCircle, faExclamationTriangle, faCalendarAlt, faClock } from '@fortawesome/free-solid-svg-icons';

// Estilos de animação para a página
const fadeInStyle = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.6s ease-out;
  }
`;

// Injeta os estilos no head
if (typeof document !== 'undefined' && !document.querySelector('#notes-page-styles')) {
  const style = document.createElement('style');
  style.id = 'notes-page-styles';
  style.textContent = fadeInStyle;
  document.head.appendChild(style);
}

const NotesPage = () => {
  const { selectedPatient, saveNotes } = usePatients();
  
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [lastSaved, setLastSaved] = useState(null);

  // Efeito para atualizar a área de texto quando o cliente selecionado muda
  useEffect(() => {
    if (selectedPatient) {
      const patientNotes = selectedPatient.general_notes || '';
      setNotes(patientNotes);
    } else {
      setNotes('');
    }
    setSaveSuccess(false);
    setError('');
    setLastSaved(null);
  }, [selectedPatient]);

  const handleSave = async () => {
    if (!selectedPatient) {
      setError("Nenhum cliente selecionado.");
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);
    setError('');
    try {
      await saveNotes(notes);
      setSaveSuccess(true);
      setLastSaved(new Date());
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message || "Ocorreu um erro ao guardar as anotações.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const formatLastSaved = (date) => {
    if (!date) return '';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="p-6">
        {/* Cabeçalho da página */}
        <div className="animate-fade-in mb-8">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center">
                    <FontAwesomeIcon icon={faPencilAlt} className="mr-4" />
                    Anotações Gerais
                  </h1>
                  <p className="text-indigo-100 text-lg mt-2">
                    Registre observações, progresso e informações importantes
                  </p>
                </div>
                {selectedPatient && (
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                    <FontAwesomeIcon icon={faUserCircle} className="text-white text-2xl mb-2" />
                    <p className="text-white text-sm font-medium">{selectedPatient.name}</p>
                    <p className="text-indigo-100 text-xs">Cliente selecionado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="animate-fade-in">
          {selectedPatient ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {/* Header do editor */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-indigo-100 p-2 rounded-full">
                      <FontAwesomeIcon icon={faFileAlt} className="text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800">
                        Anotações para {selectedPatient.name}
                      </h2>
                      <p className="text-sm text-gray-600">Documente informações relevantes sobre o cliente</p>
                    </div>
                  </div>
                  
                  {/* Informações do editor */}
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    {lastSaved && (
                      <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={faClock} className="text-green-500" />
                        <span className="text-green-600">Salvo em {formatLastSaved(lastSaved)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Área do editor */}
              <div className="p-6">
                {/* Feedback de erros */}
                {error && (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                    <div className="flex items-start">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 mt-1 mr-3" />
                      <div>
                        <p className="text-red-800 font-medium mb-1">Erro ao Salvar</p>
                        <p className="text-red-700 text-sm">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Feedback de sucesso */}
                {saveSuccess && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg">
                    <div className="flex items-start">
                      <FontAwesomeIcon icon={faCheck} className="text-green-600 mt-1 mr-3" />
                      <div>
                        <p className="text-green-800 font-medium mb-1">Anotações Salvas</p>
                        <p className="text-green-700 text-sm">As informações foram salvas com sucesso</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Dicas de uso */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg">
                  <div className="flex items-start">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 mt-1 mr-3" />
                    <div>
                      <p className="text-blue-800 font-medium mb-1">📝 Dicas para Anotações Eficazes</p>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Registre comportamentos observados e padrões identificados</li>
                        <li>• Documente progressões, regressões e marcos importantes</li>
                        <li>• Inclua informações sobre resposta aos programas de intervenção</li>
                        <li>• Anote considerações para planejamento futuro</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Editor de texto */}
                <div className="border-2 border-gray-200 rounded-lg focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-100 transition-all">
                  <textarea
                    id="notes-textarea"
                    placeholder="Comece a escrever suas anotações sobre o cliente aqui...

Exemplos do que incluir:
• Observações comportamentais
• Resposta aos programas de intervenção
• Interações sociais e comunicativas
• Marcos e progressões importantes
• Desafios identificados
• Recomendações para sessões futuras"
                    rows="20"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-6 py-4 border-none rounded-lg resize-vertical text-base leading-relaxed focus:outline-none placeholder:text-gray-400 placeholder:text-sm"
                  />
                </div>
                
                {/* Barra de ações */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="text-amber-500" />
                      <span>Editado hoje</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        notes !== (selectedPatient.general_notes || '') ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
                      }`}></div>
                      <span>
                        {notes !== (selectedPatient.general_notes || '') ? 'Alterações não salvas' : 'Tudo salvo'}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !selectedPatient || notes === (selectedPatient.general_notes || '')}
                    className={`
                      font-semibold py-3 px-8 rounded-lg text-sm transition-all duration-200 flex items-center justify-center min-w-[160px] shadow-sm transform hover:scale-105 disabled:hover:scale-100
                      ${saveSuccess 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-green-200' 
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-200 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-gray-200'
                      }
                    `}
                  >
                    <div className="bg-white bg-opacity-20 p-1 rounded-full mr-3">
                      <FontAwesomeIcon icon={isSaving ? faSpinner : (saveSuccess ? faCheck : faSave)} className={`text-sm ${isSaving && 'fa-spin'}`} />
                    </div>
                    {isSaving ? 'Salvando...' : saveSuccess ? 'Salvo com Sucesso!' : 'Salvar Anotações'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Estado vazio melhorado */
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-center h-96 text-center p-8">
                <div>
                  <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-8 rounded-full w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                    <FontAwesomeIcon icon={faPencilAlt} className="text-5xl text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Editor de Anotações</h3>
                  <p className="text-gray-600 leading-relaxed max-w-md mx-auto mb-6">
                    Selecione um cliente na barra lateral para começar a registrar anotações importantes 
                    sobre seu progresso e desenvolvimento.
                  </p>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-lg p-4 max-w-sm mx-auto">
                    <div className="flex items-center justify-center space-x-3 text-indigo-600">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                      <span className="font-medium">Aguardando seleção de cliente</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotesPage;
