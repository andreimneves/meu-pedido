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

// Servir uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotas
try {
    const rotas = require('./src/routes');
    app.use('/api', rotas);
    console.log("✅ Rotas carregadas!");
} catch (err) {
    console.error("❌ Erro ao carregar rotas:", err);
}

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'API rodando' });
});

// Porta
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});