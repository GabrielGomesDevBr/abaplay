import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePatients } from '../context/PatientContext';
// 1. Importar os nomes corretos das funções da API
import { getDiscussionMessages, createDiscussionMessage } from '../api/caseDiscussionApi';

const CaseDiscussionPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  // O token não é mais necessário aqui, pois a API o gerencia
  const { user } = useAuth(); 
  
  const { patients } = usePatients();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const loadData = async () => {
      // A verificação de token foi removida, pois o contexto AuthContext já lida com isso
      try {
        setLoading(true);
        
        const patientDetails = patients.find(p => p.id === parseInt(patientId, 10));
        
        if (patientDetails) {
          setPatient(patientDetails);
        } else {
           if (patients.length > 0) {
               throw new Error("Paciente não encontrado na sua lista.");
           }
        }
        
        // 2. Usar o novo nome da função da API
        const fetchedMessages = await getDiscussionMessages(patientId);
        setMessages(fetchedMessages);
        setError('');
      } catch (err) {
        setError(err.message || 'Falha ao carregar dados da discussão.');
      } finally {
        setLoading(false);
      }
    };

    if (patients.length > 0) {
        loadData();
    }
  }, [patientId, navigate, patients]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // 3. Usar o novo nome da função da API
      const createdMsg = await createDiscussionMessage(patientId, newMessage);
      setMessages(prevMessages => [...prevMessages, createdMsg]);
      setNewMessage('');
    } catch (err) {
      setError(err.message || 'Não foi possível enviar a mensagem.');
    }
  };

  if (!patient && patients.length === 0) {
      return (
          <div className="container mx-auto p-4 max-w-4xl text-center">
              <p>Carregando dados do paciente...</p>
          </div>
      );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">
        Discussão de Caso: {patient ? patient.name : 'Carregando...'}
      </h1>

      {loading && <p>Carregando mensagens...</p>}
      {error && <p className="text-red-500 bg-red-100 p-3 rounded">{error}</p>}

      <div className="bg-white shadow-md rounded-lg p-4 h-96 overflow-y-auto flex flex-col space-y-4 mb-4">
        {!loading && messages.length === 0 ? (
          <div className="text-center text-gray-500 self-center m-auto">
            Nenhuma mensagem nesta discussão ainda. Seja o primeiro a comentar!
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${user && msg.user_id === user.id ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-lg p-3 max-w-lg ${user && msg.user_id === user.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                <p className="font-bold text-sm">{msg.user_name}</p>
                <p>{msg.content}</p>
                <p className="text-xs opacity-75 mt-1">
                  {new Date(msg.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex space-x-2">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          disabled={!newMessage.trim() || loading}
        >
          Enviar
        </button>
      </form>
    </div>
  );
};

export default CaseDiscussionPage;
