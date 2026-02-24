// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());

// ===== ROTAS DE TESTE E DEBUG (PRIMEIRAS) =====
app.get('/ping', (req, res) => {
    res.send('pong');
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/', (req, res) => {
    res.json({ 
        mensagem: '🚀 API Meu Pedido funcionando!',
        timestamp: new Date().toISOString()
    });
});

// ===== ROTA DE TESTE DO BANCO (COPIADA DO SEU TESTE) =====
app.get('/api/teste-banco', async (req, res) => {
    try {
        const { Pool } = require('pg');
        
        console.log('🔍 Testando conexão com o banco...');
        
        const pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'meu_pedido_db',
            password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '',
            port: process.env.DB_PORT || 5432,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        const result = await pool.query('SELECT NOW() as hora');
        await pool.end();
        
        res.json({ 
            sucesso: true, 
            mensagem: 'Conectado ao banco!',
            hora: result.rows[0].hora,
            ambiente: process.env.NODE_ENV
        });
        
    } catch (error) {
        console.error('❌ Erro no banco:', error);
        res.json({ 
            sucesso: false, 
            erro: error.message 
        });
    }
});

// ===== ROTAS DOS MÓDULOS (DEPOIS DAS ROTAS DE TESTE) =====
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

// ===== INICIAR SERVIDOR =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📌 Rotas disponíveis:`);
    console.log(`   - GET /ping`);
    console.log(`   - GET /health`);
    console.log(`   - GET /`);
    console.log(`   - GET /api/teste-banco`);
    console.log(`   - GET /api/produtos`);
    console.log(`   - GET /api/categorias`);
    console.log(`   - GET /api/config/:subdominio`);
});