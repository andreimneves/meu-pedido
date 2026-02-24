// backend/src/routes/produtos.js
const express = require('express');
const produtoController = require('../controllers/produtoController');
const router = express.Router();

// ===== ROTAS DE PRODUTOS =====

/**
 * @route   GET /api/produtos
 * @desc    Listar todos os produtos (admin)
 * @access  Privado (requer autenticação)
 */
router.get('/produtos', produtoController.listarTodos);

/**
 * @route   GET /api/produtos/categoria/:categoriaId
 * @desc    Listar produtos por categoria
 * @access  Privado
 */
router.get('/produtos/categoria/:categoriaId', produtoController.listarPorCategoria);

/**
 * @route   GET /api/produtos/:id
 * @desc    Buscar produto por ID
 * @access  Privado
 */
router.get('/produtos/:id', produtoController.buscarPorId);

/**
 * @route   POST /api/produtos
 * @desc    Criar novo produto
 * @access  Privado
 */
router.post('/produtos', produtoController.criar);

/**
 * @route   PUT /api/produtos/:id
 * @desc    Atualizar produto existente
 * @access  Privado
 */
router.put('/produtos/:id', produtoController.atualizar);

/**
 * @route   DELETE /api/produtos/:id
 * @desc    Excluir produto
 * @access  Privado
 */
router.delete('/produtos/:id', produtoController.excluir);

/**
 * @route   PATCH /api/produtos/:id/disponivel
 * @desc    Alternar disponibilidade do produto (ativar/desativar)
 * @access  Privado
 */
router.patch('/produtos/:id/disponivel', async (req, res) => {
    try {
        const { id } = req.params;
        const { disponivel } = req.body;
        
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        const result = await pool.query(
            'UPDATE produtos SET disponivel = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [disponivel, id]
        );
        
        await pool.end();
        
        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Produto não encontrado' });
        }
        
        res.json({ 
            mensagem: `Produto ${disponivel ? 'ativado' : 'desativado'} com sucesso`,
            produto: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao alterar disponibilidade:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * @route   POST /api/produtos/lote
 * @desc    Criar múltiplos produtos em lote
 * @access  Privado
 */
router.post('/produtos/lote', async (req, res) => {
    try {
        const { produtos } = req.body;
        
        if (!Array.isArray(produtos) || produtos.length === 0) {
            return res.status(400).json({ erro: 'Lista de produtos inválida' });
        }
        
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        const resultados = [];
        
        for (const p of produtos) {
            const result = await pool.query(
                `INSERT INTO produtos (tenant_id, categoria_id, nome, descricao, preco, destaque, disponivel)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [p.tenant_id || 1, p.categoria_id, p.nome, p.descricao || '', p.preco, p.destaque || false, p.disponivel !== false]
            );
            resultados.push(result.rows[0]);
        }
        
        await pool.end();
        
        res.status(201).json({ 
            mensagem: `${resultados.length} produtos criados com sucesso`,
            produtos: resultados
        });
    } catch (error) {
        console.error('Erro ao criar produtos em lote:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * @route   PUT /api/produtos/lote/preco
 * @desc    Atualizar preço em lote (percentual)
 * @access  Privado
 */
router.put('/produtos/lote/preco', async (req, res) => {
    try {
        const { categoria_id, percentual, tenant_id } = req.body;
        
        if (!percentual) {
            return res.status(400).json({ erro: 'Percentual é obrigatório' });
        }
        
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        let result;
        
        if (categoria_id) {
            // Atualizar apenas produtos de uma categoria
            result = await pool.query(
                `UPDATE produtos 
                 SET preco = preco * (1 + $1::decimal / 100), 
                     updated_at = NOW()
                 WHERE tenant_id = $2 AND categoria_id = $3
                 RETURNING id, nome, preco`,
                [percentual, tenant_id || 1, categoria_id]
            );
        } else {
            // Atualizar todos os produtos do tenant
            result = await pool.query(
                `UPDATE produtos 
                 SET preco = preco * (1 + $1::decimal / 100), 
                     updated_at = NOW()
                 WHERE tenant_id = $2
                 RETURNING id, nome, preco`,
                [percentual, tenant_id || 1]
            );
        }
        
        await pool.end();
        
        res.json({ 
            mensagem: `${result.rowCount} produtos atualizados`,
            produtos: result.rows
        });
    } catch (error) {
        console.error('Erro ao atualizar preços em lote:', error);
        res.status(500).json({ erro: error.message });
    }
});

/**
 * @route   GET /api/cardapio/:subdominio
 * @desc    Cardápio público (apenas produtos disponíveis)
 * @access  Público
 */
router.get('/cardapio/:subdominio', produtoController.cardapio);

/**
 * @route   GET /api/produtos/estatisticas/:subdominio
 * @desc    Estatísticas de produtos
 * @access  Privado
 */
router.get('/produtos/estatisticas/:subdominio', async (req, res) => {
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
        
        // Buscar tenant
        const tenantQuery = await pool.query(
            'SELECT id FROM tenants WHERE subdominio = $1',
            [subdominio]
        );
        
        if (tenantQuery.rows.length === 0) {
            await pool.end();
            return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
        }
        
        const tenantId = tenantQuery.rows[0].id;
        
        // Estatísticas
        const stats = await pool.query(
            `SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN disponivel THEN 1 END) as disponiveis,
                COUNT(CASE WHEN destaque THEN 1 END) as destaques,
                MIN(preco) as preco_min,
                MAX(preco) as preco_max,
                AVG(preco) as preco_medio,
                COUNT(DISTINCT categoria_id) as total_categorias
            FROM produtos
            WHERE tenant_id = $1`,
            [tenantId]
        );
        
        await pool.end();
        
        res.json({
            total: parseInt(stats.rows[0].total),
            disponiveis: parseInt(stats.rows[0].disponiveis),
            destaques: parseInt(stats.rows[0].destaques),
            preco_min: parseFloat(stats.rows[0].preco_min || 0),
            preco_max: parseFloat(stats.rows[0].preco_max || 0),
            preco_medio: parseFloat(stats.rows[0].preco_medio || 0),
            total_categorias: parseInt(stats.rows[0].total_categorias || 0)
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ erro: error.message });
    }
});

module.exports = router;