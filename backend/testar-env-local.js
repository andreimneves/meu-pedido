// backend/testar-env-local.js
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

console.log('🔍 VERIFICANDO ARQUIVO .env');
console.log('=' .repeat(50));

// Caminhos possíveis
const caminhos = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    'C:\\Users\\andre\\Desktop\\meu-pedido\\.env'
];

caminhos.forEach(caminho => {
    const existe = fs.existsSync(caminho);
    console.log(`📁 ${caminho}: ${existe ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);
    
    if (existe) {
        const conteudo = fs.readFileSync(caminho, 'utf8');
        console.log('   Primeiras linhas:');
        conteudo.split('\n').slice(0, 3).forEach(linha => {
            if (linha.trim() && !linha.startsWith('#')) {
                const [key, value] = linha.split('=');
                console.log(`   → ${key}=${value ? '******' : ''}`);
            }
        });
    }
});

console.log('\n📊 Variáveis de ambiente ATUAIS:');
console.log('   DB_USER:', process.env.DB_USER || '❌ não definido');
console.log('   DB_HOST:', process.env.DB_HOST || '❌ não definido');
console.log('   DB_NAME:', process.env.DB_NAME || '❌ não definido');

// Tentar carregar explicitamente
console.log('\n🔄 Tentando carregar .env explicitamente...');
const envPath = path.join(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.log('❌ Erro ao carregar:', result.error.message);
} else {
    console.log('✅ .env carregado!');
    console.log('📊 Valores após carregar:');
    console.log('   DB_USER:', process.env.DB_USER || '❌');
    console.log('   DB_HOST:', process.env.DB_HOST || '❌');
}