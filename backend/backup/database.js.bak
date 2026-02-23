// backend/src/config/database.js
const { Pool } = require('pg');

console.log('📊 Configurações do banco (Produção):');
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
    // Configuração SSL essencial para o Neon
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000, // 10 segundos de timeout
};

const pool = new Pool(poolConfig);

// Testar a conexão sem travar o servidor
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ ERRO CRÍTICO: Falha na conexão com o banco de dados:');
        console.error('   Mensagem:', err.message);
        console.error('   Código:', err.code);
        console.error('   Verifique as variáveis de ambiente no Render.');
        // Não encerramos o processo, mas o servidor pode não funcionar corretamente.
    } else {
        console.log('✅ Conectado ao PostgreSQL com sucesso!');
        release();
    }
});

module.exports = pool;