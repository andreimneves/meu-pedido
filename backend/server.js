// backend/server.js - VERSÃO MÍNIMA
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de saúde (obrigatória para o Render)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Rota principal
app.get('/', (req, res) => {
    res.json({ 
        mensagem: '🚀 API Meu Pedido funcionando!',
        versao: '1.0.0-minima',
        status: 'online'
    });
});

// Rota de teste
app.get('/api/teste', (req, res) => {
    res.json({ 
        mensagem: '✅ API funcionando!',
        timestamp: new Date().toISOString()
    });
});

// Rota de produtos simulada
app.get('/api/produtos', (req, res) => {
    res.json([
        { id: 1, nome: 'Produto Teste 1', preco: 10.00 },
        { id: 2, nome: 'Produto Teste 2', preco: 20.00 }
    ]);
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});