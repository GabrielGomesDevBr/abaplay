import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { getDiscussionMessages, createDiscussionMessage } from '../../api/caseDiscussionApi';
import { useAuth } from '../../context/AuthContext';
import './ParentTherapistChat.css'; // Reutilizando o mesmo CSS!

import config from "../../config";

const SOCKET_URL = config.SOCKET_URL;

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const CaseDiscussionChat = ({ patientId, patientName }) => {
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
        const initialMessages = await getDiscussionMessages(patientId);
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
      await createDiscussionMessage(patientId, newMessage);
      setNewMessage('');
    } catch (err) {
      setError('Falha ao enviar mensagem.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
        {user && messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-bubble ${msg.user_id === user.id ? 'sent' : 'received'}`}
          >
            <div className="message-sender">{msg.user_id === user.id ? 'Você' : msg.user_name}</div>
            <div className="message-content">{msg.content}</div>
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

export default CaseDiscussionChat;
