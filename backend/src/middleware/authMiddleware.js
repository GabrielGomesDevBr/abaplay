// -----------------------------------------------------------------------------
// Arquivo de Middleware de Autenticação (backend/src/middleware/authMiddleware.js)
// -----------------------------------------------------------------------------
// - CORRIGIDO: Padronizada a estrutura de resposta de erro para ser consistente
//   com o resto da aplicação ({ errors: [{ msg: '...' }] }).
// - MELHORADO: Adicionados logs mais detalhados para depuração de erros de token.
// - ADICIONADO: Middleware `requireAdmin` para verificar permissões de administrador.
// -----------------------------------------------------------------------------

const jwt = require('jsonwebtoken');
const dbConfig = require('../config/db.config.js');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('[AUTH-MIDDLEWARE] Verificando token para:', req.method, req.path);
  console.log('[AUTH-MIDDLEWARE] Authorization header:', authHeader ? `${authHeader.substring(0, 30)}...` : 'null');

  if (!token) {
    console.warn('[AUTH-MIDDLEWARE] Tentativa de acesso negada: Token não fornecido.');
    // CORREÇÃO: Usa o formato de erro padronizado.
    return res.status(401).json({ errors: [{ msg: 'Acesso negado. Token não fornecido.' }] });
  }

  try {
    const decodedPayload = jwt.verify(token, dbConfig.JWT_SECRET);
    req.user = decodedPayload;
    console.log('[AUTH-MIDDLEWARE] Token válido para usuário:', {
      id: decodedPayload.id,
      role: decodedPayload.role,
      is_admin: decodedPayload.is_admin,
      clinic_id: decodedPayload.clinic_id
    });
    next();
  } catch (error) {
    // MELHORIA: Log detalhado do erro no console do backend para depuração.
    console.error('ERRO NA VERIFICAÇÃO DO TOKEN:', {
        errorMessage: error.message,
        tokenReceived: process.env.NODE_ENV === 'production' ? '[HIDDEN]' : token, // Não loga token em produção
        errorType: error.name,
        JWT_SECRET_EXISTS: !!dbConfig.JWT_SECRET,
        JWT_SECRET_LENGTH: dbConfig.JWT_SECRET ? dbConfig.JWT_SECRET.length : 0
    });
    
    // CORREÇÃO: Usa o formato de erro padronizado para todas as respostas.
    if (error instanceof jwt.TokenExpiredError) {
        return res.status(403).json({ errors: [{ msg: 'Token expirado. Faça login novamente.' }] });
    }
    if (error instanceof jwt.JsonWebTokenError) {
        return res.status(403).json({ errors: [{ msg: 'Token inválido.' }] });
    }
    
    return res.status(403).json({ errors: [{ msg: 'Falha na autenticação do token.' }] });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ errors: [{ msg: 'Acesso negado. Requer privilégios de administrador.' }] });
  }
  next();
};

module.exports = {
  verifyToken,
  requireAdmin
};

// -----------------------------------------------------------------------------
// Fim do arquivo authMiddleware.js
// -----------------------------------------------------------------------------