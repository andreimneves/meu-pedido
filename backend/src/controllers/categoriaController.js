// backend/src/controllers/categoriaController.js
const pool = require('../config/database');

const categoriaController = {
    // Listar todas as categorias
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

    // Buscar categoria por ID
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

    // Criar categoria
    async criar(req, res) {
        try {
            const { tenant_id, nome, descricao, ordem } = req.body;
            
            const result = await pool.query(
                `INSERT INTO categorias (tenant_id, nome, descricao, ordem)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [tenant_id || 1, nome, descricao || '', ordem || 0]
            );
            
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao criar categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Atualizar categoria
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { nome, descricao, ordem } = req.body;
            
            const result = await pool.query(
                `UPDATE categorias 
                 SET nome = $1, descricao = $2, ordem = $3, data_atualizacao = NOW()
                 WHERE id = $4
                 RETURNING *`,
                [nome, descricao, ordem, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Categoria não encontrada' });
            }
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao atualizar categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Excluir categoria
    async excluir(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM categorias WHERE id = $1 RETURNING id', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Categoria não encontrada' });
            }
            
            res.json({ mensagem: 'Categoria excluída com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = categoriaController;