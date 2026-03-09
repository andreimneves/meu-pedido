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
            console.error('❌ Erro ao listar produtos:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Buscar produto por ID
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query(
                `SELECT p.*, c.nome as categoria_nome 
                 FROM produtos p 
                 LEFT JOIN categorias c ON p.categoria_id = c.id 
                 WHERE p.id = $1`,
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Produto não encontrado' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao buscar produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Criar produto
    async criar(req, res) {
        try {
            const { tenant_id, categoria_id, nome, descricao, preco, destaque, disponivel, imagem_url } = req.body;
            
            if (!nome || !preco) {
                return res.status(400).json({ erro: 'Nome e preço são obrigatórios' });
            }
            
            const result = await pool.query(
                `INSERT INTO produtos (tenant_id, categoria_id, nome, descricao, preco, destaque, disponivel, imagem_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [tenant_id || 1, categoria_id, nome, descricao || '', preco, destaque || false, disponivel !== false, imagem_url || null]
            );
            
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao criar produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Atualizar produto
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { categoria_id, nome, descricao, preco, destaque, disponivel, imagem_url } = req.body;
            
            const result = await pool.query(
                `UPDATE produtos 
                 SET categoria_id = $1, nome = $2, descricao = $3, preco = $4, 
                     destaque = $5, disponivel = $6, imagem_url = $7
                 WHERE id = $8
                 RETURNING *`,
                [categoria_id, nome, descricao, preco, destaque, disponivel, imagem_url, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Produto não encontrado' });
            }
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao atualizar produto:', error);
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
            console.error('❌ Erro ao excluir produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Cardápio público
    async cardapio(req, res) {
        try {
            const { subdominio } = req.params;
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            const produtos = await pool.query(
                `SELECT p.*, c.nome as categoria_nome 
                 FROM produtos p 
                 LEFT JOIN categorias c ON p.categoria_id = c.id 
                 WHERE p.tenant_id = $1 AND p.disponivel = true
                 ORDER BY c.ordem, p.nome`,
                [tenantId]
            );
            
            res.json(produtos.rows);
        } catch (error) {
            console.error('❌ Erro ao buscar cardápio:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = produtoController;