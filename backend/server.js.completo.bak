// backend/server.js
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// ===== ROTA DE SAÚDE =====
app.get('/health', (req, res) => res.status(200).send('OK'));

// ===== ROTA PRINCIPAL =====
app.get('/', (req, res) => {
    res.json({ 
        mensagem: '🚀 API Meu Pedido funcionando!',
        versao: '1.0.0',
        status: 'online'
    });
});

// ===== ROTA DE TESTE =====
app.get('/api/teste', (req, res) => {
    res.json({ 
        mensagem: '✅ API funcionando!',
        timestamp: new Date().toISOString()
    });
});

// ===== ROTA DE PRODUTOS (REAL) =====
const produtoRoutes = require('./src/routes/produtos');
app.use('/api', produtoRoutes);

// ===== ROTA DE CATEGORIAS =====
const categoriaRoutes = require('./src/routes/categorias');
app.use('/api', categoriaRoutes);

// ===== ROTA DE CONFIGURAÇÕES =====
const configRoutes = require('./src/routes/config');
app.use('/api', configRoutes);

// ===== ROTA DE HORÁRIOS =====
const horarioRoutes = require('./src/routes/horarios');
app.use('/api', horarioRoutes);

// ===== ROTA DE PEDIDOS =====
const pedidoRoutes = require('./src/routes/pedidos');
app.use('/api', pedidoRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📌 Rotas ativas: /, /health, /api/teste, /api/produtos, /api/categorias, /api/config, /api/horarios, /api/pedidos`);
});