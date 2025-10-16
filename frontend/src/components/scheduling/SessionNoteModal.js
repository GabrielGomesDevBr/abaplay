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
 *
 * RESPONSIVO: Fullscreen em mobile (<768px), modal centrado em desktop
 */

// Hook personalizado para detectar dispositivos móveis
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

const SessionNoteModal = ({
  session,
  isOpen,
  onClose,
  onSave
}) => {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

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
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 ${isMobile ? '' : 'flex items-center justify-center p-4'}`}>
      <div className={`bg-white shadow-xl overflow-y-auto ${
        isMobile
          ? 'w-full h-full'
          : 'rounded-lg max-w-2xl w-full max-h-[90vh]'
      }`}>
        {/* Header - Mais compacto no mobile */}
        <div className={`flex items-center justify-between border-b border-gray-200 ${isMobile ? 'p-4' : 'p-6'}`}>
          <h2 className={`font-semibold text-gray-800 ${isMobile ? 'text-lg' : 'text-xl'}`}>
            {session.notes ? 'Editar Anotação' : 'Registrar Sessão'}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSaving}
          >
            <X size={isMobile ? 20 : 24} />
          </button>
        </div>

        {/* Body - Espaçamento otimizado para mobile */}
        <div className={`space-y-4 ${isMobile ? 'p-4 pb-20' : 'p-6 space-y-6'}`}>
          {/* Informações da Sessão - Mais compacto no mobile */}
          <div className={`bg-blue-50 border border-blue-200 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
            <h3 className={`font-semibold text-blue-900 mb-2 ${isMobile ? 'text-sm' : ''}`}>Detalhes da Sessão</h3>
            <div className={`space-y-1 text-blue-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              <p><strong>Paciente:</strong> {session.patient_name}</p>
              <p><strong>Data:</strong> {new Date(session.scheduled_at).toLocaleDateString('pt-BR', {
                weekday: isMobile ? 'short' : 'long',
                day: '2-digit',
                month: isMobile ? 'short' : 'long',
                year: 'numeric'
              })}</p>
              <p><strong>Horário:</strong> {session.start_time} - {session.end_time}</p>
              {session.discipline_name && (
                <p><strong>Disciplina:</strong> {session.discipline_name}</p>
              )}
            </div>
          </div>

          {/* Campo de Anotações - Altura otimizada para teclado mobile */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anotações da Sessão <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o que foi trabalhado na sessão, comportamentos observados, progressos ou dificuldades..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={isMobile ? 10 : 8}
              disabled={isSaving}
              style={isMobile ? { minHeight: '200px' } : {}}
            />
            <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
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

        {/* Footer - Fixo no rodapé em mobile, normal em desktop */}
        <div className={`flex items-center justify-end gap-3 border-t border-gray-200 bg-white ${
          isMobile
            ? 'fixed bottom-0 left-0 right-0 p-4 shadow-lg'
            : 'p-6'
        }`}>
          <button
            onClick={handleCancel}
            className={`text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors ${
              isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-2'
            }`}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={`bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed ${
              isMobile ? 'px-4 py-2 text-sm flex-1' : 'px-6 py-2'
            }`}
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
