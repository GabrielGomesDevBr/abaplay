import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faCheck, 
  faPlus, 
  faEye,
  faMagic,
  faEdit
} from '@fortawesome/free-solid-svg-icons';

/**
 * Modal para preview e edição da sugestão de texto gerada automaticamente
 * Permite ao terapeuta visualizar, editar e decidir como usar a sugestão
 */
const SuggestionPreviewModal = ({ 
  isOpen, 
  onClose, 
  suggestedText, 
  currentText, 
  onUseSuggestion, 
  onAppendSuggestion,
  isGenerating = false 
}) => {
  const [editedText, setEditedText] = useState(suggestedText);
  const [isEditing, setIsEditing] = useState(false);

  // Resetar texto editado quando a sugestão muda
  React.useEffect(() => {
    setEditedText(suggestedText);
    setIsEditing(false);
  }, [suggestedText]);

  const handleUseSuggestion = () => {
    onUseSuggestion(isEditing ? editedText : suggestedText);
    onClose();
  };

  const handleAppendSuggestion = () => {
    const textToAppend = isEditing ? editedText : suggestedText;
    const separator = currentText.trim() ? '\n\n' : '';
    onAppendSuggestion(currentText + separator + textToAppend);
    onClose();
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      // Salvar edições
      setIsEditing(false);
    } else {
      // Entrar em modo de edição
      setIsEditing(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faMagic} className="text-indigo-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-800">
              Sugestão de Texto Automática
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isGenerating}
          >
            <FontAwesomeIcon icon={faTimes} className="text-lg" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Info section */}
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-start space-x-2">
              <FontAwesomeIcon icon={faEye} className="text-blue-600 mt-1 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Como usar esta sugestão:</p>
                <ul className="text-xs space-y-1">
                  <li>• <strong>Substituir:</strong> Remove o texto atual e usa apenas a sugestão</li>
                  <li>• <strong>Adicionar:</strong> Mantém o texto atual e adiciona a sugestão ao final</li>
                  <li>• <strong>Editar:</strong> Permite modificar a sugestão antes de usar</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Aviso de responsabilidade profissional */}
          <div className="p-4 bg-amber-50 border-b border-amber-200">
            <div className="flex items-start space-x-2">
              <span className="text-amber-600 mt-1 flex-shrink-0">⚠️</span>
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Importante - Responsabilidade Profissional:</p>
                <p className="text-xs">
                  Esta sugestão é gerada automaticamente baseada <strong>apenas em dados quantitativos</strong> (pontuações, sessões, etc.). 
                  É <strong>imprescindível</strong> que você, como profissional responsável, revise, adapte e complemente este texto com:
                </p>
                <ul className="text-xs mt-2 space-y-1">
                  <li>• Análise comportamental qualitativa</li>
                  <li>• Observações clínicas específicas</li>
                  <li>• Contexto individual do paciente</li>
                  <li>• Aspectos não capturados pelos dados numéricos</li>
                </ul>
                <p className="text-xs mt-2 font-medium">
                  A ferramenta é um suporte para agilizar seu trabalho, não um substituto para sua expertise profissional.
                </p>
              </div>
            </div>
          </div>

          {/* Text preview/edit area */}
          <div className="flex-1 p-5 overflow-y-auto">
            {isGenerating ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Gerando sugestão baseada nos dados do paciente...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Edit toggle */}
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-700">
                    {isEditing ? 'Editando Sugestão' : 'Texto Sugerido'}
                  </h3>
                  <button
                    onClick={handleToggleEdit}
                    className="flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <FontAwesomeIcon 
                      icon={isEditing ? faCheck : faEdit} 
                      className="mr-2" 
                    />
                    {isEditing ? 'Salvar Edições' : 'Editar Texto'}
                  </button>
                </div>

                {/* Text display/edit */}
                {isEditing ? (
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows="20"
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono resize-none"
                    placeholder="Edite o texto sugerido..."
                  />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                      {suggestedText || 'Nenhuma sugestão disponível'}
                    </pre>
                  </div>
                )}

                {/* Character count */}
                <div className="text-xs text-gray-500 text-right">
                  {(isEditing ? editedText : suggestedText)?.length || 0} caracteres
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isGenerating}
          >
            Cancelar
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={handleAppendSuggestion}
              disabled={isGenerating || !suggestedText}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md text-sm transition duration-150 ease-in-out shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Adicionar ao Texto
            </button>
            
            <button
              onClick={handleUseSuggestion}
              disabled={isGenerating || !suggestedText}
              className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md text-sm transition duration-150 ease-in-out shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faCheck} className="mr-2" />
              Substituir Texto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuggestionPreviewModal;