// Importa a pool de conexões com o banco de dados.
const pool = require('./db');

// O objeto CaseDiscussion vai agrupar as funções de acesso ao banco de dados.
const CaseDiscussion = {};

/**
 * Cria uma nova mensagem na discussão de um caso.
 * @param {number} patientId - O ID do paciente.
 * @param {number} userId - O ID do usuário que está postando a mensagem.
 * @param {string} content - O conteúdo da mensagem.
 * @returns {Promise<object>} - O objeto da mensagem recém-criada.
 */
CaseDiscussion.create = async (patientId, userId, content) => {
  // A query para inserir permanece a mesma.
  const query = `
    INSERT INTO case_discussions (patient_id, user_id, content)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [patientId, userId, content];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao criar a mensagem de discussão:', error);
    throw error;
  }
};

/**
 * Busca todas as mensagens da discussão de um paciente específico.
 * As mensagens são ordenadas da mais antiga para a mais recente.
 * @param {number} patientId - O ID do paciente.
 * @returns {Promise<Array<object>>} - Uma lista de mensagens da discussão.
 */
CaseDiscussion.findByPatientId = async (patientId) => {
  // --- CORREÇÃO DEFINITIVA ---
  // A consulta SQL foi alterada para selecionar 'u.full_name', que é o nome
  // correto da coluna conforme o esquema do seu banco de dados.
  const query = `
    SELECT
      cd.id,
      cd.content,
      cd.created_at,
      cd.user_id,
      u.full_name as user_name
    FROM
      case_discussions cd
    JOIN
      users u ON cd.user_id = u.id
    WHERE
      cd.patient_id = $1
    ORDER BY
      cd.created_at ASC;
  `;
  const values = [patientId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Erro ao buscar mensagens da discussão por ID do paciente:', error);
    throw error;
  }
};

// Exporta o objeto para que possa ser usado em outras partes da aplicação.
module.exports = CaseDiscussion;
