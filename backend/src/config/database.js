// backend/src/config/database.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// CAMINHO ABSOLUTO QUE FUNCIONOU NO TESTE
const envPath = 'C:\\Users\\andre\\Desktop\\meu-pedido\\.env';
console.log('📁 Carregando .env de:', envPath);

// Carregar .env
dotenv.config({ path: envPath });

console.log('📊 Configurações do banco:');
console.log('   DB_USER:', process.env.DB_USER);
console.log('   DB_HOST:', process.env.DB_HOST);
console.log('   DB_NAME:', process.env.DB_NAME);
console.log('   DB_PORT:', process.env.DB_PORT);
console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ definida' : '❌ NÃO DEFINIDA');

// Forçar senha como string
const dbPassword = process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '';

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: dbPassword,
    port: process.env.DB_PORT,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Testar conexão
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erro detalhado:');
        console.error('   Mensagem:', err.message);
        console.error('   Código:', err.code);
        console.error('   Senha está definida?', dbPassword ? 'Sim' : 'Não');
    } else {
        console.log('✅ Conectado ao PostgreSQL com sucesso!');
        release();
    }
});

module.exports = pool;