import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { getChatMessages, postChatMessage } from '../../api/parentChatApi';
import { useAuth } from '../../context/AuthContext';
import { SOCKET_URL } from '../../config';
import './ParentTherapistChat.css';



const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width="24"
    height="24"
  >
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

// Ícones para status de leitura com cores contrastantes
const CheckIcon = ({ double = false, read = false, onDarkBackground = false }) => {
  // Cores contrastantes para fundo azul vs fundo claro
  const getColor = () => {
    if (onDarkBackground) {
      // Para mensagens enviadas (fundo azul escuro)
      if (read) return '#00ff88'; // Verde claro/neon para "lido" 
      return '#ffffff'; // Branco para "entregue"
    } else {
      // Para mensagens recebidas (fundo claro) 
      if (read) return '#00c851'; // Verde escuro para "lido"
      return '#666666'; // Cinza escuro para "entregue"
    }
  };

  return (
    <svg 
      width="18" 
      height="12" 
      viewBox="0 0 18 12" 
      fill="none"
      style={{ 
        display: 'inline-block',
        filter: onDarkBackground && read ? 'drop-shadow(0 0 2px rgba(0, 255, 136, 0.5))' : 'none' // Glow para destaque
      }}
    >
      {/* Primeiro check */}
      <path 
        d="M3.5 6L6 8.5L14.5 0" 
        stroke={getColor()} 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* Segundo check para "lido" */}
      {double && (
        <path 
          d="M6.5 6L9 8.5L17.5 0" 
          stroke={getColor()} 
          strokeWidth="1.8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

// Função para obter badge de especialidade baseado no role/nome
const getSpecialtyBadge = (userName, role) => {
  // Mapeamento baseado em padrões comuns de nomes/especialidades
  const specialtyMap = {
    // Por nome/especialidade detectada
    'fono': { badge: '🗣️ Fono', color: '#3498db', avatar: 'FO' },
    'fonoaudiologia': { badge: '🗣️ Fono', color: '#3498db', avatar: 'FO' },
    'psico': { badge: '🧠 Psico', color: '#e74c3c', avatar: 'PS' },
    'psicologia': { badge: '🧠 Psico', color: '#e74c3c', avatar: 'PS' },
    'music': { badge: '🎵 Music', color: '#9b59b6', avatar: 'MU' },
    'musicoterapia': { badge: '🎵 Music', color: '#9b59b6', avatar: 'MU' },
    'to': { badge: '🏥 TO', color: '#f39c12', avatar: 'TO' },
    'terapiaocupacional': { badge: '🏥 TO', color: '#f39c12', avatar: 'TO' },
    'fisio': { badge: '🤸 Fisio', color: '#27ae60', avatar: 'FI' },
    'fisioterapia': { badge: '🤸 Fisio', color: '#27ae60', avatar: 'FI' },
    'psicomotricidade': { badge: '🤸 Psico', color: '#27ae60', avatar: 'PM' },
    'psicopedagogia': { badge: '📚 Psicoped', color: '#e67e22', avatar: 'PP' },
  };
  
  // Por role
  if (role === 'pai' || role === 'parent') {
    return { badge: '👨‍👩‍👧‍👦 Família', color: '#2ecc71', avatar: '👨‍👩‍👧‍👦' };
  }
  if (role === 'admin' || role === 'administrador') {
    return { badge: '⚙️ Admin', color: '#34495e', avatar: 'AD' };
  }
  
  // Busca por palavra-chave no nome
  if (userName) {
    const lowerName = userName.toLowerCase();
    for (const [key, value] of Object.entries(specialtyMap)) {
      if (lowerName.includes(key)) {
        return value;
      }
    }
  }
  
  // Default para terapeutas - usar iniciais do nome
  const initials = userName ? userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'TR';
  return { badge: '👨‍⚕️ Terapeuta', color: '#3498db', avatar: initials };
};

// Função para determinar role baseado no contexto
const getUserRole = (messageUserId, currentUserId, senderName) => {
  if (messageUserId === currentUserId) return 'current';
  
  const lowerName = (senderName || '').toLowerCase();
  
  // Detecta especialidade específica
  if (lowerName.includes('fono')) return 'fono';
  if (lowerName.includes('psico') && !lowerName.includes('psicomotricidade')) return 'psico';
  if (lowerName.includes('music')) return 'music';
  if (lowerName.includes('to') || lowerName.includes('terapiaocupacional')) return 'to';
  if (lowerName.includes('fisio')) return 'fisio';
  if (lowerName.includes('psicomotricidade')) return 'fisio';
  if (lowerName.includes('psicopedagogia')) return 'psicoped';
  
  // Detecta se é pai/família
  if (lowerName.includes('pai') || lowerName.includes('mãe') || lowerName.includes('mae') || 
      lowerName.includes('familia') || lowerName.includes('responsavel')) {
    return 'parent';
  }
  
  // Detecta admin
  if (lowerName.includes('admin')) return 'admin';
  
  return 'therapist'; // Assume terapeuta por padrão
};

// Função para determinar status da mensagem
const getMessageStatus = (message, isOwnMessage) => {
  if (!isOwnMessage) return null; // Só mostra status para mensagens próprias
  
  // Se é uma mensagem otimista (ainda enviando)
  if (message.isOptimistic) {
    return { 
      type: 'sending', 
      icon: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', opacity: 0.8 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="1.5" fill="#ffffff" opacity="0.7">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
      ), 
      text: 'Enviando...' 
    };
  }
  
  // Se tem ID real (foi entregue ao servidor)
  if (message.id && !message.isOptimistic) {
    // Simular "lido" após 5 segundos (em produção viria do backend)
    const now = Date.now();
    const messageTime = new Date(message.created_at).getTime();
    const isRead = (now - messageTime) > 5000;
    
    if (isRead) {
      return {
        type: 'read',
        icon: <CheckIcon double={true} read={true} onDarkBackground={true} />,
        text: 'Lido'
      };
    } else {
      return {
        type: 'delivered',
        icon: <CheckIcon double={true} read={false} onDarkBackground={true} />,
        text: 'Entregue'
      };
    }
  }
  
  // Mensagem enviada mas ainda não confirmada
  return { 
    type: 'sent', 
    icon: <CheckIcon double={false} read={false} onDarkBackground={true} />, 
    text: 'Enviado' 
  };
};

const ParentTherapistChat = ({ patientId, patientName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const messagesEndRef = useRef(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Disparar evento para atualizar notificações quando as mensagens são visualizadas
    if (messages.length > 0) {
      window.dispatchEvent(new CustomEvent('notificationUpdate'));
    }
  }, [messages]);

  // Force re-render para atualizar status de leitura
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(prev => prev + 1);
    }, 1000); // Atualiza a cada segundo

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!patientId) return;

    const socket = io(SOCKET_URL);

    // --- CORREÇÃO APLICADA AQUI ---
    // Agora, enviamos o nome completo da sala para o servidor,
    // garantindo que a comunicação em tempo real funcione corretamente.
    const roomName = `patient-${patientId}`;
    socket.emit('joinRoom', roomName);
    socket.on('newMessage', (incomingMessage) => {
      console.log('Mensagem recebida via Socket.IO:', incomingMessage);
      setMessages((prevMessages) => {
        // Se a mensagem recebida via Socket.IO tem um clientId, significa que é a nossa própria mensagem
        // que foi confirmada pelo servidor. Substituímos a versão otimista.
        if (incomingMessage.clientId) {
          return prevMessages.map(msg => 
            msg.id === incomingMessage.clientId 
              ? { ...incomingMessage, isOptimistic: false } 
              : msg
          );
        } else {
          // Se não tem clientId, é uma mensagem de outro usuário ou uma mensagem que não foi otimista.
          // Adicionamos apenas se não houver uma mensagem com o mesmo ID real.
          if (prevMessages.some(msg => msg.id === incomingMessage.id)) {
            return prevMessages;
          }
          return [...prevMessages, incomingMessage];
        }
      });
    });

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const initialMessages = await getChatMessages(patientId);
        setMessages(initialMessages);
        setError(null);
      } catch (err) {
        setError('Não foi possível carregar as mensagens.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    return () => {
      socket.disconnect();
    };
  }, [patientId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user) return;

    let clientId; // Usar clientId para correlacionar mensagens otimistas

    try {
      clientId = Date.now().toString(); // Gerar um clientId único
      const messageToSend = {
        id: clientId, // Usar clientId como id temporário
        sender_id: user.id,
        sender_name: user.full_name,
        message: newMessage,
        created_at: new Date().toISOString(),
        patient_id: patientId,
        isOptimistic: true, // Marcar como otimista
      };

      setMessages((prevMessages) => [...prevMessages, messageToSend]);
      setNewMessage('');

            const createdMessage = await postChatMessage({ patient_id: patientId, message: newMessage, sender_id: user.id, clientId: clientId }); // Enviar clientId

      // Removido: A atualização otimística será feita via Socket.IO
      // setMessages((prevMessages) =>
      //   prevMessages.map((msg) =>
      //     msg.id === clientId ? { ...createdMessage, sender_name: user.full_name, isOptimistic: false } : msg
      //   )
      // );

      window.dispatchEvent(new CustomEvent('messageSentOrReceived'));

    } catch (err) {
      setError('Falha ao enviar mensagem.');
      if (clientId) {
        setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== clientId));
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h3>Conversa sobre {patientName}</h3>
      </header>
      <main className="chat-messages">
        {loading && <p className="chat-info">Carregando mensagens...</p>}
        {error && <p className="chat-info error">{error}</p>}
        {!loading && messages.length === 0 && (
          <p className="chat-info">Nenhuma mensagem ainda. Seja o primeiro a começar!</p>
        )}
        {user && messages.map((msg) => {
          const isOwnMessage = msg.sender_id === user.id;
          const role = getUserRole(msg.sender_id, user.id, msg.sender_name);
          const specialtyInfo = getSpecialtyBadge(msg.sender_name, role);
          const messageStatus = getMessageStatus(msg, isOwnMessage);
          
          return (
            <div key={msg.id} className={`message-wrapper ${isOwnMessage ? 'sent' : 'received'}`}>
              {!isOwnMessage && (
                <div 
                  className="message-avatar received"
                  style={{ backgroundColor: specialtyInfo.color }}
                >
                  {specialtyInfo.avatar}
                </div>
              )}
              
              <div className={`message-bubble ${isOwnMessage ? 'sent' : 'received'} ${role}`}>
                <div className="message-sender">
                  {isOwnMessage ? 'Você' : (
                    <span>
                      {msg.sender_name}
                      <span 
                        className="specialty-badge"
                        style={{ 
                          backgroundColor: specialtyInfo.color,
                          color: 'white',
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          marginLeft: '8px',
                          fontWeight: '500'
                        }}
                      >
                        {specialtyInfo.badge}
                      </span>
                    </span>
                  )}
                </div>
                <div className="message-content">{msg.message}</div>
                <div className="message-timestamp">
                  {formatDate(msg.created_at)}
                  {messageStatus && (
                    <span className="message-status" style={{ marginLeft: '8px', opacity: 0.7 }}>
                      {messageStatus.icon}
                    </span>
                  )}
                </div>
              </div>
              
              {isOwnMessage && (
                <div 
                  className="message-avatar sent"
                  style={{ backgroundColor: '#007bff' }}
                >
                  EU
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>
      <footer className="chat-input-area">
        <form onSubmit={handleSendMessage} className="chat-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="chat-input"
            disabled={loading}
          />
          <button type="submit" className="send-button" disabled={!newMessage.trim()}>
            <SendIcon />
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ParentTherapistChat;
