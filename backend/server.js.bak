// ==========================================
// backend/server.js
// ==========================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

console.log("🚀 Iniciando servidor...");
console.log("📂 Diretório atual:", __dirname);

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Carregar rotas
try {
    const rotas = require('./src/routes');
    app.use('/api', rotas);
    console.log("✅ Rotas carregadas com sucesso!");
} catch (error) {
    console.error("❌ Erro ao carregar rotas:", error.message);
}

// Rota raiz
app.get('/', (req, res) => {
    res.json({ 
        status: 'API Meu Pedido rodando',
        rotas_disponiveis: [
            '/api/status',
            '/api/horarios-teste',
            '/api/horarios',
            '/api/status-loja/:subdominio'
        ]
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});