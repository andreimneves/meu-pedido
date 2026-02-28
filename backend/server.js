// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();

// Middlewares
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== LOGS INICIAIS =====
console.log('🚀 Iniciando servidor...');
console.log(`📂 Diretório atual: ${__dirname}`);
console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);

// ===== ROTAS DE TESTE E SAÚDE =====
app.get('/ping', (req, res) => res.send('pong'));
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/', (req, res) => {
    res.json({ 
        mensagem: '🚀 API Meu Pedido funcionando!',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/teste', (req, res) => {
    res.json({ 
        status: 'ok', 
        mensagem: 'API funcionando',
        timestamp: new Date().toISOString()
    });
});

// ===== ROTA DE TESTE DO BANCO =====
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
        
        const result = await pool.query('SELECT NOW() as hora, current_database() as banco');
        await pool.end();
        
        res.json({ 
            sucesso: true, 
            mensagem: 'Conectado ao banco!',
            hora: result.rows[0].hora,
            banco: result.rows[0].banco,
            ambiente: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        console.error('❌ Erro no teste do banco:', error);
        res.json({ 
            sucesso: false, 
            erro: error.message,
            ambiente: process.env.NODE_ENV || 'development'
        });
    }
});

// ===== ROTA DE DIAGNÓSTICO =====
app.get('/api/debug', (req, res) => {
    res.json({
        status: 'ok',
        ambiente: process.env.NODE_ENV,
        variaveis: {
            DB_USER: process.env.DB_USER ? '✅' : '❌',
            DB_HOST: process.env.DB_HOST ? '✅' : '❌',
            DB_NAME: process.env.DB_NAME ? '✅' : '❌',
            DB_PASSWORD: process.env.DB_PASSWORD ? '✅' : '❌'
        },
        rotas: [
            'GET /',
            'GET /ping',
            'GET /health',
            'GET /api/teste',
            'GET /api/teste-banco',
            'GET /api/debug',
            'GET /api/produtos',
            'GET /api/categorias',
            'GET /api/config/:subdominio',
            'GET /api/horarios/:subdominio',
            'PUT /api/horarios/:subdominio',
            'GET /api/horarios/disponibilidade/:subdominio',
            'GET /api/complementos',
            'GET /api/complementos/produto/:produtoId',
            'POST /api/pedidos',
            'GET /api/pedidos/:subdominio',
            'GET /api/pedidos/:subdominio/:id',
            'PUT /api/pedidos/:subdominio/:id/status',
            'GET /api/dashboard/:subdominio'
        ]
    });
});

// ===== IMPORTAÇÃO DAS ROTAS =====
const produtoRoutes = require('./src/routes/produtos');
const categoriaRoutes = require('./src/routes/categorias');
const configRoutes = require('./src/routes/config');
const horarioRoutes = require('./src/routes/horarios');
const pedidoRoutes = require('./src/routes/pedidos');
const complementoRoutes = require('./src/routes/complementos');

// ===== REGISTRO DAS ROTAS =====
app.use('/api', produtoRoutes);
app.use('/api', categoriaRoutes);
app.use('/api', configRoutes);
app.use('/api', horarioRoutes);
app.use('/api', pedidoRoutes);
app.use('/api', complementoRoutes);

// ===== TRATAMENTO DE ERROS 404 =====
app.use('*', (req, res) => {
    console.log(`❌ Rota não encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        erro: 'Rota não encontrada',
        caminho: req.originalUrl,
        metodo: req.method
    });
});

// ===== TRATAMENTO DE ERROS GLOBAIS =====
app.use((err, req, res, next) => {
    console.error('❌ Erro no servidor:', err);
    res.status(500).json({ 
        erro: 'Erro interno no servidor',
        mensagem: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ===== INICIAR SERVIDOR =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 SERVIDOR INICIADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`📡 Porta: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(60));
    console.log('\n📋 ROTAS DISPONÍVEIS:');
    console.log('   - GET  /');
    console.log('   - GET  /ping');
    console.log('   - GET  /health');
    console.log('   - GET  /api/teste');
    console.log('   - GET  /api/teste-banco');
    console.log('   - GET  /api/debug');
    console.log('   - GET  /api/produtos');
    console.log('   - GET  /api/categorias');
    console.log('   - GET  /api/config/:subdominio');
    console.log('   - GET  /api/horarios/:subdominio');
    console.log('   - PUT  /api/horarios/:subdominio');
    console.log('   - GET  /api/horarios/disponibilidade/:subdominio');
    console.log('   - GET  /api/complementos');
    console.log('   - GET  /api/complementos/produto/:produtoId');
    console.log('   - POST /api/pedidos');
    console.log('   - GET  /api/pedidos/:subdominio');
    console.log('   - GET  /api/pedidos/:subdominio/:id');
    console.log('   - PUT  /api/pedidos/:subdominio/:id/status');
    console.log('   - GET  /api/dashboard/:subdominio');
    console.log('='.repeat(60));
});