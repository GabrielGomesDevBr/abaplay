import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { getPromptLevels } from '../../api/programApi';

const PromptLevelSelector = ({ selectedLevel, onLevelChange, disabled = false }) => {
  const [levels, setLevels] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPromptLevels();
  }, []);

  const loadPromptLevels = async () => {
    try {
      setLoading(true);
      const levelsData = await getPromptLevels();
      setLevels(levelsData);
      
      // Se não há nível selecionado, seleciona o nível 5 (Independente) como padrão
      if (selectedLevel === undefined || selectedLevel === null) {
        onLevelChange(5);
      }
    } catch (err) {
      console.error('Erro ao carregar níveis de prompting:', err);
      setError('Erro ao carregar níveis de prompting');
    } finally {
      setLoading(false);
    }
  };

  const handleLevelSelect = (levelId) => {
    onLevelChange(levelId);
    setIsOpen(false);
  };

  const getSelectedLevelData = () => {
    return levels.find(level => level.id === selectedLevel);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Nível de Prompting</label>
        <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Nível de Prompting</label>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  const selectedLevelData = getSelectedLevelData();

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <label className="block text-sm font-medium text-gray-700">
          Nível de Prompting Atual
        </label>
        <div className="group relative">
          <FontAwesomeIcon 
            icon={faInfoCircle} 
            className="text-blue-500 text-xs cursor-help" 
          />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48 z-10">
            Define o nível de ajuda necessário para a criança realizar a tarefa
          </div>
        </div>
      </div>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm text-left flex items-center justify-between transition-colors ${
            disabled 
              ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-white border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
          }`}
        >
          <div className="flex items-center space-x-3">
            {selectedLevelData && (
              <>
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: selectedLevelData.color }}
                ></div>
                <span className="font-medium">{selectedLevelData.name}</span>
                <span className="text-gray-500 text-sm">
                  (Nível {selectedLevelData.id})
                </span>
              </>
            )}
          </div>
          <FontAwesomeIcon 
            icon={faChevronDown} 
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && !disabled && (
          <>
            {/* Overlay para fechar ao clicar fora */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            ></div>
            
            {/* Menu dropdown */}
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
              {levels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => handleLevelSelect(level.id)}
                  className={`w-full px-3 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                    selectedLevel === level.id ? 'bg-indigo-50 text-indigo-700' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: level.color }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{level.name}</span>
                        <span className="text-gray-500 text-sm">(Nível {level.id})</span>
                        {level.id === 5 && <span className="text-yellow-500">⭐</span>}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {level.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Descrição do nível selecionado */}
      {selectedLevelData && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-sm text-gray-700">
            <strong>Descrição:</strong> {selectedLevelData.description}
          </div>
          {selectedLevelData.id === 5 && (
            <div className="text-xs text-amber-600 mt-1 flex items-center space-x-1">
              <span>⭐</span>
              <span>Apenas este nível conta para critério de domínio (80%+)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptLevelSelector;