import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { getChatMessages, postChatMessage } from '../../api/parentChatApi';
import { getTherapistContacts } from '../../api/contactApi';
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
  const [therapists, setTherapists] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const { user } = useAuth();

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
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

  // Carregar lista de terapeutas para menções
  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        console.log('[PARENT-CHAT] Carregando terapeutas para menções:', { patientId, userRole: user?.role });
        const data = await getTherapistContacts(patientId);
        console.log('[PARENT-CHAT] Terapeutas carregados:', data.therapists);
        setTherapists(data.therapists || []);
      } catch (error) {
        console.error('[PARENT-CHAT] Erro ao carregar terapeutas:', error);
        setTherapists([]);
      }
    };

    if (patientId) {
      console.log('[PARENT-CHAT] Iniciando carregamento de terapeutas');
      fetchTherapists();
    } else {
      console.log('[PARENT-CHAT] Não carregando terapeutas - patientId:', patientId);
    }
  }, [patientId, user]);

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

  // Função para detectar menções no input
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    console.log('[PARENT-CHAT] Input mudou:', value);
    console.log('[PARENT-CHAT] Terapeutas disponíveis:', therapists.length);

    // Detectar se está digitando uma menção
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      
      console.log('[PARENT-CHAT] Detectou @:', { lastAtIndex, textAfterAt, spaceIndex });
      
      if (spaceIndex === -1) {
        // Ainda digitando a menção
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentionDropdown(true);
        setSelectedMentionIndex(0); // Reset selection
        console.log('[PARENT-CHAT] Mostrando dropdown - busca:', textAfterAt.toLowerCase());
      } else {
        setShowMentionDropdown(false);
        console.log('[PARENT-CHAT] Escondendo dropdown - espaço encontrado');
      }
    } else {
      setShowMentionDropdown(false);
      console.log('[PARENT-CHAT] Escondendo dropdown - sem @');
    }
  };

  // Função para lidar com teclas de navegação
  const handleKeyDown = (e) => {
    if (!showMentionDropdown || filteredTherapists.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredTherapists.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredTherapists.length - 1
        );
        break;
      case 'Enter':
        if (showMentionDropdown && filteredTherapists[selectedMentionIndex]) {
          e.preventDefault();
          insertMention(filteredTherapists[selectedMentionIndex]);
        }
        break;
      case 'Escape':
        setShowMentionDropdown(false);
        break;
    }
  };

  // Função para inserir menção
  const insertMention = (therapist) => {
    const lastAtIndex = newMessage.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = newMessage.substring(0, lastAtIndex);
      const mention = `@${therapist.full_name} `;
      setNewMessage(beforeAt + mention);
    }
    setShowMentionDropdown(false);
    inputRef.current?.focus();
  };

  // Filtrar terapeutas baseado na busca mais inteligente
  const filteredTherapists = therapists.filter(therapist => {
    if (!mentionSearch) return true;
    const searchTerm = mentionSearch.toLowerCase();
    const fullName = therapist.full_name.toLowerCase();
    
    // Busca por qualquer parte do nome ou iniciais
    const words = fullName.split(' ');
    const initials = words.map(w => w[0]).join('');
    
    return fullName.includes(searchTerm) || 
           initials.includes(searchTerm) ||
           words.some(word => word.startsWith(searchTerm));
  });

  // Função para renderizar mensagem com menções destacadas
  const renderMessageWithMentions = (content) => {
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // É uma menção
        const isCurrentUser = user && part.toLowerCase().includes(user.full_name?.toLowerCase());
        return (
          <span
            key={index}
            className={`px-2 py-1 rounded-md font-semibold ${
              isCurrentUser 
                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                : 'bg-gray-100 text-gray-800 border border-gray-200'
            }`}
          >
            @{part}
          </span>
        );
      }
      return part;
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
                <div className="message-content">{renderMessageWithMentions(msg.message)}</div>
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
          <div className="relative flex-grow">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem... (use @nome para mencionar um terapeuta)"
              className="chat-input"
              disabled={loading}
            />
            
            {/* Dropdown de menções melhorado */}
            {showMentionDropdown && filteredTherapists.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 mb-2">
                {/* Header do dropdown */}
                <div className="p-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600">
                  💬 Mencionar terapeuta ({filteredTherapists.length} {filteredTherapists.length === 1 ? 'encontrado' : 'encontrados'})
                </div>
                
                {filteredTherapists.map((therapist, index) => {
                  const specialtyInfo = getSpecialtyBadge(therapist.full_name, getUserRole(therapist.id, user.id, therapist.full_name));
                  const isSelected = index === selectedMentionIndex;
                  
                  return (
                    <div
                      key={therapist.id}
                      onClick={() => insertMention(therapist)}
                      className={`flex items-center p-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs mr-3 shadow-sm"
                        style={{ backgroundColor: specialtyInfo.color }}
                      >
                        {specialtyInfo.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {therapist.full_name}
                        </p>
                        <div className="flex items-center mt-1">
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full text-white mr-2"
                            style={{ backgroundColor: specialtyInfo.color }}
                          >
                            {specialtyInfo.badge}
                          </span>
                          {isSelected && (
                            <span className="text-xs text-blue-600 font-medium">
                              ↵ Enter para mencionar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Footer com dicas */}
                <div className="p-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                  💡 Use ↑↓ para navegar, Enter para selecionar, Esc para fechar
                </div>
              </div>
            )}
          </div>
          
          <button type="submit" className="send-button" disabled={!newMessage.trim()}>
            <SendIcon />
          </button>
        </form>
        
        {/* Dica de uso das menções melhorada */}
        {therapists.length > 0 && (
          <div className="text-xs text-gray-500 mt-1 px-3 flex items-center justify-between">
            <span>
              💡 Digite @{therapists.length > 3 ? 'nome' : therapists.map(t => t.full_name.split(' ')[0].toLowerCase()).join(', @')} para mencionar um terapeuta específico
            </span>
            <span className="text-gray-400">
              {therapists.length} terapeuta{therapists.length !== 1 ? 's' : ''} disponível{therapists.length !== 1 ? 'is' : ''}
            </span>
          </div>
        )}
      </footer>
    </div>
  );
};

export default ParentTherapistChat;
