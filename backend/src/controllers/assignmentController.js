const pool = require('../models/db');

const assignProgramToPatient = async (req, res) => {
  const { programId, patientId } = req.body;

  if (!programId || !patientId) {
    return res.status(400).json({ message: 'Os IDs do programa e do paciente são obrigatórios.' });
  }

  // CORREÇÃO: A query agora insere na tabela correta "patient_programs".
  const query = `
    INSERT INTO public.patient_programs (program_id, patient_id)
    VALUES ($1, $2)
    ON CONFLICT (program_id, patient_id) DO NOTHING;
  `;

  try {
    await pool.query(query, [programId, patientId]);
    res.status(201).json({ message: 'Programa atribuído com sucesso.' });
  } catch (error) {
    console.error('Erro ao atribuir programa:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao atribuir o programa.' });
  }
};

module.exports = {
  assignProgramToPatient,
};
