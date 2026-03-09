const pool = require('../config/database');

const complementoController = {
    // ==========================================
    // GRUPOS
    // ==========================================
    listarGrupos: async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM grupos_complementos ORDER BY ordem, nome'
            );
            res.json(result.rows);
        } catch (error) {
            console.error('❌ Erro ao listar grupos:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    criarGrupo: async (req, res) => {
        try {
            const { nome, obrigatorio, limite_selecao } = req.body;
            const result = await pool.query(
                `INSERT INTO grupos_complementos (nome, obrigatorio, limite_selecao)
                 VALUES ($1, $2, $3) RETURNING *`,
                [nome, obrigatorio, limite_selecao]
            );
            res.json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao criar grupo:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    atualizarGrupo: async (req, res) => {
        try {
            const { id } = req.params;
            const { nome, obrigatorio, limite_selecao } = req.body;
            const result = await pool.query(
                `UPDATE grupos_complementos SET nome=$1, obrigatorio=$2, limite_selecao=$3 WHERE id=$4 RETURNING *`,
                [nome, obrigatorio, limite_selecao, id]
            );
            res.json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao atualizar grupo:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    excluirGrupo: async (req, res) => {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM grupos_complementos WHERE id = $1', [id]);
            res.json({ sucesso: true });
        } catch (error) {
            console.error('❌ Erro ao excluir grupo:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // ITENS
    // ==========================================
    listarItens: async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM complementos ORDER BY nome'
            );
            res.json(result.rows);
        } catch (error) {
            console.error('❌ Erro ao listar itens:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    criarItem: async (req, res) => {
        try {
            const { nome, preco, disponivel } = req.body;
            const result = await pool.query(
                `INSERT INTO complementos (nome, preco, disponivel)
                 VALUES ($1, $2, $3) RETURNING *`,
                [nome, preco, disponivel]
            );
            res.json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao criar item:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    atualizarItem: async (req, res) => {
        try {
            const { id } = req.params;
            const { nome, preco, disponivel } = req.body;
            const result = await pool.query(
                `UPDATE complementos SET nome=$1, preco=$2, disponivel=$3 WHERE id=$4 RETURNING *`,
                [nome, preco, disponivel, id]
            );
            res.json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao atualizar item:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    excluirItem: async (req, res) => {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM complementos WHERE id = $1', [id]);
            res.json({ sucesso: true });
        } catch (error) {
            console.error('❌ Erro ao excluir item:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // ITENS DO GRUPO
    // ==========================================
    listarItensDoGrupo: async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query(
                `SELECT c.* FROM complementos c
                 INNER JOIN grupo_itens gi ON gi.complemento_id = c.id
                 WHERE gi.grupo_id = $1`,
                [id]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('❌ Erro ao listar itens do grupo:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    vincularItemAoGrupo: async (req, res) => {
        try {
            const { grupoId, itemId } = req.params;
            await pool.query(
                `INSERT INTO grupo_itens (grupo_id, complemento_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [grupoId, itemId]
            );
            res.json({ sucesso: true });
        } catch (error) {
            console.error('❌ Erro ao vincular item:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    removerItemDoGrupo: async (req, res) => {
        try {
            const { grupoId, itemId } = req.params;
            await pool.query(
                `DELETE FROM grupo_itens WHERE grupo_id=$1 AND complemento_id=$2`,
                [grupoId, itemId]
            );
            res.json({ sucesso: true });
        } catch (error) {
            console.error('❌ Erro ao remover item:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // GRUPOS DO PRODUTO
    // ==========================================
    listarGruposDoProduto: async (req, res) => {
        try {
            const { produtoId } = req.params;
            const result = await pool.query(
                `SELECT g.* FROM grupos_complementos g
                 INNER JOIN produto_grupos pg ON pg.grupo_id = g.id
                 WHERE pg.produto_id = $1`,
                [produtoId]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('❌ Erro ao listar grupos do produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    vincularGruposProduto: async (req, res) => {
        try {
            const { produtoId } = req.params;
            const { grupos } = req.body;

            await pool.query('DELETE FROM produto_grupos WHERE produto_id = $1', [produtoId]);

            if (Array.isArray(grupos)) {
                for (let g of grupos) {
                    await pool.query(
                        `INSERT INTO produto_grupos (produto_id, grupo_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [produtoId, g]
                    );
                }
            }
            res.json({ sucesso: true });
        } catch (error) {
            console.error('❌ Erro ao vincular grupos ao produto:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = complementoController;