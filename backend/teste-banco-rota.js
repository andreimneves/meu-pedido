// backend/teste-banco-rota.js
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = 3001; // Porta diferente para não conflitar

app.get('/teste-banco', async (req, res) => {
    try {
        console.log('🔍 Testando conexão...');
        
        const pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'meu_pedido_db',
            password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : 'postgres',
            port: process.env.DB_PORT || 5432,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        const result = await pool.query('SELECT NOW() as hora');
        await pool.end();
        
        res.json({ 
            sucesso: true, 
            mensagem: 'Conectado!',
            hora: result.rows[0].hora
        });
        
    } catch (error) {
        res.json({ 
            sucesso: false, 
            erro: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor de teste rodando em http://localhost:${PORT}`);
    console.log(`👉 Teste: http://localhost:${PORT}/teste-banco`);
});