// backend/server.js - VERSÃO ULTRAMÍNIMA
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas diretas (sem importar arquivos)
app.get('/', (req, res) => {
    res.json({ mensagem: '🚀 API funcionando!' });
});

app.get('/api/teste', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/produtos', (req, res) => {
    res.json([{ id: 1, nome: 'Teste' }]);
});

app.get('/api/categorias', (req, res) => {
    res.json([{ id: 1, nome: 'Categoria Teste' }]);
});

app.get('/api/config/dlcrepes', (req, res) => {
    res.json({ nome_loja: 'DL Crepes' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});