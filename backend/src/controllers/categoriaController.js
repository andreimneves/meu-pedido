// backend/src/controllers/categoriaController.js
const pool = require('../config/database');

const categoriaController = {
    // ===== LISTAR TODAS AS CATEGORIAS =====
    async listar(req, res) {
        try {
            const result = await pool.query(
                'SELECT * FROM categorias ORDER BY ordem, nome'
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar categorias:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== BUSCAR CATEGORIA POR ID =====
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query(
                'SELECT * FROM categorias WHERE id = $1',
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Categoria não encontrada' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao buscar categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== CRIAR CATEGORIA =====
    async criar(req, res) {
        try {
            const { tenant_id, nome, descricao, ordem } = req.body;
            
            if (!nome) {
                return res.status(400).json({ erro: 'Nome da categoria é obrigatório' });
            }
            
            const result = await pool.query(
                `INSERT INTO categorias (tenant_id, nome, descricao, ordem)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [tenant_id || 1, nome, descricao || '', ordem || 0]
            );
            
            console.log(`✅ Categoria criada: ${nome}`);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao criar categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== ATUALIZAR CATEGORIA =====
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { nome, descricao, ordem } = req.body;
            
            if (!nome) {
                return res.status(400).json({ erro: 'Nome da categoria é obrigatório' });
            }
            
            // Verificar se a categoria existe
            const existe = await pool.query(
                'SELECT id FROM categorias WHERE id = $1',
                [id]
            );
            
            if (existe.rows.length === 0) {
                return res.status(404).json({ erro: 'Categoria não encontrada' });
            }
            
            // Atualizar a categoria - SEM updated_at se a coluna não existir
            const result = await pool.query(
                `UPDATE categorias 
                 SET nome = $1, descricao = $2, ordem = $3
                 WHERE id = $4
                 RETURNING *`,
                [nome, descricao, ordem, id]
            );
            
            console.log(`✅ Categoria #${id} atualizada para: ${nome}`);
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao atualizar categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== EXCLUIR CATEGORIA =====
    async excluir(req, res) {
        try {
            const { id } = req.params;
            
            // Verificar se existem produtos usando esta categoria
            const produtosVinculados = await pool.query(
                'SELECT COUNT(*) FROM produtos WHERE categoria_id = $1',
                [id]
            );
            
            if (parseInt(produtosVinculados.rows[0].count) > 0) {
                return res.status(400).json({ 
                    erro: 'Não é possível excluir esta categoria pois existem produtos vinculados a ela',
                    total_produtos: produtosVinculados.rows[0].count
                });
            }
            
            const result = await pool.query('DELETE FROM categorias WHERE id = $1 RETURNING id', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Categoria não encontrada' });
            }
            
            console.log(`✅ Categoria #${id} excluída`);
            res.json({ mensagem: 'Categoria excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== LISTAR CATEGORIAS COM TOTAL DE PRODUTOS =====
    async listarComTotais(req, res) {
        try {
            const result = await pool.query(
                `SELECT c.*, COUNT(p.id) as total_produtos
                 FROM categorias c
                 LEFT JOIN produtos p ON c.id = p.categoria_id
                 GROUP BY c.id
                 ORDER BY c.ordem, c.nome`
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar categorias com totais:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = categoriaController;