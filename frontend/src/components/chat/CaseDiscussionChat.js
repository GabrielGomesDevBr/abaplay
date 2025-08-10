import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { getCaseDiscussionMessages, postCaseDiscussionMessage } from '../../api/caseDiscussionApi';
import { getColleagueContacts } from '../../api/contactApi';
import { useAuth } from '../../context/AuthContext';
import { SOCKET_URL } from '../../config';
import './ParentTherapistChat.css'; // Reutilizando o mesmo CSS!





const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
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
  
  // Simular diferentes estados baseado no tempo
  const now = Date.now();
  const messageTime = new Date(message.created_at).getTime();
  const timeDiff = now - messageTime;
  
  if (timeDiff > 5000) {
    // Após 5 segundos = lido
    return {
      type: 'read',
      icon: <CheckIcon double={true} read={true} onDarkBackground={true} />,
      text: 'Lido'
    };
  } else if (timeDiff > 1000) {
    // Após 1 segundo = entregue
    return {
      type: 'delivered',
      icon: <CheckIcon double={true} read={false} onDarkBackground={true} />,
      text: 'Entregue'
    };
  } else {
    // Menos de 1 segundo = enviado
    return {
      type: 'sent',
      icon: <CheckIcon double={false} read={false} onDarkBackground={true} />,
      text: 'Enviado'
    };
  }
};

const CaseDiscussionChat = ({ patientId, patientName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [colleagues, setColleagues] = useState([]);
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

  // Carregar lista de colegas para menções
  useEffect(() => {
    const fetchColleagues = async () => {
      try {
        console.log('[CASE-DISCUSSION] Carregando colegas para menções:', { patientId, userRole: user?.role });
        const data = await getColleagueContacts(patientId);
        console.log('[CASE-DISCUSSION] Colegas carregados:', data.colleagues);
        setColleagues(data.colleagues || []);
      } catch (error) {
        console.error('[CASE-DISCUSSION] Erro ao carregar colegas:', error);
        setColleagues([]);
      }
    };

    if (patientId && (user?.role === 'therapist' || user?.role === 'terapeuta')) {
      console.log('[CASE-DISCUSSION] Iniciando carregamento de colegas para terapeuta');
      fetchColleagues();
    } else {
      console.log('[CASE-DISCUSSION] Não carregando colegas - patientId:', patientId, 'userRole:', user?.role);
    }
  }, [patientId, user]);

  useEffect(() => {
    if (!patientId) return;

    const socket = io(SOCKET_URL);
    // Usaremos uma sala diferente para a discussão de caso para não misturar as conversas
    const roomName = `discussion-${patientId}`;
    socket.emit('joinRoom', roomName);

    // Ouvindo por um evento específico para esta sala
    socket.on('newDiscussionMessage', (incomingMessage) => {
      setMessages((prevMessages) => [...prevMessages, incomingMessage]);
    });

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const initialMessages = await getCaseDiscussionMessages(patientId);
        setMessages(initialMessages);
        setError(null);
      } catch (err) {
        setError('Não foi possível carregar as mensagens da discussão.');
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

    try {
      // A API agora se chama 'createDiscussionMessage' e o payload é 'content'
      await postCaseDiscussionMessage(patientId, newMessage);
      setNewMessage('');
    } catch (err) {
      setError('Falha ao enviar mensagem.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Função para detectar menções no input
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    console.log('[CASE-DISCUSSION] Input mudou:', value);
    console.log('[CASE-DISCUSSION] Colegas disponíveis:', colleagues.length);

    // Detectar se está digitando uma menção
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      
      console.log('[CASE-DISCUSSION] Detectou @:', { lastAtIndex, textAfterAt, spaceIndex });
      
      if (spaceIndex === -1) {
        // Ainda digitando a menção
        setMentionSearch(textAfterAt.toLowerCase());
        setShowMentionDropdown(true);
        setSelectedMentionIndex(0); // Reset selection
        console.log('[CASE-DISCUSSION] Mostrando dropdown - busca:', textAfterAt.toLowerCase());
      } else {
        setShowMentionDropdown(false);
        console.log('[CASE-DISCUSSION] Escondendo dropdown - espaço encontrado');
      }
    } else {
      setShowMentionDropdown(false);
      console.log('[CASE-DISCUSSION] Escondendo dropdown - sem @');
    }
  };

  // Função para lidar com teclas de navegação
  const handleKeyDown = (e) => {
    if (!showMentionDropdown || filteredColleagues.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredColleagues.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredColleagues.length - 1
        );
        break;
      case 'Enter':
        if (showMentionDropdown && filteredColleagues[selectedMentionIndex]) {
          e.preventDefault();
          insertMention(filteredColleagues[selectedMentionIndex]);
        }
        break;
      case 'Escape':
        setShowMentionDropdown(false);
        break;
    }
  };

  // Função para inserir menção
  const insertMention = (colleague) => {
    const lastAtIndex = newMessage.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = newMessage.substring(0, lastAtIndex);
      const mention = `@${colleague.full_name} `;
      setNewMessage(beforeAt + mention);
    }
    setShowMentionDropdown(false);
    inputRef.current?.focus();
  };

  // Filtrar colegas baseado na busca mais inteligente
  const filteredColleagues = colleagues.filter(colleague => {
    if (!mentionSearch) return true;
    const searchTerm = mentionSearch.toLowerCase();
    const fullName = colleague.full_name.toLowerCase();
    
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
        <h3>Discussão de Caso sobre {patientName}</h3>
      </header>
      <main className="chat-messages">
        {loading && <p className="chat-info">Carregando mensagens...</p>}
        {error && <p className="chat-info error">{error}</p>}
        {!loading && messages.length === 0 && (
          <p className="chat-info">Nenhuma mensagem ainda. Seja o primeiro a começar!</p>
        )}
        {user && messages.map((msg) => {
          const isOwnMessage = msg.user_id === user.id;
          const role = getUserRole(msg.user_id, user.id, msg.user_name);
          const specialtyInfo = getSpecialtyBadge(msg.user_name, role);
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
                      {msg.user_name}
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
                <div className="message-content">{renderMessageWithMentions(msg.content)}</div>
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
              placeholder="Digite sua mensagem... (use @nome para mencionar um colega)"
              className="chat-input"
              disabled={loading}
            />
            
            {/* Dropdown de menções melhorado */}
            {showMentionDropdown && filteredColleagues.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 mb-2">
                {/* Header do dropdown */}
                <div className="p-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600">
                  💬 Mencionar colega ({filteredColleagues.length} {filteredColleagues.length === 1 ? 'encontrado' : 'encontrados'})
                </div>
                
                {filteredColleagues.map((colleague, index) => {
                  const specialtyInfo = getSpecialtyBadge(colleague.full_name, getUserRole(colleague.id, user.id, colleague.full_name));
                  const isSelected = index === selectedMentionIndex;
                  
                  return (
                    <div
                      key={colleague.id}
                      onClick={() => insertMention(colleague)}
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
                          {colleague.full_name}
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
        {colleagues.length > 0 && (
          <div className="text-xs text-gray-500 mt-1 px-3 flex items-center justify-between">
            <span>
              💡 Digite @{colleagues.length > 3 ? 'nome' : colleagues.map(c => c.full_name.split(' ')[0].toLowerCase()).join(', @')} para mencionar um colega específico
            </span>
            <span className="text-gray-400">
              {colleagues.length} colega{colleagues.length !== 1 ? 's' : ''} disponível{colleagues.length !== 1 ? 'is' : ''}
            </span>
          </div>
        )}
      </footer>
    </div>
  );
};

export default CaseDiscussionChat;
