// backend/src/config/database.js
const { Pool } = require('pg');

console.log('📊 Configurações do banco:');
console.log('   DB_USER:', process.env.DB_USER ? '✅ definido' : '❌ NÃO DEFINIDO');
console.log('   DB_HOST:', process.env.DB_HOST ? '✅ definido' : '❌ NÃO DEFINIDO');
console.log('   DB_NAME:', process.env.DB_NAME ? '✅ definido' : '❌ NÃO DEFINIDO');
console.log('   NODE_ENV:', process.env.NODE_ENV);

const poolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
    port: process.env.DB_PORT || 5432,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
};

const pool = new Pool(poolConfig);

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ ERRO: Falha na conexão com o banco:');
        console.error('   Mensagem:', err.message);
        console.error('   Código:', err.code);
    } else {
        console.log('✅ Conectado ao PostgreSQL com sucesso!');
        release();
    }
});

module.exports = pool;