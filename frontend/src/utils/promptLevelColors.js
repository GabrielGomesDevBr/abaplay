/**
 * Utilitário centralizado para cores dos níveis de prompting
 * Mantém consistência entre pré-visualização e PDF
 */

export const PROMPT_LEVEL_COLORS = {
    5: {
        name: 'Independente',
        hex: '#10b981',
        rgb: [16, 185, 129]
    },
    4: {
        name: 'Dica Verbal',
        hex: '#8b5cf6',
        rgb: [139, 92, 246]
    },
    3: {
        name: 'Dica Gestual',
        hex: '#3b82f6',
        rgb: [59, 130, 246]
    },
    2: {
        name: 'Ajuda Física Parcial',
        hex: '#eab308',
        rgb: [234, 179, 8]
    },
    1: {
        name: 'Ajuda Física Total',
        hex: '#f97316',
        rgb: [249, 115, 22]
    },
    0: {
        name: 'Não realizou',
        hex: '#ef4444',
        rgb: [239, 68, 68]
    }
};

/**
 * Retorna cor hex de um nível específico
 * @param {number} levelId - ID do nível (0-5)
 * @returns {string} Cor em formato hex
 */
export const getPromptLevelHex = (levelId) => {
    return PROMPT_LEVEL_COLORS[levelId]?.hex || '#6b7280';
};

/**
 * Retorna cor RGB de um nível específico
 * @param {number} levelId - ID do nível (0-5)
 * @returns {Array} Cor em formato RGB [r, g, b]
 */
export const getPromptLevelRGB = (levelId) => {
    return PROMPT_LEVEL_COLORS[levelId]?.rgb || [107, 114, 128];
};

/**
 * Retorna nome de um nível específico
 * @param {number} levelId - ID do nível (0-5)
 * @returns {string} Nome do nível
 */
export const getPromptLevelName = (levelId) => {
    return PROMPT_LEVEL_COLORS[levelId]?.name || 'Desconhecido';
};

/**
 * Retorna todos os níveis para legendas (excluindo "Não realizou")
 * @returns {Array} Lista de níveis para exibição
 */
export const getLegendLevels = () => {
    return [5, 4, 3, 2, 1].map(id => ({
        id,
        name: PROMPT_LEVEL_COLORS[id].name,
        hex: PROMPT_LEVEL_COLORS[id].hex,
        rgb: PROMPT_LEVEL_COLORS[id].rgb
    }));
};