// -----------------------------------------------------------------------------
// Arquivo de Conexão com o Banco de Dados (backend/src/models/db.js) - ATUALIZADO COM SSL
// -----------------------------------------------------------------------------
// Adiciona a configuração de SSL para permitir a conexão com bancos de dados
// remotos que exigem uma conexão segura, como o do Render.
// -----------------------------------------------------------------------------

const { Pool } = require('pg');
const dbConfig = require('../config/db.config.js');

let poolConfig;
const isProduction = process.env.NODE_ENV === 'production';

// Define a configuração de SSL. Para o Render, geralmente é necessário.
// 'rejectUnauthorized: false' é frequentemente usado em desenvolvimento para
// permitir a conexão sem precisar configurar certificados locais.
const sslConfig = {
  ssl: {
    rejectUnauthorized: false
  }
};

if (process.env.DATABASE_URL) {
  // --- Usar DATABASE_URL (Ambiente Render/Produção) ---
  console.log("INFO: Conectando ao PostgreSQL via DATABASE_URL.");
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    // Adiciona a configuração SSL aqui também
    ...sslConfig,
    // Configurações de pool
    max: dbConfig.pool.max || 5,
    idleTimeoutMillis: dbConfig.pool.idle || 10000,
    connectionTimeoutMillis: dbConfig.pool.acquire || 30000,
  };
} else {
  // --- Usar Variáveis Separadas (Ambiente Local/Desenvolvimento) ---
  console.log("INFO: Conectando ao PostgreSQL via variáveis de ambiente separadas (local?).");
  if (!dbConfig.USER || !dbConfig.HOST || !dbConfig.DB || !dbConfig.PASSWORD || !dbConfig.PORT) {
    console.error("ERRO FATAL: Variáveis de ambiente do banco de dados não definidas!");
  }
  poolConfig = {
    host: dbConfig.HOST,
    port: dbConfig.PORT,
    user: dbConfig.USER,
    password: dbConfig.PASSWORD,
    database: dbConfig.DB,
    // Adiciona a configuração SSL aqui
    ...sslConfig,
    // Configurações do pool
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  };
}

// Cria o Pool de Conexões com a configuração final
const pool = new Pool(poolConfig);

// Testar a Conexão e Lidar com Erros
pool.connect((err, client, release) => {
  if (err) {
    console.error('ERRO INICIAL ao conectar ao banco de dados PostgreSQL:', err.message);
    console.error('Detalhes do erro:', err.stack);
    return;
  }
  console.log('INFO: Conexão inicial com o banco de dados PostgreSQL estabelecida com sucesso!');
  release();
});

pool.on('error', (err, client) => {
  console.error('ERRO INESPERADO no cliente ocioso do pool PostgreSQL:', err);
});

module.exports = pool;
