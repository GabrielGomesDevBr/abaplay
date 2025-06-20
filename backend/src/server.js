// -----------------------------------------------------------------------------
// Arquivo Principal do Servidor Backend (server.js) - ATUALIZADO
// -----------------------------------------------------------------------------
// Configura e inicia o servidor Express, com CORS, rotas, dotenv,
// tratamento de erros centralizado e cabeçalhos de segurança Helmet.
// Adiciona as rotas para pais.
// -----------------------------------------------------------------------------

// Carrega as variáveis de ambiente do arquivo .env para process.env O MAIS CEDO POSSÍVEL
require('dotenv').config();

// 1. Importar as dependências necessárias
// -----------------------------------------------------------------------------
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const parentRoutes = require('./routes/parentRoutes');
const adminRoutes = require('./routes/adminRoutes'); // <<< NOVO: Importa as rotas de admin
const helmet = require('helmet');

// 2. Configuração Inicial
// -----------------------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Middleware Essencial
// -----------------------------------------------------------------------------
app.use(cors()); // Habilita CORS
app.use(express.json()); // Habilita parsing de JSON
app.use(helmet()); // Adiciona cabeçalhos de segurança HTTP

// 4. Rotas da API
// -----------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Bem-vindo à API do ABAplay Full-Stack! CORS está habilitado.' });
});
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/admin', adminRoutes); // <<< NOVO: Regista as rotas de admin

// 5. Tratamento de Erros Centralizado (Middleware de Erro)
// -----------------------------------------------------------------------------
// Deve ser o ÚLTIMO app.use() antes do app.listen()
app.use((err, req, res, next) => {
  // Loga o erro completo no console do servidor para depuração
  console.error("ERRO NÃO TRATADO:", err.stack || err);

  // Define um status code padrão para erros internos
  const statusCode = err.statusCode || 500;

  // Define uma mensagem de erro segura para o cliente
  const message = (process.env.NODE_ENV === 'production' && statusCode === 500)
                  ? 'Ocorreu um erro interno inesperado no servidor.'
                  : err.message || 'Erro interno do servidor.';

  // Envia a resposta de erro padronizada
  res.status(statusCode).json({
    errors: [{ msg: message }] // Mantém o formato de erro padronizado
  });
});

// 6. Iniciar o Servidor
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Servidor backend do ABAplay a correr na porta ${PORT}`);
  // Verifica se o segredo JWT foi carregado (APENAS PARA DEBUG INICIAL)
  if (!process.env.JWT_SECRET) {
    console.warn('\x1b[31m%s\x1b[0m', 'ATENÇÃO: Segredo JWT (JWT_SECRET) não carregado!');
  } else {
    console.log('Segredo JWT carregado com sucesso.');
  }
   // Verifica se a senha do DB foi carregada (APENAS PARA DEBUG INICIAL)
  if (!process.env.DB_PASSWORD) {
      console.warn('\x1b[31m%s\x1b[0m', 'ATENÇÃO: Senha do Banco de Dados (DB_PASSWORD) não carregada!');
  }
  // A conexão com o banco será testada pelo db.js
});
