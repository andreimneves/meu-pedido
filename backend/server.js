require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

console.log("🚀 Iniciando servidor...");
console.log("📂 Diretório atual:", __dirname);
console.log("🌐 Ambiente:", process.env.NODE_ENV || 'development');
console.log("📊 Configurações do banco:");
console.log("   DB_USER:", process.env.DB_USER);
console.log("   DB_HOST:", process.env.DB_HOST);
console.log("   DB_NAME:", process.env.DB_NAME);
console.log("   DB_PORT:", process.env.DB_PORT);

// Configurações básicas
app.use(cors());
app.use(express.json());

// Servir imagens
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// A MÁGICA: O ".js" FORÇA A IGNORAR A PASTA VELHA
// ==========================================
try {
    const rotas = require('./src/routes.js'); // <-- AQUI ESTÁ A CORREÇÃO!
    app.use('/api', rotas);
    console.log("✅ Rotas carregadas com sucesso!");
} catch (error) {
    console.error("❌ Erro ao carregar as rotas:", error.message);
}

// Ligar o Servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando com sucesso na porta ${PORT}`);
});