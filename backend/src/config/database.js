// backend/src/config/database.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// CAMINHO ABSOLUTO para o .env na raiz do projeto
const envPath = 'C:\\Users\\andre\\Desktop\\meu-pedido\\.env';
console.log('📁 Carregando .env de:', envPath);

// Carregar o .env
dotenv.config({ path: envPath });

console.log('📊 Usuário do banco:', process.env.DB_USER);
console.log('📊 Nome do banco:', process.env.DB_NAME);
console.log('📊 Senha:', process.env.DB_PASSWORD ? '******' : 'VAZIA');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
    port: process.env.DB_PORT,
});

// Testar conexão
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erro ao conectar no banco:', err.message);
    } else {
        console.log('✅ Conectado ao PostgreSQL com sucesso!');
        release();
    }
});

module.exports = pool;