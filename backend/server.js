// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../.env') });

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
const lojaRoutes = require('./src/routes/loja'); // NOVA ROTA

// ===== REGISTRO DAS ROTAS =====
app.use('/api', produtoRoutes);
app.use('/api', categoriaRoutes);
app.use('/api', configRoutes);
app.use('/api', horarioRoutes);
app.use('/api', pedidoRoutes);
app.use('/api', lojaRoutes); // NOVA ROTA

// ===== ROTA DE TESTE =====
app.get('/', (req, res) => {
    res.json({ 
        mensagem: '🚀 Sistema Meu Pedido funcionando!',
        versao: '1.0.0',
        status: 'online'
    });
});

// ===== ROTA PARA TESTAR SE API ESTÁ NO AR =====
app.get('/api/teste', (req, res) => {
    res.json({ 
        mensagem: '✅ API funcionando!',
        timestamp: new Date().toISOString()
    });
});

// ===== ENDPOINT DE DIAGNÓSTICO =====
app.get('/api/diagnostico', (req, res) => {
    const rotas = [];
    
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

// ===== TRATAMENTO DE ERROS 404 =====
app.use('*', (req, res) => {
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
        mensagem: err.message
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
    console.log('='.repeat(50));
});