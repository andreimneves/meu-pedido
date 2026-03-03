// backend/testar-env.js
const dotenv = require('dotenv');
const path = require('path');

// Carregar .env da pasta raiz
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔍 TESTANDO CARREGAMENTO DO .env');
console.log('=' .repeat(50));
console.log('📁 Caminho do .env:', path.join(__dirname, '../.env'));
console.log('📊 Variáveis lidas:');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'senha carregada' : 'VAZIO');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('=' .repeat(50));