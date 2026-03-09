require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

console.log("🚀 Iniciando servidor...");
console.log("📂 Diretório atual:", __dirname);
console.log("🌐 Ambiente:", process.env.NODE_ENV || 'development');

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Rotas da API
try {
    const rotas = require('./src/routes');
    app.use('/api', rotas);
    console.log("✅ Rotas carregadas com sucesso!");
} catch (err) {
    console.error("❌ Erro ao carregar rotas:", err.message);
}

// Rota raiz - redireciona para o frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rota de saúde do servidor
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Porta
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log(`✅ SERVIDOR RODANDO NA PORTA ${PORT}`);
    console.log(`📌 Frontend: https://meu-pedido-backend.onrender.com/`);
    console.log(`📌 Admin: https://meu-pedido-backend.onrender.com/admin/horarios.html`);
    console.log(`📌 API: https://meu-pedido-backend.onrender.com/api/teste`);
    console.log('='.repeat(60));
});