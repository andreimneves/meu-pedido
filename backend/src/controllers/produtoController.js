// backend/src/controllers/produtoController.js
const pool = require('../config/database');

const produtoController = {
    // ===== LISTAR TODOS OS PRODUTOS =====
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

    // ===== LISTAR PRODUTOS POR CATEGORIA =====
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

    // ===== BUSCAR PRODUTO POR ID =====
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
            console.error('Erro ao buscar produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== CRIAR PRODUTO =====
    async criar(req, res) {
        try {
            const { tenant_id, categoria_id, nome, descricao, preco, destaque, disponivel } = req.body;
            
            // Validações básicas
            if (!nome || !preco) {
                return res.status(400).json({ erro: 'Nome e preço são obrigatórios' });
            }
            
            const result = await pool.query(
                `INSERT INTO produtos (tenant_id, categoria_id, nome, descricao, preco, destaque, disponivel)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [tenant_id || 1, categoria_id, nome, descricao || '', preco, destaque || false, disponivel !== false]
            );
            
            console.log(`✅ Produto criado: ${nome}`);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao criar produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== ATUALIZAR PRODUTO =====
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { categoria_id, nome, descricao, preco, destaque, disponivel } = req.body;
            
            // Validações básicas
            if (!nome || !preco) {
                return res.status(400).json({ erro: 'Nome e preço são obrigatórios' });
            }
            
            const result = await pool.query(
                `UPDATE produtos 
                 SET categoria_id = $1, nome = $2, descricao = $3, preco = $4, 
                     destaque = $5, disponivel = $6, updated_at = NOW()
                 WHERE id = $7
                 RETURNING *`,
                [categoria_id, nome, descricao, preco, destaque, disponivel, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Produto não encontrado' });
            }
            
            console.log(`✅ Produto #${id} atualizado: ${nome}`);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== EXCLUIR PRODUTO =====
    async excluir(req, res) {
        try {
            const { id } = req.params;
            
            // Verificar se o produto existe em itens_pedido antes de excluir
            const itensVinculados = await pool.query(
                'SELECT COUNT(*) FROM itens_pedido WHERE produto_id = $1',
                [id]
            );
            
            if (parseInt(itensVinculados.rows[0].count) > 0) {
                return res.status(400).json({ 
                    erro: 'Não é possível excluir este produto pois existem pedidos vinculados a ele'
                });
            }
            
            const result = await pool.query('DELETE FROM produtos WHERE id = $1 RETURNING id', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Produto não encontrado' });
            }
            
            console.log(`✅ Produto #${id} excluído`);
            res.json({ mensagem: 'Produto excluído com sucesso' });
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== CARDÁPIO PÚBLICO =====
    async cardapio(req, res) {
        try {
            const { subdominio } = req.params;
            
            // Buscar tenant pelo subdomínio
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Buscar produtos disponíveis com JOIN para pegar o nome da categoria
            const produtos = await pool.query(
                `SELECT p.*, c.nome as categoria_nome, c.ordem as categoria_ordem
                 FROM produtos p 
                 LEFT JOIN categorias c ON p.categoria_id = c.id 
                 WHERE p.tenant_id = $1 AND p.disponivel = true
                 ORDER BY c.ordem, p.nome`,
                [tenantId]
            );
            
            res.json(produtos.rows);
            
        } catch (error) {
            console.error('Erro ao buscar cardápio:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== ALTERNAR DISPONIBILIDADE =====
    async alternarDisponibilidade(req, res) {
        try {
            const { id } = req.params;
            const { disponivel } = req.body;
            
            const result = await pool.query(
                `UPDATE produtos 
                 SET disponivel = $1, updated_at = NOW()
                 WHERE id = $2
                 RETURNING *`,
                [disponivel, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Produto não encontrado' });
            }
            
            console.log(`🔄 Produto #${id} disponibilidade: ${disponivel ? 'ativo' : 'inativo'}`);
            res.json(result.rows[0]);
            
        } catch (error) {
            console.error('Erro ao alternar disponibilidade:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== BUSCAR PRODUTOS EM DESTAQUE =====
    async listarDestaques(req, res) {
        try {
            const { tenantId } = req.params;
            
            const result = await pool.query(
                `SELECT p.*, c.nome as categoria_nome
                 FROM produtos p
                 LEFT JOIN categorias c ON p.categoria_id = c.id
                 WHERE p.tenant_id = $1 AND p.destaque = true AND p.disponivel = true
                 ORDER BY p.nome`,
                [tenantId || 1]
            );
            
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar produtos em destaque:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== ESTATÍSTICAS DE PRODUTOS =====
    async estatisticas(req, res) {
        try {
            const { tenantId } = req.params;
            
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
                [tenantId || 1]
            );
            
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
    }
};

module.exports = produtoController;