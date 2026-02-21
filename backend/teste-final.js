// backend/teste-final.js
const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO ARQUIVO .env');
console.log('=' .repeat(50));

// Verificar se o arquivo existe
const caminhos = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    'C:\\Users\\andre\\Desktop\\meu-pedido\\.env',
    'C:\\Users\\andre\\Desktop\\.env'
];

caminhos.forEach(caminho => {
    const existe = fs.existsSync(caminho);
    console.log(`📁 ${caminho}: ${existe ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);
    
    if (existe) {
        const conteudo = fs.readFileSync(caminho, 'utf8');
        console.log('   Conteúdo:', conteudo.split('\n')[0]); // mostra primeira linha
    }
});