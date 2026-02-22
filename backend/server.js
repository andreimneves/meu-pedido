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

// ===== MIDDLEWARE DE DEBUG PARA VER TODAS AS REQUISIÇÕES =====
app.use((req, res, next) => {
    console.log(`📨 [${req.method}] ${req.originalUrl}`);
    next();
});

// ===== REGISTRO DAS ROTAS COM O PADRÃO CORRETO =====
// IMPORTANTE: O padrão /api/pedidos/:subdominio passa o :subdominio como parâmetro
// para o router, que precisa de mergeParams:true para enxergá-lo
app.use('/api/pedidos/:subdominio', pedidoRoutes);  // A ordem aqui não importa tanto

// Outras rotas (que não precisam de mergeParams)
app.use('/api', produtoRoutes);
app.use('/api', categoriaRoutes);
app.use('/api', configRoutes);
app.use('/api', horarioRoutes);

// ===== ROTA DE DEBUG GERAL =====
app.get('/api/debug', (req, res) => {
    res.json({
        mensagem: 'API funcionando',
        rotas_disponiveis: [
            'GET /api/debug',
            'GET /api/pedidos/:subdominio',
            'GET /api/pedidos/:subdominio/:id',
            'PUT /api/pedidos/:subdominio/:id/status',
            'DELETE /api/pedidos/:subdominio/:id',
            'POST /api/pedidos/:subdominio',
            'GET /api/dashboard/:subdominio'
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

// ENDPOINT DE DIAGNÓSTICO - REMOVA DEPOIS
app.get('/api/diagnostico', (req, res) => {
    const rotas = [];
    
    // Função para extrair rotas registradas (simplificado)
    function listarRotas(stack, basePath = '') {
        stack.forEach(layer => {
            if (layer.route) {
                const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
                rotas.push(`${methods} ${basePath}${layer.route.path}`);
            } else if (layer.name === 'router' && layer.handle.stack) {
                listarRotas(layer.handle.stack, basePath + (layer.regexp.source.replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/').replace(/\^/g, '').replace(/\?/g, '')));
            }
        });
    }
    
    listarRotas(app._router.stack);
    
    res.json({
        mensagem: 'Rotas registradas',
        rotas: rotas.sort()
    });
});