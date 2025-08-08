const PatientModel = require('../models/patientModel');

const contactController = {};

/**
 * Busca todos os terapeutas atribuídos a um paciente específico
 * Usado pelos pais para ver com quem podem conversar
 */
contactController.getTherapistContacts = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`[CONTACT-LOG] getTherapistContacts: User ${userId} (${userRole}) buscando contatos do paciente ${patientId}`);

    // Validar se o paciente existe e se o usuário tem permissão
    const patient = await PatientModel.findById(patientId);
    if (!patient) {
      console.log(`[CONTACT-LOG] getTherapistContacts: Paciente ${patientId} não encontrado`);
      return res.status(404).json({ 
        errors: [{ msg: 'Paciente não encontrado.' }] 
      });
    }

    // Verificar permissões baseadas no role
    let hasPermission = false;
    
    console.log(`[CONTACT-LOG] getTherapistContacts: Verificando permissões - userId: ${userId}, userRole: ${userRole}, patientId: ${patientId}`);
    
    if (userRole === 'admin') {
      hasPermission = true;
      console.log(`[CONTACT-LOG] getTherapistContacts: Admin ${userId} tem acesso total`);
    } else if (userRole === 'therapist') {
      // Terapeuta só pode ver contatos de seus próprios pacientes
      hasPermission = await PatientModel.isTherapistAssigned(patientId, userId);
      console.log(`[CONTACT-LOG] getTherapistContacts: Terapeuta ${userId} - isAssigned: ${hasPermission}`);
    } else if (userRole === 'parent' || userRole === 'pai') {
      // Para pais, assumimos que eles têm acesso aos seus próprios filhos
      // Em um sistema real, haveria uma tabela parent_patient_assignments
      // Por enquanto, permitimos acesso para todos os pais
      hasPermission = true;
      console.log(`[CONTACT-LOG] getTherapistContacts: Pai ${userId} (role: ${userRole}) tem acesso permitido ao paciente ${patientId}`);
    } else {
      console.log(`[CONTACT-LOG] getTherapistContacts: Role não reconhecido: ${userRole}`);
    }

    if (!hasPermission) {
      console.log(`[CONTACT-LOG] getTherapistContacts: User ${userId} não tem permissão para acessar paciente ${patientId}`);
      return res.status(403).json({ 
        errors: [{ msg: 'Acesso negado a este paciente.' }] 
      });
    }

    // Buscar terapeutas atribuídos
    const therapists = await PatientModel.getAssignedTherapists(patientId);
    
    console.log(`[CONTACT-LOG] getTherapistContacts: Retornando ${therapists.length} terapeutas para o paciente ${patientId}`);

    res.status(200).json({
      patient: {
        id: patient.id,
        name: patient.name
      },
      therapists: therapists
    });

  } catch (error) {
    console.error('[CONTACT-LOG] getTherapistContacts: Erro -', error);
    res.status(500).json({ 
      errors: [{ msg: 'Erro interno do servidor.' }] 
    });
  }
};

/**
 * Busca outros terapeutas que trabalham com o mesmo paciente
 * Usado para discussões de caso entre terapeutas
 */
contactController.getColleagueContacts = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`[CONTACT-LOG] getColleagueContacts: Terapeuta ${userId} buscando colegas do paciente ${patientId}`);

    // Apenas terapeutas podem acessar esta funcionalidade
    if (userRole !== 'therapist' && userRole !== 'terapeuta') {
      console.log(`[CONTACT-LOG] getColleagueContacts: Role ${userRole} não é terapeuta`);
      return res.status(403).json({ 
        errors: [{ msg: 'Apenas terapeutas podem acessar esta funcionalidade.' }] 
      });
    }

    // Verificar se o terapeuta está atribuído ao paciente
    const hasAccess = await PatientModel.isTherapistAssigned(patientId, userId);
    if (!hasAccess) {
      console.log(`[CONTACT-LOG] getColleagueContacts: Terapeuta ${userId} não está atribuído ao paciente ${patientId}`);
      return res.status(403).json({ 
        errors: [{ msg: 'Você não está atribuído a este paciente.' }] 
      });
    }

    // Buscar todos os terapeutas atribuídos (exceto o próprio usuário)
    const allTherapists = await PatientModel.getAssignedTherapists(patientId);
    const colleagues = allTherapists.filter(therapist => therapist.id !== userId);

    // Buscar dados do paciente
    const patient = await PatientModel.findById(patientId);

    console.log(`[CONTACT-LOG] getColleagueContacts: Retornando ${colleagues.length} colegas para o terapeuta ${userId}`);

    res.status(200).json({
      patient: {
        id: patient.id,
        name: patient.name
      },
      colleagues: colleagues
    });

  } catch (error) {
    console.error('[CONTACT-LOG] getColleagueContacts: Erro -', error);
    res.status(500).json({ 
      errors: [{ msg: 'Erro interno do servidor.' }] 
    });
  }
};

module.exports = contactController;