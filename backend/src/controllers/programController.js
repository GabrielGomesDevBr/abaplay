const pool = require('../models/db');

const getAllPrograms = async (req, res) => {
  const { patientId } = req.query;

  if (!patientId) {
    return res.status(400).json({ message: 'O ID do paciente é obrigatório.' });
  }

  // --- QUERY SQL CORRIGIDA E FINAL ---
  // Esta query agora reflete a estrutura de dados real do banco de dados.
  const query = `
    SELECT
        a.name AS area_name,
        o.id AS program_id,
        o.description AS program_name,
        -- A verificação de atribuição agora usa o ID de 'objectives' e a tabela 'patient_programs'
        CASE WHEN pa.program_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_assigned
    FROM
        public.areas a
    JOIN
        public.objectives o ON a.id = o.area_id -- Junta Áreas diretamente com os Programas Detalhados (Objectives)
    LEFT JOIN
        public.patient_programs pa ON o.id = pa.program_id AND pa.patient_id = $1
    ORDER BY
        a.name, o.description;
  `;

  try {
    const { rows } = await pool.query(query, [patientId]);

    // Objeto para agrupar os resultados no formato esperado: { "Area": [Programas] }
    const programsByArea = {};

    rows.forEach(row => {
      const {
        area_name,
        program_id,
        program_name,
        is_assigned
      } = row;

      // Se a área ainda não existe no nosso objeto, inicializa com um array vazio.
      if (!programsByArea[area_name]) {
        programsByArea[area_name] = [];
      }

      // Procura se o programa (objetivo) já foi adicionado.
      let programExists = programsByArea[area_name].find(p => p.id === program_id);

      if (!programExists) {
        // Adiciona o programa detalhado (objetivo) ao array da área.
        programsByArea[area_name].push({
          id: program_id,
          name: program_name, // O 'name' do programa é a descrição do objetivo
          is_assigned: is_assigned,
          objectives: [] // Mantemos a estrutura, embora o objetivo principal já esteja no nome.
                         // No futuro, esta lista pode ser populada com os detalhes do JSON.
        });
      }
    });

    res.status(200).json(programsByArea);
  } catch (error) {
    console.error('Erro ao buscar e processar os programas:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar programas.' });
  }
};

const getProgramAreas = async (req, res) => {
  try {
    const query = 'SELECT name FROM public.areas ORDER BY name;';
    const result = await pool.query(query);
    const areaNames = result.rows.map(row => row.name);
    res.status(200).json(areaNames);
  } catch (error) {
    console.error('Erro ao buscar áreas dos programas:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar as áreas.' });
  }
};

module.exports = {
  getAllPrograms,
  getProgramAreas,
};
