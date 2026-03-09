const pool = require('../config/database');

const categoriaController = {
    // Listar todas as categorias
    listar: async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM categorias ORDER BY ordem, nome'
            );
            res.json(result.rows);
        } catch (error) {
            console.error('❌ Erro ao listar categorias:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Buscar categoria por ID
    buscarPorId: async (req, res) => {
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
            console.error('❌ Erro ao buscar categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Criar categoria
    criar: async (req, res) => {
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
            console.error('❌ Erro ao criar categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Atualizar categoria
    atualizar: async (req, res) => {
        try {
            const { id } = req.params;
            const { nome, descricao, ordem } = req.body;

            if (!nome) {
                return res.status(400).json({ erro: 'Nome da categoria é obrigatório' });
            }

            const existe = await pool.query(
                'SELECT id FROM categorias WHERE id = $1',
                [id]
            );

            if (existe.rows.length === 0) {
                return res.status(404).json({ erro: 'Categoria não encontrada' });
            }

            const result = await pool.query(
                `UPDATE categorias
                 SET nome = $1, descricao = $2, ordem = $3
                 WHERE id = $4
                 RETURNING *`,
                [nome, descricao || '', ordem || 0, id]
            );

            console.log(`✅ Categoria #${id} atualizada para: ${nome}`);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao atualizar categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Excluir categoria
    excluir: async (req, res) => {
        try {
            const { id } = req.params;

            const produtosVinculados = await pool.query(
                'SELECT COUNT(*) as total FROM produtos WHERE categoria_id = $1',
                [id]
            );

            const totalProdutos = parseInt(produtosVinculados.rows[0].total);

            if (totalProdutos > 0) {
                return res.status(400).json({
                    erro: 'Não é possível excluir esta categoria pois existem produtos vinculados a ela',
                    total_produtos: totalProdutos
                });
            }

            const result = await pool.query('DELETE FROM categorias WHERE id = $1 RETURNING id', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Categoria não encontrada' });
            }

            console.log(`✅ Categoria #${id} excluída`);
            res.json({ mensagem: 'Categoria excluída com sucesso' });
        } catch (error) {
            console.error('❌ Erro ao excluir categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = categoriaController;