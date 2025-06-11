// frontend/src/components/admin/AssignmentModal.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPatientAssignments, updatePatientAssignments } from '../../api/adminApi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faSpinner, faUsers } from '@fortawesome/free-solid-svg-icons';

const AssignmentModal = ({ isOpen, onClose, patient, allTherapists = [] }) => {
  const { token } = useAuth();
  const [selectedTherapistIds, setSelectedTherapistIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Carrega as atribuições atuais sempre que o modal abre para um novo paciente
    if (isOpen && patient) {
      const fetchAssignments = async () => {
        setIsLoading(true);
        setError('');
        try {
          const assignedTherapists = await getPatientAssignments(patient.id, token);
          // Inicializa o estado com os IDs dos terapeutas já atribuídos
          setSelectedTherapistIds(new Set(assignedTherapists.map(t => t.id)));
        } catch (err) {
          setError(err.message || 'Não foi possível carregar as atribuições.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchAssignments();
    }
  }, [isOpen, patient, token]);

  const handleCheckboxChange = (therapistId) => {
    setSelectedTherapistIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (newSelectedIds.has(therapistId)) {
        newSelectedIds.delete(therapistId);
      } else {
        newSelectedIds.add(therapistId);
      }
      return newSelectedIds;
    });
  };

  const handleSave = async () => {
    if (!patient) return;

    setIsSaving(true);
    setError('');
    try {
      const idsToSave = Array.from(selectedTherapistIds);
      await updatePatientAssignments(patient.id, idsToSave, token);
      onClose(); // Fecha o modal em caso de sucesso
    } catch (err) {
      setError(err.message || 'Não foi possível guardar as atribuições.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <FontAwesomeIcon icon={faUsers} className="mr-3 text-indigo-500"/>
            Gerir Terapeutas para: <span className="font-bold ml-2">{patient?.name}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={faTimes} className="text-lg" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="text-center">
              <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl text-indigo-500" />
              <p className="mt-2 text-sm text-gray-500">A carregar atribuições...</p>
            </div>
          ) : error ? (
             <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{error}</p>
          ) : (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-gray-900 mb-2">Selecione os terapeutas a serem atribuídos:</legend>
              {allTherapists.length > 0 ? (
                allTherapists.map(therapist => (
                  <div key={therapist.id} className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id={`therapist-${therapist.id}`}
                        name={`therapist-${therapist.id}`}
                        type="checkbox"
                        checked={selectedTherapistIds.has(therapist.id)}
                        onChange={() => handleCheckboxChange(therapist.id)}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor={`therapist-${therapist.id}`} className="font-medium text-gray-700 cursor-pointer">
                        {therapist.full_name}
                      </label>
                      <p className="text-gray-500 text-xs">ID: {therapist.id} | Username: {therapist.username}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">Nenhum terapeuta encontrado na clínica.</p>
              )}
            </fieldset>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} type="button" className="bg-white hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-md border border-gray-300 mr-3">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving || isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors shadow flex items-center disabled:opacity-60">
            <FontAwesomeIcon icon={isSaving ? faSpinner : faSave} className={`mr-2 ${isSaving && 'fa-spin'}`} />
            {isSaving ? 'A guardar...' : 'Guardar Atribuições'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentModal;
