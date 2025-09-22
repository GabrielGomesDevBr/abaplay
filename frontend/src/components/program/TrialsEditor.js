import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faSave, faTimes, faSpinner, faUndo } from '@fortawesome/free-solid-svg-icons';

const TrialsEditor = ({
  program,
  onUpdate,
  isLoading = false,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');

  const currentTrials = program.trials || program.default_trials || 'N/A';
  const isCustomized = program.custom_trials !== null && program.custom_trials !== undefined;

  const handleStartEdit = () => {
    setEditValue(currentTrials.toString());
    setIsEditing(true);
    setError('');
  };

  const handleSave = async () => {
    try {
      setError('');

      const numValue = editValue.trim() === '' ? null : parseInt(editValue);

      if (numValue !== null && (isNaN(numValue) || numValue < 1 || numValue > 999)) {
        setError('Digite um número entre 1 e 999, ou deixe vazio para usar o padrão.');
        return;
      }

      await onUpdate(program.assignment_id, numValue);
      setIsEditing(false);
    } catch (error) {
      setError('Erro ao salvar tentativas. Tente novamente.');
      console.error('Erro ao atualizar tentativas:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
    setError('');
  };

  const handleResetToDefault = async () => {
    try {
      setError('');
      await onUpdate(program.assignment_id, null);
    } catch (error) {
      setError('Erro ao restaurar padrão. Tente novamente.');
      console.error('Erro ao restaurar tentativas padrão:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className={`w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 ${
              error
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Auto"
            min="1"
            max="999"
            autoFocus
            disabled={isLoading}
          />

          <button
            onClick={handleSave}
            disabled={isLoading}
            className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
            title="Salvar"
          >
            {isLoading ? (
              <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
            ) : (
              <FontAwesomeIcon icon={faSave} />
            )}
          </button>

          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            title="Cancelar"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {error && (
          <span className="text-xs text-red-500 mt-1">{error}</span>
        )}

        <span className="text-xs text-gray-500 mt-1">
          Padrão: {program.default_trials} • Enter: Salvar • Esc: Cancelar
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex flex-col">
        <div className="flex items-center space-x-1">
          <span className={`text-sm font-medium ${
            isCustomized ? 'text-blue-600' : 'text-gray-700'
          }`}>
            {currentTrials} tentativas
          </span>

          {!disabled && (
            <button
              onClick={handleStartEdit}
              disabled={isLoading}
              className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
              title="Editar tentativas"
            >
              <FontAwesomeIcon icon={faEdit} className="text-xs" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {isCustomized && (
            <>
              <span className="text-xs text-blue-500">
                Customizado
              </span>
              {!disabled && (
                <button
                  onClick={handleResetToDefault}
                  disabled={isLoading}
                  className="text-xs text-gray-400 hover:text-orange-600 disabled:opacity-50"
                  title={`Restaurar padrão (${program.default_trials})`}
                >
                  <FontAwesomeIcon icon={faUndo} />
                </button>
              )}
            </>
          )}

          {!isCustomized && program.default_trials && (
            <span className="text-xs text-gray-400">
              Padrão
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrialsEditor;