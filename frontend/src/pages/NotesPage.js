import React, { useState, useEffect } from 'react';
import { usePatients } from '../context/PatientContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faSave, faSpinner, faCheck, faPencilAlt } from '@fortawesome/free-solid-svg-icons';

const NotesPage = () => {
  const { selectedPatient, saveNotes } = usePatients();
  
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Efeito para atualizar a área de texto quando o cliente selecionado muda
  useEffect(() => {
    if (selectedPatient) {
      setNotes(selectedPatient.general_notes || '');
    } else {
      setNotes('');
    }
    setSaveSuccess(false);
    setError('');
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
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError(err.message || "Ocorreu um erro ao guardar as anotações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="flex items-center mb-6">
        <FontAwesomeIcon icon={faPencilAlt} className="text-2xl text-indigo-500 mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Anotações Gerais</h1>
      </div>
      
      {selectedPatient ? (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Anotações para: <span className="text-indigo-600 font-bold">{selectedPatient.name}</span>
          </h2>
          <textarea
            id="notes-textarea"
            placeholder="Anotações gerais sobre o cliente, seu progresso, comportamentos observados e planeamento..."
            rows="18"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-sm resize-vertical leading-relaxed"
          />
          <div className="flex items-center justify-end mt-4">
            {error && <p className="text-red-500 text-sm mr-4">{error}</p>}
            <button
              onClick={handleSave}
              disabled={isSaving || !selectedPatient}
              className={`font-semibold py-2.5 px-6 rounded-lg text-sm transition-all duration-200 flex items-center justify-center w-40 shadow hover:shadow-lg disabled:opacity-60 active:scale-95
                ${saveSuccess 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
            >
              <FontAwesomeIcon icon={isSaving ? faSpinner : (saveSuccess ? faCheck : faSave)} className={`mr-2 ${isSaving && 'fa-spin'}`} />
              {isSaving ? 'A Guardar...' : saveSuccess ? 'Guardado!' : 'Guardar Anotações'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-gray-500 p-10 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 h-[calc(100vh-200px)]">
          <FontAwesomeIcon icon={faUserCircle} className="text-6xl text-gray-300 mb-5" />
          <p className="text-xl font-medium text-gray-600">Selecione um cliente</p>
          <p className="mt-2 text-base">
            Escolha um cliente na barra lateral para ver ou editar as suas anotações gerais.
          </p>
        </div>
      )}
    </div>
  );
};

export default NotesPage;
