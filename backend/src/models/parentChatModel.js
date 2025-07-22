const db = require('./db');

const ParentChatMessage = {};

/**
 * Cria uma nova mensagem no banco de dados para o chat entre pais e terapeutas.
 * @param {object} messageData - Os dados da mensagem.
 * @param {number} messageData.patient_id - O ID do paciente.
 * @param {number} messageData.sender_id - O ID do usuário que enviou a mensagem.
 * @param {string} messageData.message - O conteúdo da mensagem.
 * @returns {Promise<object>} A mensagem criada.
 */
ParentChatMessage.create = async (messageData) => {
  const { patient_id, sender_id, message } = messageData;
  try {
    const query = `
      INSERT INTO parent_therapist_chat (patient_id, sender_id, message)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [patient_id, sender_id, message]);
    return rows[0];
  } catch (error) {
    console.error('Erro ao criar mensagem no chat pais-terapeutas:', error);
    throw error;
  }
};

/**
 * Busca todas as mensagens de um paciente específico, ordenadas por data de criação.
 * Inclui o nome do remetente.
 * @param {number} patientId - O ID do paciente.
 * @returns {Promise<Array>} Uma lista de mensagens.
 */
ParentChatMessage.findByPatientId = async (patientId) => {
  try {
    // --- CORREÇÃO APLICADA AQUI ---
    // A coluna 'u.name' foi trocada por 'u.full_name' para corresponder
    // ao esquema da sua tabela 'users'.
    const query = `
      SELECT 
        ptc.id,
        ptc.patient_id,
        ptc.sender_id,
        ptc.message,
        ptc.read_by,
        ptc.created_at,
        u.full_name as sender_name
      FROM 
        parent_therapist_chat ptc
      JOIN 
        users u ON ptc.sender_id = u.id
      WHERE 
        ptc.patient_id = $1
      ORDER BY 
        ptc.created_at ASC;
    `;
    const { rows } = await db.query(query, [patientId]);
    return rows;
  } catch (error) {
    console.error('Erro ao buscar mensagens do paciente:', error);
    throw error;
  }
};

module.exports = ParentChatMessage;
