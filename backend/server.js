// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// ===== ROTAS DE TESTE =====
app.get('/ping', (req, res) => res.send('pong'));
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/', (req, res) => {
    res.json({ 
        mensagem: '🚀 API Meu Pedido funcionando!',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/teste', (req, res) => {
    res.json({ status: 'ok', mensagem: 'API funcionando' });
});

app.get('/api/teste-banco', async (req, res) => {
    try {
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
            port: process.env.DB_PORT || 5432,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        const result = await pool.query('SELECT NOW() as hora');
        await pool.end();
        
        res.json({ 
            sucesso: true, 
            mensagem: 'Conectado ao banco!',
            hora: result.rows[0].hora,
            ambiente: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.json({ sucesso: false, erro: error.message });
    }
});

// ===== IMPORTAÇÃO DAS ROTAS =====
const produtoRoutes = require('./src/routes/produtos');
const categoriaRoutes = require('./src/routes/categorias');
const configRoutes = require('./src/routes/config');
const pedidoRoutes = require('./src/routes/pedidos');

// ===== REGISTRO DAS ROTAS =====
app.use('/api', produtoRoutes);
app.use('/api', categoriaRoutes);
app.use('/api', configRoutes);
app.use('/api', pedidoRoutes);

// ===== TRATAMENTO DE ERROS 404 =====
app.use('*', (req, res) => {
    res.status(404).json({ 
        erro: 'Rota não encontrada',
        caminho: req.originalUrl
    });
});

// ===== INICIAR SERVIDOR =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📌 Rotas disponíveis:`);
    console.log(`   - GET /ping`);
    console.log(`   - GET /health`);
    console.log(`   - GET /`);
    console.log(`   - GET /api/teste`);
    console.log(`   - GET /api/teste-banco`);
    console.log(`   - GET /api/produtos`);
    console.log(`   - GET /api/categorias`);
    console.log(`   - GET /api/config/:subdominio`);
    console.log(`   - GET /api/pedidos/:subdominio`);
});