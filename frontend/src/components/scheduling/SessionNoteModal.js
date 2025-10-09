import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal para adicionar/editar anotações de sessão (Plano Agendamento)
 *
 * Esta é a interface SIMPLIFICADA para o plano agendamento, que NÃO inclui:
 * - Seleção de programas
 * - Níveis de prompt
 * - Registro de tentativas
 * - Cálculo de progresso
 *
 * Apenas permite marcar a sessão como realizada e adicionar uma nota geral.
 */
const SessionNoteModal = ({
  session,
  isOpen,
  onClose,
  onSave
}) => {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Preenche notas existentes ao abrir modal
  useEffect(() => {
    if (isOpen && session) {
      setNotes(session.notes || '');
      setError('');
    }
  }, [isOpen, session]);

  const handleSave = async () => {
    if (!notes.trim()) {
      setError('Por favor, adicione uma anotação sobre a sessão.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave(session.id, notes.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao salvar anotação. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNotes(session?.notes || '');
    setError('');
    onClose();
  };

  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {session.notes ? 'Editar Anotação da Sessão' : 'Marcar Sessão como Realizada'}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSaving}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Informações da Sessão */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Detalhes da Sessão</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p><strong>Paciente:</strong> {session.patient_name}</p>
              <p><strong>Data:</strong> {new Date(session.scheduled_at).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}</p>
              <p><strong>Horário:</strong> {session.start_time} - {session.end_time}</p>
              {session.discipline_name && (
                <p><strong>Disciplina:</strong> {session.discipline_name}</p>
              )}
            </div>
          </div>

          {/* Campo de Anotações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anotações da Sessão <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o que foi trabalhado na sessão, comportamentos observados, progressos ou dificuldades..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={8}
              disabled={isSaving}
            />
            <p className="text-xs text-gray-500 mt-1">
              Esta anotação será salva no registro da sessão e poderá ser visualizada posteriormente.
            </p>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar Anotação'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionNoteModal;
