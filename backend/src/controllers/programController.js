const db = require('../models/db');

const getAllPrograms = async (req, res) => {
  try {
    // Esta query agora junta as 3 tabelas e retorna uma lista plana de "objetivos"
    // Cada objetivo contém a informação do seu programa e da sua área.
    const query = `
      SELECT 
        o.id, 
        p.name AS title,      -- O card espera 'title'
        a.name AS area,       -- O contexto precisa de 'area' para agrupar
        o.description AS objective, -- O card espera 'objective'
        o.type AS tag         -- O card espera 'tag'
      FROM objectives o
      JOIN areas a ON o.area_id = a.id
      JOIN programs p ON a.program_id = p.id
      WHERE p.is_public = true
      ORDER BY p.name, a.name, o.description;
    `;
    const { rows } = await db.query(query);
    
    // A resposta agora é uma lista simples, que o ProgramContext irá processar.
    res.status(200).json(rows);

  } catch (error) {
    console.error('Erro ao buscar programas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

const createProgram = async (req, res) => {
  res.status(501).json({ message: 'Funcionalidade ainda não implementada' });
};

module.exports = {
  getAllPrograms,
  createProgram,
};