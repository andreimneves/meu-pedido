// teste-conexao.js
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

console.log('🔍 DIAGNÓSTICO DE CONEXÃO');
console.log('=' .repeat(50));
console.log('📁 Arquivo .env encontrado?', 'Sim');
console.log('📊 Configurações atuais:');
console.log('   DB_USER:', process.env.DB_USER);
console.log('   DB_HOST:', process.env.DB_HOST);
console.log('   DB_NAME:', process.env.DB_NAME);
console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '******' : '(vazio)');
console.log('   DB_PORT:', process.env.DB_PORT);
console.log('=' .repeat(50));

// Teste 1: Conexão normal
console.log('\n🔄 Testando conexão normal...');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
    port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
    if (err) {
        console.log('❌ ERRO NA CONEXÃO:');
        console.log('   Código:', err.code);
        console.log('   Mensagem:', err.message);
        
        // Teste 2: Conexão sem senha
        console.log('\n🔄 Testando conexão SEM senha...');
        const pool2 = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: '',
            port: process.env.DB_PORT,
        });
        
        pool2.connect((err2, client2, release2) => {
            if (err2) {
                console.log('❌ Também falhou sem senha');
                console.log('   Mensagem:', err2.message);
            } else {
                console.log('✅ CONECTOU SEM SENHA!');
                console.log('💡 Dica: Seu PostgreSQL não está exigindo senha');
                client2.release();
            }
            pool2.end();
        });
        
    } else {
        console.log('✅ CONECTOU COM SUCESSO!');
        console.log('💡 Dica: Sua senha está correta');
        release();
    }
    pool.end();
});