// backend/server.js
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas
app.use('/api', require('./src/routes/produtos'));
app.use('/api', require('./src/routes/categorias'));
app.use('/api', require('./src/routes/config'));

app.get('/', (req, res) => {
    res.json({ mensagem: '🚀 API funcionando!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});