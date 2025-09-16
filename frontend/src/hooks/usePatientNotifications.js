import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const usePatientNotifications = (patientIds = []) => {
  const [patientNotifications, setPatientNotifications] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Busca notificações para todos os pacientes
  const fetchAllPatientNotifications = useCallback(async () => {
    if (!patientIds.length) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const promises = patientIds.map(async (patientId) => {
        try {
          const response = await axios.get(
            `${API_URL}/notifications/patient/${patientId}`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          
          const parentCount = response.data.find(n => n.chatType === 'parent_chat')?.unreadCount || 0;
          const caseCount = response.data.find(n => n.chatType === 'case_discussion')?.unreadCount || 0;
          
          return {
            patientId,
            notifications: {
              parentChat: parentCount,
              caseDiscussion: caseCount,
              total: parentCount + caseCount
            }
          };
        } catch (error) {
          // Erro ao buscar notificações do paciente
          return {
            patientId,
            notifications: { parentChat: 0, caseDiscussion: 0, total: 0 }
          };
        }
      });

      const results = await Promise.all(promises);
      
      const notificationMap = {};
      results.forEach(({ patientId, notifications }) => {
        notificationMap[patientId] = notifications;
      });
      
      setPatientNotifications(notificationMap);
    } catch (error) {
      setError(error.message);
      // Erro geral ao buscar notificações
    } finally {
      setLoading(false);
    }
  }, []); // Removendo dependência de patientIds para evitar loop

  // Busca notificações de um paciente específico
  const fetchPatientNotifications = useCallback(async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/notifications/patient/${patientId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      const parentCount = response.data.find(n => n.chatType === 'parent_chat')?.unreadCount || 0;
      const caseCount = response.data.find(n => n.chatType === 'case_discussion')?.unreadCount || 0;
      
      const notifications = {
        parentChat: parentCount,
        caseDiscussion: caseCount,
        total: parentCount + caseCount
      };

      setPatientNotifications(prev => ({
        ...prev,
        [patientId]: notifications
      }));

      return notifications;
    } catch (error) {
      // Erro ao buscar notificações do paciente
      return { parentChat: 0, caseDiscussion: 0, total: 0 };
    }
  }, []);

  // Marca notificações como lidas
  const markAsRead = useCallback(async (patientId, chatType) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/notifications/mark-read`,
        {
          patientId,
          chatType
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      // Atualiza o estado local imediatamente
      setPatientNotifications(prev => {
        const current = prev[patientId] || { parentChat: 0, caseDiscussion: 0, total: 0 };
        const updated = { ...current };

        if (chatType === 'parent_chat') {
          updated.parentChat = 0;
        } else if (chatType === 'case_discussion') {
          updated.caseDiscussion = 0;
        }

        updated.total = updated.parentChat + updated.caseDiscussion;

        return {
          ...prev,
          [patientId]: updated
        };
      });

      // Dispara evento para atualizar outros componentes
      window.dispatchEvent(new CustomEvent('notificationUpdate'));

    } catch (error) {
      // Erro ao marcar como lida
    }
  }, []);

  // Ordena pacientes por prioridade de notificações
  const sortPatientsByPriority = useCallback((patients) => {
    return [...patients].sort((a, b) => {
      const aNotifications = patientNotifications[a.id]?.total || 0;
      const bNotifications = patientNotifications[b.id]?.total || 0;

      // Primeiro: ordenar por número de notificações (decrescente)
      if (aNotifications !== bNotifications) {
        return bNotifications - aNotifications;
      }

      // Segundo: alfabético por nome
      return a.name.localeCompare(b.name);
    });
  }, [patientNotifications]);

  // Categoriza pacientes por urgência
  const categorizePatients = useCallback((patients) => {
    const urgent = [];      // 3+ notificações
    const withNotifications = []; // 1-2 notificações  
    const normal = [];      // 0 notificações

    patients.forEach(patient => {
      const total = patientNotifications[patient.id]?.total || 0;
      
      if (total >= 3) {
        urgent.push(patient);
      } else if (total > 0) {
        withNotifications.push(patient);
      } else {
        normal.push(patient);
      }
    });

    // Ordena cada categoria alfabeticamente
    urgent.sort((a, b) => b.name.localeCompare(a.name));
    withNotifications.sort((a, b) => a.name.localeCompare(b.name));
    normal.sort((a, b) => a.name.localeCompare(b.name));

    return { urgent, withNotifications, normal };
  }, [patientNotifications]);

  // Função para buscar dados (reutilizável)
  const fetchData = useCallback(async () => {
    if (patientIds.length === 0) {
      setPatientNotifications({});
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const promises = patientIds.map(async (patientId) => {
        try {
          const response = await axios.get(
            `${API_URL}/notifications/patient/${patientId}`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          
          const parentCount = response.data.find(n => n.chatType === 'parent_chat')?.unreadCount || 0;
          const caseCount = response.data.find(n => n.chatType === 'case_discussion')?.unreadCount || 0;
          
          return {
            patientId,
            notifications: {
              parentChat: parentCount,
              caseDiscussion: caseCount,
              total: parentCount + caseCount
            }
          };
        } catch (error) {
          // Erro ao buscar notificações do paciente
          return {
            patientId,
            notifications: { parentChat: 0, caseDiscussion: 0, total: 0 }
          };
        }
      });

      const results = await Promise.all(promises);
      
      const notificationMap = {};
      results.forEach(({ patientId, notifications }) => {
        notificationMap[patientId] = notifications;
      });
      
      setPatientNotifications(notificationMap);
    } catch (error) {
      setError(error.message);
      // Erro geral ao buscar notificações
    } finally {
      setLoading(false);
    }
  }, [patientIds]);

  // Efeito para buscar notificações quando patientIds mudar
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Efeito para escutar eventos de atualização
  useEffect(() => {
    const handleRefresh = () => {
      fetchData();
    };

    window.addEventListener('notificationUpdate', handleRefresh);
    return () => {
      window.removeEventListener('notificationUpdate', handleRefresh);
    };
  }, [fetchData]);

  return {
    patientNotifications,
    loading,
    error,
    fetchPatientNotifications,
    fetchAllPatientNotifications,
    markAsRead,
    sortPatientsByPriority,
    categorizePatients
  };
};

export default usePatientNotifications;