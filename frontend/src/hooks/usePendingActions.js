import { useState, useEffect, useCallback } from 'react';
import { getPendingActions } from '../api/schedulingApi';
import { useAuth } from '../context/AuthContext';

/**
 * Hook customizado para gerenciar ações pendentes de agendamento
 * Centraliza a lógica de busca e contagem de pendências (órfãs + perdidas)
 */
const usePendingActions = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [orphansCount, setOrphansCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPendingActions = useCallback(async () => {
    // Apenas admins têm acesso ao sistema de pendências
    if (!user?.is_admin) {
      setPendingCount(0);
      setOrphansCount(0);
      setMissedCount(0);
      setLoading(false);
      return;
    }

    try {
      const data = await getPendingActions();

      const orphans = data.orphan_sessions_count || 0;
      const missed = data.missed_appointments_count || 0;
      const total = orphans + missed;

      setOrphansCount(orphans);
      setMissedCount(missed);
      setPendingCount(total);
    } catch (error) {
      // Silenciar erro - pendências são informativas, não críticas
      setPendingCount(0);
      setOrphansCount(0);
      setMissedCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.is_admin) {
      fetchPendingActions();

      // Polling a cada 60 segundos (menos frequente que notificações)
      const interval = setInterval(fetchPendingActions, 60000);

      // Escuta eventos personalizados de atualização
      window.addEventListener('pendingActionsUpdate', fetchPendingActions);

      return () => {
        clearInterval(interval);
        window.removeEventListener('pendingActionsUpdate', fetchPendingActions);
      };
    }
  }, [user, fetchPendingActions]);

  return {
    pendingCount,
    orphansCount,
    missedCount,
    loading,
    refresh: fetchPendingActions
  };
};

export default usePendingActions;
