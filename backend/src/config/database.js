// backend/src/config/database.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Carregar .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('📁 Conectando ao banco...');
console.log('   Host:', process.env.DB_HOST);
console.log('   Database:', process.env.DB_NAME);
console.log('   User:', process.env.DB_USER);

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
    port: process.env.DB_PORT || 5432,
    ssl: {
        rejectUnauthorized: false // Importante para o Neon!
    }
});

// Testar conexão
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erro ao conectar no banco:', err.message);
        console.error('   Verifique as variáveis de ambiente');
    } else {
        console.log('✅ Conectado ao PostgreSQL com SSL!');
        release();
    }
});

module.exports = pool;