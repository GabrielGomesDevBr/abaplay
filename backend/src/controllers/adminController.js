// backend/src/controllers/adminController.js

const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const UserModel = require('../models/userModel.js');
const PatientModel = require('../models/patientModel.js');
const AssignmentModel = require('../models/assignmentModel.js');
const ClinicModel = require('../models/clinicModel.js');

const formatValidationErrors = (errors) => {
    return { errors: errors.array().map(err => ({ msg: err.msg, param: err.param || err.path })) };
};

const AdminController = {
  
  async getAllUsers(req, res, next) {
    try {
      const { clinic_id } = req.user;
      if (!clinic_id) {
        return res.status(400).json({ errors: [{ msg: 'Administrador não está associado a uma clínica.' }] });
      }
      const users = await UserModel.findAllByClinicId(clinic_id);
      const safeUsers = users.map(user => {
        const { password_hash, ...safeUser } = user;
        return safeUser;
      });
      res.status(200).json({ users: safeUsers });
    } catch (error) {
      next(error);
    }
  },

  async createUser(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(formatValidationErrors(errors));
    }
    try {
        const { fullName, username, password, role, associated_patient_id } = req.body;
        const { clinic_id } = req.user; 
        const existingUser = await UserModel.findByUsername(username);
        if (existingUser) {
            return res.status(409).json({ errors: [{ msg: 'Este nome de utilizador já está em uso.', param: 'username' }] });
        }
        if (role === 'admin') {
             return res.status(403).json({ errors: [{ msg: 'Não é permitido criar outro administrador.' }] });
        }
        if (role === 'pai' && !associated_patient_id) {
            return res.status(400).json({ errors: [{ msg: 'Para o papel de "Pai/Responsável", o ID do paciente associado é obrigatório.', param: 'associated_patient_id' }] });
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const newUserPayload = {
            username: username,
            password_hash: hashedPassword,
            full_name: fullName,
            role: role,
            is_admin: false, 
            clinic_id: clinic_id,
            associated_patient_id: role === 'pai' ? associated_patient_id : null,
        };

        const createdUser = await UserModel.create(newUserPayload);
        const { password_hash, ...safeUser } = createdUser;
        res.status(201).json({
            message: `Utilizador "${safeUser.full_name}" criado com sucesso!`,
            user: safeUser,
        });
    } catch (error) {
        next(error);
    }
  },

  async updateUser(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(formatValidationErrors(errors));
    }
    
    try {
        const { userId } = req.params;
        const { fullName, username, password, role, associated_patient_id } = req.body;

        if (Number(userId) === req.user.userId) {
            return res.status(403).json({ errors: [{ msg: 'Não pode editar o seu próprio perfil por esta via. Utilize uma página de perfil dedicada.' }] });
        }
        
        const updateData = { full_name: fullName, username, role, associated_patient_id };

        if (password) {
            const saltRounds = 10;
            updateData.password_hash = await bcrypt.hash(password, saltRounds);
        }

        const updatedUser = await UserModel.update(userId, updateData, req.user.clinic_id);

        if (!updatedUser) {
            return res.status(404).json({ errors: [{ msg: 'Utilizador não encontrado ou não pertence a esta clínica.' }] });
        }

        res.status(200).json({
            message: `Utilizador "${updatedUser.full_name}" atualizado com sucesso!`,
            user: updatedUser,
        });

    } catch (error) {
        if (error.code === '23505') {
             return res.status(409).json({ errors: [{ msg: 'Este nome de utilizador já está em uso.', param: 'username' }] });
        }
        next(error);
    }
  },
  
  // <<< FUNÇÃO DELETEUSER CORRIGIDA >>>
  async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;

      if (Number(userId) === req.user.userId) {
        return res.status(403).json({ errors: [{ msg: 'Ação não permitida. Não pode apagar a sua própria conta de administrador.' }] });
      }

      const rowCount = await UserModel.delete(userId, req.user.clinic_id);

      if (rowCount === 0) {
        return res.status(404).json({ errors: [{ msg: 'Utilizador não encontrado ou não pertence a esta clínica.' }] });
      }

      res.status(200).json({ message: 'Utilizador apagado com sucesso!' });

    } catch (error) {
      if (error.message && error.message.includes('atribuições ativas')) {
        return res.status(400).json({
          errors: [{ msg: error.message }],
          requiresTransfer: true
        });
      }
      console.error(`Erro ao apagar utilizador com ID ${req.params.userId}:`, error);
      next(error);
    }
  },

  // <<< NOVOS ENDPOINTS PARA TRANSFERÊNCIA >>>
  async getTherapistAssignments(req, res, next) {
    try {
      const { userId } = req.params;
      const { clinic_id } = req.user;

      const assignments = await UserModel.getTherapistAssignments(userId, clinic_id);
      res.status(200).json(assignments);

    } catch (error) {
      console.error(`Erro ao buscar atribuições do terapeuta ${req.params.userId}:`, error);
      next(error);
    }
  },

  async transferTherapistAssignments(req, res, next) {
    try {
      const { userId } = req.params;
      const { transferList } = req.body;
      const { clinic_id } = req.user;

      if (!Array.isArray(transferList) || transferList.length === 0) {
        return res.status(400).json({
          errors: [{ msg: 'Lista de transferências é obrigatória e deve conter pelo menos um item.' }]
        });
      }

      const result = await UserModel.transferAssignments(userId, transferList);

      res.status(200).json({
        message: `${result.transferred_count} atribuições transferidas com sucesso!`,
        result
      });

    } catch (error) {
      console.error(`Erro ao transferir atribuições do terapeuta ${req.params.userId}:`, error);
      next(error);
    }
  },

  async getAllPatients(req, res, next) {
    try {
      const { clinic_id } = req.user;
      if (!clinic_id) {
        return res.status(400).json({ errors: [{ msg: 'Administrador não está associado a uma clínica.' }] });
      }
      const patients = await PatientModel.findAllByClinicId(clinic_id);
      res.status(200).json({ patients });
    } catch (error) {
      next(error);
    }
  },

  async createPatient(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(formatValidationErrors(errors));
    }
    try {
        const { name, dob, diagnosis, general_notes } = req.body;
        const { clinic_id, userId } = req.user;

        // Verificar limite de pacientes da clínica
        const clinic = await ClinicModel.findById(clinic_id);
        if (!clinic) {
            return res.status(404).json({
                errors: [{ msg: 'Clínica não encontrada.' }]
            });
        }

        // Contar pacientes atuais da clínica
        const currentPatientsCount = await PatientModel.countByClinicId(clinic_id);

        // Verificar se excede o limite
        if (currentPatientsCount >= clinic.max_patients) {
            return res.status(400).json({
                errors: [{
                    msg: `Limite de pacientes atingido. Sua clínica suporta no máximo ${clinic.max_patients} pacientes. Atualmente tem ${currentPatientsCount}. Entre em contato para aumentar seu plano.`
                }]
            });
        }

        const patientData = { name, dob, diagnosis, general_notes };
        const newPatient = await PatientModel.create(patientData, clinic_id);
        res.status(201).json({
            message: `Paciente "${newPatient.name}" criado com sucesso!`,
            patient: newPatient,
        });
    } catch (error) {
        next(error);
    }
  },
  
  async deletePatient(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(formatValidationErrors(errors));
    }
    
    try {
        const { patientId } = req.params;
        const { clinic_id } = req.user;
        const rowCount = await PatientModel.adminDelete(patientId, clinic_id);

        if (rowCount === 0) {
            return res.status(404).json({ errors: [{ msg: 'Paciente não encontrado ou não pertence a esta clínica.' }] });
        }

        res.status(200).json({ message: 'Paciente apagado com sucesso!' });

    } catch (error) {
        next(error);
    }
  },

  async getPatientAssignments(req, res, next) {
    try {
      const { patientId } = req.params;
      const patient = await PatientModel.findById(patientId);
      if (!patient || patient.clinic_id !== req.user.clinic_id) {
        return res.status(404).json({ errors: [{ msg: 'Paciente não encontrado ou não pertence a esta clínica.' }] });
      }
      const assignedTherapists = await AssignmentModel.getAssignedTherapists(patientId);
      res.status(200).json({ therapists: assignedTherapists });
    } catch (error) {
      next(error);
    }
  },

  async updatePatientAssignments(req, res, next) {
    try {
      const { patientId } = req.params;
      const { therapistIds } = req.body;
      if (!Array.isArray(therapistIds)) {
        return res.status(400).json({ errors: [{ msg: 'O campo "therapistIds" deve ser um array.' }] });
      }
      const patient = await PatientModel.findById(patientId);
      if (!patient || patient.clinic_id !== req.user.clinic_id) {
        return res.status(404).json({ errors: [{ msg: 'Paciente não encontrado ou não pertence a esta clínica.' }] });
      }
      await AssignmentModel.updateAssignmentsForPatient(patientId, therapistIds);
      res.status(200).json({ message: 'Atribuições do paciente atualizadas com sucesso!' });
    } catch (error) {
      next(error);
    }
  },

  async getAllAssignments(req, res, next) {
    try {
      const { clinic_id } = req.user;
      if (!clinic_id) {
        return res.status(400).json({ errors: [{ msg: 'Administrador não está associado a uma clínica.' }] });
      }

      const assignments = await AssignmentModel.getAllAssignments(clinic_id);

      // Formatando dados para melhor exibição
      const formattedAssignments = assignments.map(assignment => ({
        ...assignment,
        average_score: Math.round(assignment.average_score * 100) / 100, // 2 casas decimais
        total_sessions: parseInt(assignment.total_sessions) || 0,
        has_custom_trials: assignment.custom_trials !== null
      }));

      res.status(200).json({ assignments: formattedAssignments });
    } catch (error) {
      console.error('Erro ao buscar todas as atribuições:', error);
      next(error);
    }
  },
};

module.exports = AdminController;
