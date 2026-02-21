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
app.use(cors());
app.use(express.json());

// Rotas - IMPORTANTE: usar caminhos relativos corretos
const produtoRoutes = require('./src/routes/produtos');
const categoriaRoutes = require('./src/routes/categorias');
const configRoutes = require('./src/routes/config');

app.use('/api', produtoRoutes);
app.use('/api', categoriaRoutes);
app.use('/api', configRoutes);

// Rota de teste
app.get('/', (req, res) => {
    res.json({ 
        mensagem: '🚀 Sistema Meu Pedido funcionando!',
        versao: '1.0.0',
        status: 'online'
    });
});

// Adicione com as outras rotas
const horarioRoutes = require('./src/routes/horarios');
app.use('/api', horarioRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
});