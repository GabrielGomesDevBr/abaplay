import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faUsers, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { getTherapistContacts, getColleagueContacts } from '../../api/contactApi';

// Função para obter badge de especialidade baseado no nome do terapeuta
const getSpecialtyInfo = (fullName) => {
  if (!fullName) return { badge: '👨‍⚕️ Terapeuta', color: '#3498db', avatar: 'TR' };
  
  const lowerName = fullName.toLowerCase();
  const specialtyMap = {
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
  
  // Busca por palavra-chave no nome
  for (const [key, value] of Object.entries(specialtyMap)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }
  
  // Default - usar iniciais do nome
  const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return { badge: '👨‍⚕️ Terapeuta', color: '#3498db', avatar: initials };
};

const ContactCard = ({ contact, onClick, isLoading }) => {
  const specialtyInfo = getSpecialtyInfo(contact.full_name);
  
  return (
    <div 
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 ${isLoading ? 'opacity-50' : 'hover:transform hover:scale-105'}`}
      style={{ borderLeftColor: specialtyInfo.color }}
      onClick={() => !isLoading && onClick(contact)}
    >
      <div className="p-4">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
            style={{ backgroundColor: specialtyInfo.color }}
          >
            {specialtyInfo.avatar}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {contact.full_name}
            </h3>
            <span 
              className="inline-block px-2 py-1 text-xs font-medium text-white rounded-full"
              style={{ backgroundColor: specialtyInfo.color }}
            >
              {specialtyInfo.badge}
            </span>
            {contact.total_patients && (
              <p className="text-sm text-gray-500 mt-1">
                {contact.total_patients} paciente{contact.total_patients !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          
          {/* Ícone de chat */}
          <div className="text-gray-400">
            {isLoading ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              <FontAwesomeIcon icon={faComments} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ContactList = ({ patientId, patientName, type = 'therapists', onContactSelect, className = '' }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    fetchContacts();
  }, [patientId, type]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data;
      if (type === 'therapists') {
        data = await getTherapistContacts(patientId);
        setContacts(data.therapists || []);
      } else if (type === 'colleagues') {
        data = await getColleagueContacts(patientId);
        setContacts(data.colleagues || []);
      }
      
    } catch (err) {
      console.error('Erro ao buscar contatos:', err);
      setError(err.response?.data?.errors?.[0]?.msg || 'Erro ao carregar contatos');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleContactClick = async (contact) => {
    setSelectedContact(contact.id);
    try {
      if (onContactSelect) {
        await onContactSelect(contact);
      }
    } catch (error) {
      console.error('Erro ao selecionar contato:', error);
    } finally {
      setSelectedContact(null);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-blue-500 mb-2" />
          <p className="text-gray-500">Carregando contatos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center text-red-500">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl mb-2" />
          <p>{error}</p>
          <button 
            onClick={fetchContacts}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center text-gray-500">
          <FontAwesomeIcon 
            icon={type === 'colleagues' ? faUsers : faComments} 
            className="text-3xl mb-2" 
          />
          <p className="text-lg font-medium mb-2">
            {type === 'colleagues' 
              ? 'Nenhum colega encontrado'
              : 'Equipe individual'
            }
          </p>
          <p className="text-sm">
            {type === 'colleagues' 
              ? 'Este paciente não tem outros terapeutas atribuídos para discussão.'
              : 'Este paciente é atendido por apenas um profissional. As mensagens no chat geral chegam diretamente ao terapeuta responsável.'
            }
          </p>
          {type === 'therapists' && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                💡 <strong>Dica:</strong> Continue usando o chat geral abaixo para se comunicar com o terapeuta.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          {type === 'colleagues' ? 'Colegas Terapeutas' : 'Meus Terapeutas'}
        </h2>
        <p className="text-gray-600">
          Paciente: <span className="font-medium">{patientName}</span>
        </p>
        <p className="text-sm text-gray-500">
          {contacts.length} {type === 'colleagues' ? 'colega' : 'terapeuta'}{contacts.length !== 1 ? 's' : ''} 
          {type === 'colleagues' ? ' para discussão' : ' na equipe'}
        </p>
        
        {/* Aviso especial quando há apenas 1 terapeuta */}
        {contacts.length === 1 && type === 'therapists' && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-700">
              ℹ️ Como há apenas um terapeuta, as mensagens no chat geral chegam diretamente a ele.
            </p>
          </div>
        )}
      </div>
      
      {/* Lista de contatos */}
      <div className="space-y-3">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onClick={handleContactClick}
            isLoading={selectedContact === contact.id}
          />
        ))}
      </div>
    </div>
  );
};

export default ContactList;