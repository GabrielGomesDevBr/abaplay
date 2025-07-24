const pool = require('./db');

const NotificationStatus = {};

/**
 * Cria ou atualiza o status de notificação para um usuário específico
 * @param {number} userId - ID do usuário
 * @param {number} patientId - ID do paciente
 * @param {string} chatType - Tipo do chat ('case_discussion' ou 'parent_chat')
 * @returns {Promise<object>} - O status de notificação criado ou atualizado
 */
NotificationStatus.createOrUpdate = async (userId, patientId, chatType) => {
  const query = `
    INSERT INTO notificationstatus ("userId", "patientId", "chatType", "unreadCount")
    VALUES ($1, $2, $3, 0)
    ON CONFLICT ("userId", "patientId", "chatType")
    DO NOTHING
    RETURNING *;
  `;
  const values = [userId, patientId, chatType];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao criar/atualizar status de notificação:', error);
    throw error;
  }
};

/**
 * Incrementa o contador de mensagens não lidas
 * @param {number} userId - ID do usuário
 * @param {number} patientId - ID do paciente
 * @param {string} chatType - Tipo do chat ('case_discussion' ou 'parent_chat')
 * @returns {Promise<object>} - O status atualizado
 */
NotificationStatus.incrementUnreadCount = async (userId, patientId, chatType) => {
  const query = `
    INSERT INTO notificationstatus ("userId", "patientId", "chatType", "unreadCount")
    VALUES ($1, $2, $3, 1)
    ON CONFLICT ("userId", "patientId", "chatType")
    DO UPDATE SET 
      "unreadCount" = notificationstatus."unreadCount" + 1
    RETURNING *;
  `;
  const values = [userId, patientId, chatType];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao incrementar contador de não lidas:', error);
    throw error;
  }
};

/**
 * Zera o contador de mensagens não lidas e atualiza o timestamp de última leitura
 * @param {number} userId - ID do usuário
 * @param {number} patientId - ID do paciente
 * @param {string} chatType - Tipo do chat ('case_discussion' ou 'parent_chat')
 * @returns {Promise<object>} - O status atualizado
 */
NotificationStatus.markAsRead = async (userId, patientId, chatType) => {
  const query = `
    INSERT INTO notificationstatus ("userId", "patientId", "chatType", "lastReadTimestamp", "unreadCount")
    VALUES ($1, $2, $3, NOW(), 0)
    ON CONFLICT ("userId", "patientId", "chatType")
    DO UPDATE SET 
      "lastReadTimestamp" = NOW(),
      "unreadCount" = 0
    RETURNING *;
  `;
  const values = [userId, patientId, chatType];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao marcar como lido:', error);
    throw error;
  }
};

/**
 * Busca o status de notificação para um usuário específico
 * @param {number} userId - ID do usuário
 * @param {number} patientId - ID do paciente (opcional)
 * @param {string} chatType - Tipo do chat (opcional)
 * @returns {Promise<Array>} - Lista de status de notificação
 */
NotificationStatus.getByUser = async (userId, patientId = null, chatType = null) => {
  let query = `
    SELECT 
      ns.*,
      p.name as patient_name
    FROM notificationstatus ns
    JOIN patients p ON ns."patientId" = p.id
    WHERE ns."userId" = $1
  `;
  const values = [userId];

  if (patientId) {
    query += ` AND ns."patientId" = $${values.length + 1}`;
    values.push(patientId);
  }

  if (chatType) {
    query += ` AND ns."chatType" = $${values.length + 1}`;
    values.push(chatType);
  }

  query += ` ORDER BY ns."unreadCount" DESC, p.name ASC`;

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('Erro ao buscar status de notificação:', error);
    throw error;
  }
};

/**
 * Busca o total de mensagens não lidas para um usuário
 * @param {number} userId - ID do usuário
 * @returns {Promise<number>} - Total de mensagens não lidas
 */
NotificationStatus.getTotalUnreadCount = async (userId) => {
  const query = `
    SELECT COALESCE(SUM("unreadCount"), 0) as total_unread
    FROM notificationstatus
    WHERE "userId" = $1;
  `;
  const values = [userId];

  try {
    const result = await pool.query(query, values);
    return parseInt(result.rows[0].total_unread) || 0;
  } catch (error) {
    console.error('Erro ao buscar total de não lidas:', error);
    throw error;
  }
};

module.exports = NotificationStatus;

