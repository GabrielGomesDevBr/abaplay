const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Importação das rotas
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const patientRoutes = require('./routes/patientRoutes');
const parentRoutes = require('./routes/parentRoutes');
const caseDiscussionRoutes = require('./routes/caseDiscussionRoutes');
const parentChatRoutes = require('./routes/parentChatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const programRoutes = require('./routes/programRoutes');
// --- Adicionada a importação da nova rota ---
const assignmentRoutes = require('./routes/assignmentRoutes');
const contactRoutes = require('./routes/contactRoutes');
const promptLevelRoutes = require('./routes/promptLevelRoutes');
const reportRoutes = require('./routes/reportRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');

// Importa o middleware de autenticação
const { verifyToken } = require('./middleware/authMiddleware');
const { verifyClinicStatus } = require('./middleware/superAdminMiddleware');

const app = express();
const server = http.createServer(app);

// --- INÍCIO DA CONFIGURAÇÃO DO SOCKET.IO ---

const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ["https://abaplay.app.br", "https://www.abaplay.app.br"]
  : "http://localhost:3001";

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Middleware para tornar o 'io' acessível nos controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Lógica de conexão e salas do Socket.IO
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Novo cliente conectado: ${socket.id}`);

  socket.on('joinRoom', (roomName) => {
    socket.join(roomName);
    console.log(`[Socket.IO] Cliente ${socket.id} entrou na sala: ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
  });
});

// --- FIM DA CONFIGURAÇÃO DO SOCKET.IO ---

// Configuração de Middlewares
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Middleware de Log para depuração
app.use((req, res, next) => {
  console.log('--- NOVA REQUISIÇÃO ---');
  console.log(`[${new Date().toISOString()}] Recebida: ${req.method} ${req.originalUrl}`);
  next();
});

// Aplica o middleware de autenticação a todas as rotas /api/* que precisam dele
// Também aplica verificação de status da clínica (suspensão)
app.use('/api/admin', verifyToken, verifyClinicStatus, adminRoutes);
app.use('/api/patients', verifyToken, verifyClinicStatus, patientRoutes);
app.use('/api/parent', verifyToken, verifyClinicStatus, parentRoutes);
app.use('/api/discussions', verifyToken, verifyClinicStatus, caseDiscussionRoutes);
app.use('/api/parent-chat', verifyToken, verifyClinicStatus, parentChatRoutes);
app.use('/api/notifications', verifyToken, verifyClinicStatus, notificationRoutes);
// --- A rota de programas agora também é protegida ---
app.use('/api/programs', verifyToken, verifyClinicStatus, programRoutes);
// --- Adicionada a nova rota de atribuições, devidamente protegida ---
app.use('/api/assignments', verifyToken, verifyClinicStatus, assignmentRoutes);
// --- Nova rota de contatos para sistema de chat iniciado ---
app.use('/api/contacts', verifyToken, verifyClinicStatus, contactRoutes);
// --- Nova rota para gerenciar níveis de prompting ---
app.use('/api/prompt-levels', verifyToken, verifyClinicStatus, promptLevelRoutes);
// --- Nova rota para relatórios de evolução ---
app.use('/api/reports', verifyToken, verifyClinicStatus, reportRoutes);
// --- Nova rota para super admin (sem verificação de clínica) ---
app.use('/api/super-admin', superAdminRoutes);


// Rota de autenticação (não precisa de token)
app.use('/api/auth', authRoutes);


const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
