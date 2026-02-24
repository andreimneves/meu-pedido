// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Função auxiliar para importar com caminho absoluto
function importar(relativePath) {
    return require(path.join(__dirname, relativePath));
}

// Importar rotas com caminhos absolutos
const produtoRoutes = importar('./src/routes/produtos');
const categoriaRoutes = importar('./src/routes/categorias');
const configRoutes = importar('./src/routes/config');

// Usar rotas
app.use('/api', produtoRoutes);
app.use('/api', categoriaRoutes);
app.use('/api', configRoutes);

app.get('/', (req, res) => {
    res.json({ mensagem: '🚀 API funcionando!' });
});

app.get('/api/teste', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`📂 Diretório atual: ${__dirname}`);
});