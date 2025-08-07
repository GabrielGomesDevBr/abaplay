/**
 * Utilitário para normalizar status de programas
 * Garante consistência em todo o sistema
 */

const STATUS_MAPPING = {
  // Status ativos
  'Ativo': 'active',
  'active': 'active',
  'ATIVO': 'active',
  
  // Status arquivados  
  'Arquivado': 'archived',
  'archived': 'archived',
  'ARQUIVADO': 'archived',
  'inactive': 'archived',
  
  // Status pausados
  'Pausado': 'paused',
  'paused': 'paused',
  'PAUSADO': 'paused',
};

/**
 * Normaliza um status para o padrão do sistema (inglês, lowercase)
 * @param {string|null} status - Status original
 * @returns {string} Status normalizado
 */
const normalizeStatus = (status) => {
  if (!status) return 'active'; // Default para programas sem status
  
  const normalized = STATUS_MAPPING[status];
  if (normalized) {
    return normalized;
  }
  
  // Se não encontrou no mapeamento, tenta lowercase
  const lowercaseStatus = status.toLowerCase();
  if (['active', 'archived', 'paused'].includes(lowercaseStatus)) {
    return lowercaseStatus;
  }
  
  // Fallback - assume ativo se não reconhece
  console.warn(`Status não reconhecido: "${status}". Assumindo 'active'.`);
  return 'active';
};

/**
 * Normaliza um array de programas, padronizando seus status
 * @param {Array} programs - Array de programas
 * @returns {Array} Programas com status normalizados
 */
const normalizeProgramsStatus = (programs) => {
  return programs.map(program => ({
    ...program,
    status: normalizeStatus(program.status)
  }));
};

/**
 * Verifica se um status é considerado "ativo"
 * @param {string} status - Status a verificar
 * @returns {boolean} True se é ativo
 */
const isActiveStatus = (status) => {
  return normalizeStatus(status) === 'active';
};

/**
 * Lista todos os status válidos do sistema
 * @returns {Array<string>} Array com status válidos
 */
const getValidStatuses = () => {
  return ['active', 'archived', 'paused'];
};

module.exports = {
  normalizeStatus,
  normalizeProgramsStatus,
  isActiveStatus,
  getValidStatuses,
  STATUS_MAPPING
};