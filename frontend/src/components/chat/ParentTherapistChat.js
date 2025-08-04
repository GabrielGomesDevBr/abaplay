import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { getChatMessages, postChatMessage } from '../../api/parentChatApi';
import { useAuth } from '../../context/AuthContext';
import './ParentTherapistChat.css';

import config from "../../config";



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

const ParentTherapistChat = ({ patientId, patientName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        sender_name: user.name,
        message: newMessage,
        created_at: new Date().toISOString(),
        patient_id: patientId,
        isOptimistic: true, // Marcar como otimista
      };

      setMessages((prevMessages) => [...prevMessages, messageToSend]);
      setNewMessage('');

            const createdMessage = await postChatMessage({ patient_id: patientId, message: newMessage, sender_id: user.id, client_id: clientId }); // Enviar clientId

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === clientId ? { ...createdMessage, sender_name: user.name, isOptimistic: false } : msg
        )
      );

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
        {user && messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-bubble ${msg.sender_id === user.id ? 'sent' : 'received'}`}
          >
            <div className="message-sender">{msg.sender_id === user.id ? 'Você' : msg.sender_name}</div>
            <div className="message-content">{msg.message}</div>
            <div className="message-timestamp">{formatDate(msg.created_at)}</div>
          </div>
        ))}
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
