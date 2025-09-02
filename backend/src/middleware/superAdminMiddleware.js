// backend/src/middleware/superAdminMiddleware.js

/**
 * Middleware para verificar se o usuário tem permissões de super administrador.
 * Usado para proteger rotas exclusivas do super admin.
 */
const verifySuperAdmin = (req, res, next) => {
  if (!req.user) {
    console.warn('Tentativa de acesso à rota super admin sem autenticação.');
    return res.status(401).json({ 
      errors: [{ msg: 'Acesso negado. Usuário não autenticado.' }] 
    });
  }

  // Verifica se o usuário é super admin
  if (req.user.role !== 'super_admin' || !req.user.is_admin) {
    console.warn(`Tentativa de acesso à rota super admin por usuário não autorizado (ID: ${req.user.id}, Role: ${req.user.role}).`);
    return res.status(403).json({ 
      errors: [{ msg: 'Acesso negado. Recurso disponível apenas para super administradores.' }] 
    });
  }

  // Verificação adicional: super admin deve ter clinic_id NULL
  if (req.user.clinic_id !== null && req.user.clinic_id !== undefined) {
    console.warn(`Super admin com clinic_id inválido (ID: ${req.user.id}, clinic_id: ${req.user.clinic_id}).`);
    return res.status(403).json({ 
      errors: [{ msg: 'Configuração de super admin inválida.' }] 
    });
  }

  console.log(`Super admin autenticado: ${req.user.username} (ID: ${req.user.id})`);
  next();
};

/**
 * Middleware para verificar status da clínica e aplicar suspensão.
 * Usado nas rotas normais para bloquear clínicas suspensas.
 */
const verifyClinicStatus = async (req, res, next) => {
  // Super admin não é afetado por suspensão de clínicas
  if (req.user.role === 'super_admin') {
    return next();
  }

  // Se não tem clinic_id, passa direto (casos especiais)
  if (!req.user.clinic_id) {
    return next();
  }

  try {
    const pool = require('../models/db.js');
    const query = 'SELECT status, suspension_reason FROM clinics WHERE id = $1';
    const { rows } = await pool.query(query, [req.user.clinic_id]);

    if (!rows.length) {
      return res.status(404).json({ 
        errors: [{ msg: 'Clínica não encontrada.' }] 
      });
    }

    const clinic = rows[0];

    if (clinic.status === 'suspended') {
      // Diferentes mensagens baseadas no role do usuário
      let message = '';
      
      if (req.user.is_admin) {
        message = `Clínica suspensa: ${clinic.suspension_reason || 'Motivo não informado'}. Entre em contato com o suporte para regularização.`;
      } else if (req.user.role === 'terapeuta') {
        message = 'Sistema temporariamente em manutenção. Entre em contato com a administração da clínica.';
      } else {
        message = 'Sistema em manutenção programada. Em breve retornaremos com todas as funcionalidades.';
      }

      return res.status(403).json({
        errors: [{ msg: message }],
        clinic_suspended: true,
        is_admin: req.user.is_admin || false
      });
    }

    if (clinic.status === 'inactive') {
      return res.status(403).json({ 
        errors: [{ msg: 'Clínica desativada. Entre em contato com o suporte.' }] 
      });
    }

    next();

  } catch (error) {
    console.error('Erro ao verificar status da clínica:', error);
    res.status(500).json({ 
      errors: [{ msg: 'Erro interno do servidor.' }] 
    });
  }
};

module.exports = {
  verifySuperAdmin,
  verifyClinicStatus
};