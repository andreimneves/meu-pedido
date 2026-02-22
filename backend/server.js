// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '.env') });

// Criar app Express
const app = express();

// Middlewares
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== IMPORTAÇÃO DAS ROTAS =====
const produtoRoutes = require('./src/routes/produtos');
const categoriaRoutes = require('./src/routes/categorias');
const configRoutes = require('./src/routes/config');
const horarioRoutes = require('./src/routes/horarios');
const pedidoRoutes = require('./src/routes/pedidos');

// ===== REGISTRO DAS ROTAS =====
app.use('/api', produtoRoutes);
app.use('/api', categoriaRoutes);
app.use('/api', configRoutes);
app.use('/api', horarioRoutes);
app.use('/api', pedidoRoutes);

// ===== ROTA DE TESTE =====
app.get('/', (req, res) => {
    res.json({ 
        mensagem: '🚀 Sistema Meu Pedido funcionando!',
        versao: '1.0.0',
        status: 'online',
        rotas_disponiveis: [
            '/api/produtos',
            '/api/categorias',
            '/api/config/:subdominio',
            '/api/horarios/:subdominio',
            '/api/horarios/disponibilidade/:subdominio',
            '/api/pedidos (POST)',
            '/api/pedidos/:subdominio (GET)',
            '/api/pedidos/:subdominio/:id (GET)',
            '/api/pedidos/:subdominio/:id/status (PUT)',
            '/api/dashboard/:subdominio (GET)'
        ]
    });
});

// ===== ROTA PARA TESTAR SE API ESTÁ NO AR =====
app.get('/api/teste', (req, res) => {
    res.json({ 
        mensagem: '✅ API funcionando!',
        timestamp: new Date().toISOString()
    });
});

// ===== TRATAMENTO DE ERROS 404 =====
app.use('*', (req, res) => {
    res.status(404).json({ 
        erro: 'Rota não encontrada',
        caminho: req.originalUrl,
        metodo: req.method,
        sugestao: 'Verifique se a URL está correta'
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
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 SERVIDOR INICIADO COM SUCESSO!');
    console.log('='.repeat(50));
    console.log(`📡 Porta: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log('\n📋 ROTAS DISPONÍVEIS:');
    console.log('   - GET  /');
    console.log('   - GET  /api/teste');
    console.log('   - GET  /api/produtos');
    console.log('   - GET  /api/categorias');
    console.log('   - GET  /api/config/:subdominio');
    console.log('   - PUT  /api/config/:subdominio');
    console.log('   - GET  /api/horarios/:subdominio');
    console.log('   - PUT  /api/horarios/:subdominio');
    console.log('   - GET  /api/horarios/disponibilidade/:subdominio');
    console.log('   - POST /api/pedidos');
    console.log('   - GET  /api/pedidos/:subdominio');
    console.log('   - GET  /api/pedidos/:subdominio/:id');
    console.log('   - PUT  /api/pedidos/:subdominio/:id/status');
    console.log('   - DELETE /api/pedidos/:subdominio/:id');
    console.log('   - GET  /api/dashboard/:subdominio');
    console.log('='.repeat(50));
});