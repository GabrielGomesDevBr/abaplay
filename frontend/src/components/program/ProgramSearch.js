import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes, faBook, faEye, faPlus, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { searchPrograms } from '../../api/programApi';

const ProgramSearch = ({ 
  onProgramSelect, 
  onAssign, 
  assigningId, 
  assignedPrograms = [], 
  isPatientSelected = false,
  disciplineName = '',
  disciplineColors = {}
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Função de busca com debounce
  const performSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchPrograms(term, disciplineName); // Filtra pela disciplina ativa
      setSearchResults(results.slice(0, 8)); // Limite de 8 resultados
    } catch (error) {
      console.error('Erro na busca:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [disciplineName]);

  // Debounce da busca
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  // Gerencia a abertura/fechamento do dropdown
  useEffect(() => {
    setIsOpen(searchTerm.length > 0 && (searchResults.length > 0 || isLoading));
  }, [searchTerm, searchResults, isLoading]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearSearch = () => {
    setSearchTerm('');
    setIsOpen(false);
    searchRef.current?.focus();
  };

  const handleProgramClick = (program, action = 'view', event = null) => {
    if (action === 'assign' && onAssign) {
      onAssign(program.id);
      // Limpa a busca após atribuição
      setSearchTerm('');
      setIsOpen(false);
    } else if (action === 'view') {
      // Previne fechamento do dropdown ao visualizar
      if (event) {
        event.stopPropagation();
      }
      
      // Abre modal com detalhes do programa
      setSelectedProgram(program);
      setShowModal(true);
    }
  };

  const isAssigned = (programId) => {
    return Array.isArray(assignedPrograms) && 
           assignedPrograms.some(p => p.program_id === programId);
  };

  const formatAreaPath = (program) => {
    const parts = [];
    if (program.area_name && program.area_name !== program.sub_area_name) {
      parts.push(program.area_name);
    }
    if (program.sub_area_name) {
      parts.push(program.sub_area_name);
    }
    return parts.join(' → ');
  };

  return (
    <div className="relative mb-6">
      {/* Campo de busca */}
      <div className="relative" ref={searchRef}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <FontAwesomeIcon 
            icon={faSearch} 
            className={`${disciplineColors.text || 'text-gray-400'} transition-colors`}
          />
        </div>
        
        <input 
          type="text"
          placeholder={`Buscar programas de ${disciplineName}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`
            w-full pl-10 pr-12 py-3 
            border-2 rounded-lg 
            placeholder-gray-400 text-gray-800 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 
            transition-all duration-200 border-gray-300 focus:border-blue-500
            ${isOpen ? 'rounded-b-none' : ''}
          `}
        />
        
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`
            absolute top-full left-0 right-0 z-50 
            bg-white border-2 border-t-0 rounded-b-lg shadow-xl
            max-h-96 overflow-y-auto border-gray-300
          `}
        >
          {isLoading ? (
            <div className="px-4 py-6 text-center text-gray-500">
              <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl mb-2 opacity-50" />
              <p>Buscando programas...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((program, index) => {
                const programIsAssigned = isAssigned(program.id);
                const isAssigning = assigningId === program.id;
                
                return (
                  <div 
                    key={program.id}
                    className={`
                      px-4 py-3 hover:bg-gray-50 transition-colors
                      ${index < searchResults.length - 1 ? 'border-b border-gray-100' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Nome do programa */}
                        <div className="flex items-center space-x-2 mb-1">
                          <FontAwesomeIcon 
                            icon={faBook} 
                            className={`text-sm ${disciplineColors.text || 'text-gray-500'}`}
                          />
                          <h4 className="font-semibold text-gray-800 truncate">
                            {program.name}
                          </h4>
                          {programIsAssigned && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              Atribuído
                            </span>
                          )}
                        </div>
                        
                        {/* Caminho da área */}
                        <p className="text-xs text-gray-500 mb-1">
                          {formatAreaPath(program)}
                        </p>
                        
                        {/* Objetivo */}
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {program.objective || 'Sem objetivo definido'}
                        </p>
                      </div>
                      
                      {/* Botões de ação */}
                      <div className="flex items-center space-x-2 ml-3">
                        {/* Botão visualizar */}
                        <button
                          onClick={(e) => handleProgramClick(program, 'view', e)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Visualizar programa"
                        >
                          <FontAwesomeIcon icon={faEye} className="text-sm" />
                        </button>
                        
                        {/* Botão atribuir (apenas se paciente selecionado e não já atribuído) */}
                        {isPatientSelected && !programIsAssigned && (
                          <button
                            onClick={() => handleProgramClick(program, 'assign')}
                            disabled={isAssigning}
                            className={`
                              p-2 rounded-lg transition-colors text-sm
                              ${isAssigning
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-white bg-blue-600 hover:bg-blue-700'
                              }
                            `}
                            title="Atribuir programa"
                          >
                            <FontAwesomeIcon 
                              icon={isAssigning ? faSpinner : faPlus} 
                              className={isAssigning ? 'fa-spin' : ''} 
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-gray-500">
              <FontAwesomeIcon icon={faSearch} className="text-2xl mb-2 opacity-50" />
              <p>Nenhum programa encontrado</p>
              <p className="text-xs mt-1">Tente buscar por nome, objetivo ou área</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de visualização do programa */}
      {showModal && selectedProgram && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    {selectedProgram.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedProgram.discipline_name} → {selectedProgram.area_name} → {selectedProgram.sub_area_name}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-4">
              {selectedProgram.objective && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Objetivo:</h4>
                  <p className="text-gray-600 leading-relaxed">{selectedProgram.objective}</p>
                </div>
              )}

              {selectedProgram.skill && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Habilidade:</h4>
                  <p className="text-gray-600 leading-relaxed">{selectedProgram.skill}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedProgram.program_slug && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">Tag:</h4>
                    <p className="text-gray-600">{selectedProgram.program_slug}</p>
                  </div>
                )}

                {selectedProgram.trials && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-1">Tentativas:</h4>
                    <p className="text-gray-600">{selectedProgram.trials}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé com ações */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Fechar
                </button>
                
                {isPatientSelected && !isAssigned(selectedProgram.id) && (
                  <button
                    onClick={() => {
                      handleProgramClick(selectedProgram, 'assign');
                      setShowModal(false);
                    }}
                    disabled={assigningId === selectedProgram.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {assigningId === selectedProgram.id ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2" />
                        Atribuindo...
                      </>
                    ) : (
                      'Atribuir Programa'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramSearch;