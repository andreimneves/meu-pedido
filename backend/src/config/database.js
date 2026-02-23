// backend/src/config/database.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Em produção (Render), as variáveis de ambiente já estão definidas
// Em desenvolvimento, carrega do arquivo .env
if (process.env.NODE_ENV !== 'production') {
    const envPath = path.resolve(__dirname, '../../.env');
    console.log('📁 Carregando .env de:', envPath);
    dotenv.config({ path: envPath });
}

console.log('📊 Configurações do banco:');
console.log('   DB_USER:', process.env.DB_USER ? '✅ definido' : '❌ NÃO DEFINIDO');
console.log('   DB_HOST:', process.env.DB_HOST ? '✅ definido' : '❌ NÃO DEFINIDO');
console.log('   DB_NAME:', process.env.DB_NAME ? '✅ definido' : '❌ NÃO DEFINIDO');
console.log('   NODE_ENV:', process.env.NODE_ENV);

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false
});

// Testar conexão (mas não travar o servidor se falhar)
pool.connect((err, client, release) => {
    if (err) {
        console.error('⚠️ AVISO: Banco de dados não conectado:', err.message);
        console.error('   O servidor continuará rodando, mas funcionalidades que dependem do banco falharão.');
    } else {
        console.log('✅ Conectado ao PostgreSQL com sucesso!');
        release();
    }
});

module.exports = pool;