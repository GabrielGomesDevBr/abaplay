const express = require('express');
const cors = require('cors');

// Importação das rotas
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const patientRoutes = require('./routes/patientRoutes');
const parentRoutes = require('./routes/parentRoutes');
const caseDiscussionRoutes = require('./routes/caseDiscussionRoutes');

const app = express();

// Configuração de Middlewares
app.use(cors());
app.use(express.json());

// Middleware de Log para depuração
app.use((req, res, next) => {
  console.log('--- NOVA REQUISIÇÃO ---');
  console.log(`[${new Date().toISOString()}] Recebida: ${req.method} ${req.originalUrl}`);
  next();
});

// Configuração das Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/discussions', caseDiscussionRoutes);

// --- CORREÇÃO ---
// Altera a porta padrão do servidor de 5000 para 3000.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
