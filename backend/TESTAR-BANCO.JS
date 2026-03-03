// backend/testar-banco.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔍 Testando conexão com o banco...');
console.log('   Host:', process.env.DB_HOST);
console.log('   Database:', process.env.DB_NAME);
console.log('   User:', process.env.DB_USER);

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ ERRO:', err.message);
    } else {
        console.log('✅ CONECTOU!');
        release();
    }
    pool.end();
});