/**
 * Utilitário para gerenciar níveis de prompting na terapia ABA
 */

const PROMPT_LEVELS = {
    5: {
        id: 5,
        name: 'Independente',
        description: 'Realiza a tarefa sem qualquer ajuda',
        color: '#10b981', // Verde
        weight: 100
    },
    4: {
        id: 4,
        name: 'Dica Verbal',
        description: 'Precisa de instrução verbal',
        color: '#8b5cf6', // Roxo
        weight: 75
    },
    3: {
        id: 3,
        name: 'Dica Gestual',
        description: 'Precisa de gesto ou apontamento',
        color: '#3b82f6', // Azul
        weight: 50
    },
    2: {
        id: 2,
        name: 'Ajuda Física Parcial',
        description: 'Precisa de ajuda física reduzida',
        color: '#eab308', // Amarelo
        weight: 25
    },
    1: {
        id: 1,
        name: 'Ajuda Física Total',
        description: 'Precisa de controle total do movimento',
        color: '#f97316', // Laranja
        weight: 0
    },
    0: {
        id: 0,
        name: 'Não realizou',
        description: 'Não tentou ou se recusou',
        color: '#ef4444', // Vermelho
        weight: 0
    }
};

/**
 * Retorna todos os níveis de prompting disponíveis
 * @returns {Array} Lista de níveis ordenados do maior para o menor
 */
const getAllPromptLevels = () => {
    return Object.values(PROMPT_LEVELS).sort((a, b) => b.id - a.id);
};

/**
 * Retorna informações de um nível específico
 * @param {number} levelId - ID do nível (0-5)
 * @returns {object|null} Informações do nível ou null se inválido
 */
const getPromptLevel = (levelId) => {
    return PROMPT_LEVELS[levelId] || null;
};

/**
 * Valida se um ID de nível é válido
 * @param {number} levelId - ID do nível
 * @returns {boolean} True se válido
 */
const isValidPromptLevel = (levelId) => {
    return levelId >= 0 && levelId <= 5 && Number.isInteger(levelId);
};

/**
 * Calcula score de progresso baseado no nível de prompting
 * @param {number} levelId - Nível de prompting atual
 * @param {number} successRate - Taxa de acerto (0-1)
 * @returns {number} Score de progresso ajustado
 */
const calculateProgressScore = (levelId, successRate) => {
    const level = getPromptLevel(levelId);
    if (!level) return 0;
    
    // Score de progresso = taxa de acerto * peso do nível
    return Math.round(successRate * level.weight * 100) / 100;
};

/**
 * Retorna próximo nível na hierarquia (evolução)
 * @param {number} currentLevelId - Nível atual
 * @returns {number|null} Próximo nível ou null se já é o máximo
 */
const getNextPromptLevel = (currentLevelId) => {
    if (currentLevelId >= 5) return null;
    return currentLevelId + 1;
};

/**
 * Retorna nível anterior na hierarquia (regressão)
 * @param {number} currentLevelId - Nível atual  
 * @returns {number|null} Nível anterior ou null se já é o mínimo
 */
const getPreviousPromptLevel = (currentLevelId) => {
    if (currentLevelId <= 0) return null;
    return currentLevelId - 1;
};

module.exports = {
    PROMPT_LEVELS,
    getAllPromptLevels,
    getPromptLevel,
    isValidPromptLevel,
    calculateProgressScore,
    getNextPromptLevel,
    getPreviousPromptLevel
};