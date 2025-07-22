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

const app = express();
const server = http.createServer(app);

// --- INÍCIO DA CONFIGURAÇÃO DO SOCKET.IO ---

const io = new Server(server, {
  cors: {
    origin: "*", // ATENÇÃO: Em produção, restrinja para o URL do seu frontend.
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

  // --- CORREÇÃO DEFINITIVA APLICADA AQUI ---
  // O evento 'joinRoom' agora aceita qualquer 'roomName' enviado pelo cliente.
  // Isso torna o servidor flexível para lidar com 'patient-123', 'discussion-123', etc.
  socket.on('joinRoom', (roomName) => {
    socket.join(roomName);
    console.log(`[Socket.IO] Cliente ${socket.id} entrou na sala: ${roomName}`);
  });

  // Lógica para quando o cliente se desconectar
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
  });
});

// --- FIM DA CONFIGURAÇÃO DO SOCKET.IO ---

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
app.use('/api/parent-chat', parentChatRoutes);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
