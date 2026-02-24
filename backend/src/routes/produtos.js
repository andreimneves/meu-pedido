// backend/src/routes/produtos.js
const express = require('express');
const produtoController = require('../controllers/produtoController');
const router = express.Router();

// ===== ROTAS DE PRODUTOS =====

// GET /api/produtos - Listar todos os produtos
router.get('/produtos', produtoController.listarTodos);

// GET /api/produtos/categoria/:categoriaId - Listar produtos por categoria
router.get('/produtos/categoria/:categoriaId', produtoController.listarPorCategoria);

// GET /api/produtos/:id - Buscar produto por ID
router.get('/produtos/:id', produtoController.buscarPorId);

// POST /api/produtos - Criar novo produto
router.post('/produtos', produtoController.criar);

// PUT /api/produtos/:id - Atualizar produto
router.put('/produtos/:id', produtoController.atualizar);

// DELETE /api/produtos/:id - Excluir produto
router.delete('/produtos/:id', produtoController.excluir);

// GET /api/cardapio/:subdominio - Cardápio público (apenas disponíveis)
router.get('/cardapio/:subdominio', async (req, res) => {
    try {
        const { subdominio } = req.params;
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        // Buscar tenant pelo subdomínio
        const tenantQuery = await pool.query(
            'SELECT id FROM tenants WHERE subdominio = $1',
            [subdominio]
        );
        
        if (tenantQuery.rows.length === 0) {
            return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
        }
        
        const tenantId = tenantQuery.rows[0].id;
        
        // Buscar produtos disponíveis
        const produtos = await pool.query(
            `SELECT p.*, c.nome as categoria_nome 
             FROM produtos p 
             LEFT JOIN categorias c ON p.categoria_id = c.id 
             WHERE p.tenant_id = $1 AND p.disponivel = true
             ORDER BY c.ordem, p.nome`,
            [tenantId]
        );
        
        res.json(produtos.rows);
        await pool.end();
        
    } catch (error) {
        console.error('Erro ao buscar cardápio:', error);
        res.status(500).json({ erro: error.message });
    }
});

module.exports = router;