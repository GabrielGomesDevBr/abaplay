// -----------------------------------------------------------------------------
// Arquivo de Middleware de Autenticação (backend/src/middleware/authMiddleware.js)
// -----------------------------------------------------------------------------
// - CORRIGIDO: Padronizada a estrutura de resposta de erro para ser consistente
//   com o resto da aplicação ({ errors: [{ msg: '...' }] }).
// - MELHORADO: Adicionados logs mais detalhados para depuração de erros de token.
// -----------------------------------------------------------------------------

const jwt = require('jsonwebtoken');
const dbConfig = require('../config/db.config.js');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.warn('Tentativa de acesso negada: Token não fornecido.');
    // CORREÇÃO: Usa o formato de erro padronizado.
    return res.status(401).json({ errors: [{ msg: 'Acesso negado. Token não fornecido.' }] });
  }

  try {
    const decodedPayload = jwt.verify(token, dbConfig.JWT_SECRET);
    req.user = decodedPayload;
    // Removido o log daqui para reduzir o ruído em caso de sucesso.
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

module.exports = {
  verifyToken
};

// -----------------------------------------------------------------------------
// Fim do arquivo authMiddleware.js
// -----------------------------------------------------------------------------
