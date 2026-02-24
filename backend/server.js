// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares básicos (sempre no topo)
app.use(cors());
app.use(express.json());

// ===== ROTA DE TESTE DO BANCO (PRIMEIRA, ANTES DE QUALQUER OUTRA) =====
app.get('/api/teste-banco', async (req, res) => {
    try {
        const { Pool } = require('pg');
        
        console.log('🔍 Testando conexão com o banco...');
        console.log('   DB_USER:', process.env.DB_USER);
        console.log('   DB_HOST:', process.env.DB_HOST);
        console.log('   DB_NAME:', process.env.DB_NAME);
        
        const pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
            port: process.env.DB_PORT || 5432,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
        });
        
        const result = await pool.query('SELECT NOW() as hora_atual, current_database() as banco');
        await pool.end();
        
        res.json({ 
            sucesso: true, 
            mensagem: '✅ Conectado ao banco!',
            dados: result.rows[0],
            ambiente: process.env.NODE_ENV || 'development'
        });
        
    } catch (error) {
        console.error('❌ Erro no teste do banco:', error);
        res.json({ 
            sucesso: false, 
            mensagem: '❌ Falha na conexão',
            erro: error.message,
            ambiente: process.env.NODE_ENV || 'development'
        });
    }
});

// ===== ROTA PRINCIPAL =====
app.get('/', (req, res) => {
    res.json({ mensagem: '🚀 API Meu Pedido funcionando!' });
});

// ===== ROTA DE SAÚDE =====
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// ===== AGORA SIM, AS ROTAS DOS MÓDULOS =====
// Função auxiliar para importar
function importar(relativePath) {
    return require(path.join(__dirname, relativePath));
}

// Importar rotas
const produtoRoutes = importar('./src/routes/produtos');
const categoriaRoutes = importar('./src/routes/categorias');
const configRoutes = importar('./src/routes/config');

// Usar rotas
app.use('/api', produtoRoutes);
app.use('/api', categoriaRoutes);
app.use('/api', configRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});