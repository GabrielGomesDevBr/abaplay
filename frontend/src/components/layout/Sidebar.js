import React, { useState, useMemo } from 'react';
import { usePatients } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSpinner, faSearch } from '@fortawesome/free-solid-svg-icons';

const Sidebar = () => {
  const { patients, selectedPatient, selectPatient, isLoading } = usePatients();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSelectPatient = (patient) => {
    selectPatient(patient);
  };

  // A função handleNewPatient e o ícone faUserPlus foram removidos por não serem mais utilizados.

  const filteredPatients = useMemo(() => {
    if (!searchTerm) {
      return patients;
    }
    return patients.filter(patient =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <FontAwesomeIcon icon={faSpinner} className="fa-spin text-indigo-400 text-2xl" />
        </div>
    );
  }

  const renderPatientCount = () => {
      if (user?.is_admin) {
          return (
            <p className="text-xs text-gray-500">
                <span className="font-bold">{patients.length}</span> 
                / <span className="font-bold">{user?.max_patients || 0}</span> em uso
            </p>
          );
      }
      if (user?.role === 'terapeuta') {
          return (
            <p className="text-xs text-gray-500">
                <span className="font-bold">{patients.length}</span> cliente(s) atribuído(s)
            </p>
          );
      }
      return null;
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Clientes</h2>
        
        {renderPatientCount()}

        <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredPatients.length > 0 ? (
          <ul className="py-2">
            {filteredPatients.map((patient) => (
              <li key={patient.id}>
                <button
                  onClick={() => handleSelectPatient(patient)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center transition-colors duration-150 ${
                    selectedPatient?.id === patient.id
                      ? 'bg-indigo-50 border-r-4 border-indigo-500 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FontAwesomeIcon icon={faUser} className="mr-3 text-gray-400" />
                  {patient.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center p-6 text-sm text-gray-500">
            {searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente atribuído.'}
          </div>
        )}
      </div>

      {/* <<< ALTERAÇÃO APLICADA AQUI >>> 
        O bloco de código que renderizava o botão "Adicionar Paciente" no rodapé para administradores foi completamente removido.
      */}
    </div>
  );
};

export default Sidebar;
