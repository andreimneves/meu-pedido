// backend/src/controllers/produtoController.js
const pool = require('../config/database');

const produtoController = {
    // Listar todos os produtos
    async listarTodos(req, res) {
        try {
            const result = await pool.query(
                `SELECT p.*, c.nome as categoria_nome 
                 FROM produtos p 
                 LEFT JOIN categorias c ON p.categoria_id = c.id 
                 ORDER BY p.nome`
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar produtos:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Buscar produtos por categoria
    async listarPorCategoria(req, res) {
        try {
            const { categoriaId } = req.params;
            const result = await pool.query(
                `SELECT p.*, c.nome as categoria_nome 
                 FROM produtos p 
                 LEFT JOIN categorias c ON p.categoria_id = c.id 
                 WHERE p.categoria_id = $1 
                 ORDER BY p.nome`,
                [categoriaId]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar produtos por categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Buscar produto por ID
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query(
                'SELECT * FROM produtos WHERE id = $1',
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Produto não encontrado' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Criar produto
    async criar(req, res) {
        try {
            const { tenant_id, categoria_id, nome, descricao, preco, destaque, disponivel } = req.body;
            
            const result = await pool.query(
                `INSERT INTO produtos (tenant_id, categoria_id, nome, descricao, preco, destaque, disponivel)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [tenant_id || 1, categoria_id, nome, descricao || '', preco, destaque || false, disponivel !== false]
            );
            
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao criar produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Atualizar produto
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { categoria_id, nome, descricao, preco, destaque, disponivel } = req.body;
            
            const result = await pool.query(
                `UPDATE produtos 
                 SET categoria_id = $1, nome = $2, descricao = $3, preco = $4, 
                     destaque = $5, disponivel = $6, data_atualizacao = NOW()
                 WHERE id = $7
                 RETURNING *`,
                [categoria_id, nome, descricao, preco, destaque, disponivel, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Produto não encontrado' });
            }
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Excluir produto
    async excluir(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM produtos WHERE id = $1 RETURNING id', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Produto não encontrado' });
            }
            
            res.json({ mensagem: 'Produto excluído com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = produtoController;