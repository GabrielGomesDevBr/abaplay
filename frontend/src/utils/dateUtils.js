// frontend/src/utils/dateUtils.js

/**
 * Utilitários para manipulação de datas no frontend
 * Garante formatação consistente entre componentes
 */

/**
 * Converte uma data para o formato YYYY-MM-DD independente do input
 * @param {string|Date} dateInput - Data em qualquer formato
 * @returns {string} Data no formato YYYY-MM-DD ou string vazia se inválida
 */
export const ensureYYYYMMDD = (dateInput) => {
  if (!dateInput) return '';

  try {
    let date;

    // Se já é uma string no formato YYYY-MM-DD, retorna como está
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      // Validar se é uma data válida
      date = new Date(dateInput + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        return dateInput;
      }
    }

    // Se é uma string no formato DD/MM/YYYY, converter
    if (typeof dateInput === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInput)) {
      const [day, month, year] = dateInput.split('/');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Se é uma string no formato DD-MM-YYYY, converter
    else if (typeof dateInput === 'string' && /^\d{1,2}-\d{1,2}-\d{4}$/.test(dateInput)) {
      const [day, month, year] = dateInput.split('-');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Se é um objeto Date ou string que pode ser parseada
    else {
      date = new Date(dateInput);
    }

    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      console.warn('[DATE-UTILS] Data inválida fornecida:', dateInput);
      return '';
    }

    // Retornar no formato YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;

  } catch (error) {
    console.warn('[DATE-UTILS] Erro ao processar data:', dateInput, error);
    return '';
  }
};

/**
 * Formata uma data YYYY-MM-DD para exibição no formato brasileiro
 * @param {string} dateString - Data no formato YYYY-MM-DD
 * @returns {string} Data no formato DD/MM/YYYY
 */
export const formatDateBR = (dateString) => {
  if (!dateString) return '';

  try {
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) {
      return dateString; // Retorna como estava se não conseguir converter
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;

  } catch (error) {
    console.warn('[DATE-UTILS] Erro ao formatar data para BR:', dateString, error);
    return dateString;
  }
};

/**
 * Obtém a data atual no formato YYYY-MM-DD
 * @returns {string} Data atual no formato YYYY-MM-DD
 */
export const getTodayYYYYMMDD = () => {
  const today = new Date();
  return ensureYYYYMMDD(today);
};

/**
 * Verifica se uma data está no formato YYYY-MM-DD válido
 * @param {string} dateString - String para verificar
 * @returns {boolean} True se está no formato correto e é válida
 */
export const isValidYYYYMMDD = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return false;

  // Verificar formato
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;

  // Verificar se é uma data válida
  const date = new Date(dateString + 'T00:00:00');
  return !isNaN(date.getTime());
};

/**
 * Debug: Mostra informações sobre o formato de data recebido
 * @param {any} dateInput - Input para analisar
 * @param {string} context - Contexto onde foi chamado
 */
export const debugDateFormat = (dateInput, context = 'unknown') => {
  console.log(`[DATE-DEBUG] ${context}:`, {
    input: dateInput,
    type: typeof dateInput,
    isYYYYMMDD: /^\d{4}-\d{2}-\d{2}$/.test(dateInput),
    isDDMMYYYY: /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInput),
    converted: ensureYYYYMMDD(dateInput)
  });
};