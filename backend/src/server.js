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

// Importa o middleware de autenticação
const { verifyToken } = require('./middleware/authMiddleware');

const app = express();
const server = http.createServer(app);

// --- INÍCIO DA CONFIGURAÇÃO DO SOCKET.IO ---

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || "https://abaplay-frontend.onrender.com"
      : "http://localhost:3001", // Permitir acesso do frontend
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
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || "https://abaplay-frontend.onrender.com"
    : "http://localhost:3001",
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
// Isso garante que req.user estará disponível nos controllers
app.use('/api/admin', verifyToken, adminRoutes);
app.use('/api/patients', verifyToken, patientRoutes);
app.use('/api/parent', verifyToken, parentRoutes);
app.use('/api/discussions', verifyToken, caseDiscussionRoutes);
app.use('/api/parent-chat', verifyToken, parentChatRoutes);
app.use('/api/notifications', verifyToken, notificationRoutes);
// --- A rota de programas agora também é protegida ---
app.use('/api/programs', verifyToken, programRoutes);
// --- Adicionada a nova rota de atribuições, devidamente protegida ---
app.use('/api/assignments', verifyToken, assignmentRoutes);
// --- Nova rota de contatos para sistema de chat iniciado ---
app.use('/api/contacts', verifyToken, contactRoutes);


// Rota de autenticação (não precisa de token)
app.use('/api/auth', authRoutes);


const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
