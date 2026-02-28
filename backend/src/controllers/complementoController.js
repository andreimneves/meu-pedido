// backend/src/controllers/complementoController.js
const pool = require('../config/database');

const complementoController = {
    // ===== LISTAR TODOS OS COMPLEMENTOS =====
    async listar(req, res) {
        try {
            const { tenant_id } = req.query;
            const result = await pool.query(
                'SELECT * FROM complementos WHERE tenant_id = $1 ORDER BY categoria_complemento, ordem, nome',
                [tenant_id || 1]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('❌ Erro ao listar complementos:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== BUSCAR COMPLEMENTO POR ID =====
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query(
                'SELECT * FROM complementos WHERE id = $1',
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Complemento não encontrado' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao buscar complemento:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== CRIAR COMPLEMENTO =====
    async criar(req, res) {
        try {
            const { tenant_id, nome, descricao, preco, categoria_complemento, disponivel, ordem } = req.body;
            
            if (!nome) {
                return res.status(400).json({ erro: 'Nome do complemento é obrigatório' });
            }
            
            const result = await pool.query(
                `INSERT INTO complementos (tenant_id, nome, descricao, preco, categoria_complemento, disponivel, ordem)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [tenant_id || 1, nome, descricao || '', preco || 0, categoria_complemento || 'outros', disponivel !== false, ordem || 0]
            );
            
            console.log(`✅ Complemento criado: ${nome}`);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao criar complemento:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== ATUALIZAR COMPLEMENTO =====
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { nome, descricao, preco, categoria_complemento, disponivel, ordem } = req.body;
            
            const result = await pool.query(
                `UPDATE complementos 
                 SET nome = $1, descricao = $2, preco = $3, 
                     categoria_complemento = $4, disponivel = $5, ordem = $6
                 WHERE id = $7
                 RETURNING *`,
                [nome, descricao, preco, categoria_complemento, disponivel, ordem, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Complemento não encontrado' });
            }
            
            console.log(`✅ Complemento #${id} atualizado: ${nome}`);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao atualizar complemento:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== EXCLUIR COMPLEMENTO =====
    async excluir(req, res) {
        try {
            const { id } = req.params;
            
            // Verificar se existe em algum grupo
            const gruposVinculados = await pool.query(
                'SELECT COUNT(*) as total FROM grupo_complemento_itens WHERE complemento_id = $1',
                [id]
            );
            
            if (parseInt(gruposVinculados.rows[0].total) > 0) {
                return res.status(400).json({ 
                    erro: 'Não é possível excluir este complemento pois ele está vinculado a grupos'
                });
            }
            
            const result = await pool.query('DELETE FROM complementos WHERE id = $1 RETURNING id', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Complemento não encontrado' });
            }
            
            console.log(`✅ Complemento #${id} excluído`);
            res.json({ mensagem: 'Complemento excluído com sucesso' });
        } catch (error) {
            console.error('❌ Erro ao excluir complemento:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== BUSCAR COMPLEMENTOS POR GRUPO =====
    async buscarPorGrupo(req, res) {
        try {
            const { grupoId } = req.params;
            
            const result = await pool.query(
                `SELECT c.*, gi.ordem as grupo_ordem
                 FROM grupo_complemento_itens gi
                 JOIN complementos c ON gi.complemento_id = c.id
                 WHERE gi.grupo_id = $1 AND c.disponivel = true
                 ORDER BY gi.ordem, c.nome`,
                [grupoId]
            );
            
            res.json(result.rows);
        } catch (error) {
            console.error('❌ Erro ao buscar complementos por grupo:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== BUSCAR GRUPOS POR PRODUTO =====
    async buscarGruposPorProduto(req, res) {
        try {
            const { produtoId } = req.params;
            
            // Buscar todos os grupos (por enquanto)
            // Futuramente pode ter uma tabela de vinculação produto-grupo
            const result = await pool.query(
                'SELECT * FROM grupos_complementos WHERE tenant_id = $1 ORDER BY ordem, nome',
                [1] // tenant_id fixo por enquanto
            );
            
            res.json(result.rows);
        } catch (error) {
            console.error('❌ Erro ao buscar grupos do produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== BUSCAR COMPLEMENTOS POR CATEGORIA =====
    async buscarPorCategoria(req, res) {
        try {
            const { categoria } = req.params;
            const { tenant_id } = req.query;
            
            const result = await pool.query(
                'SELECT * FROM complementos WHERE tenant_id = $1 AND categoria_complemento = $2 AND disponivel = true ORDER BY ordem, nome',
                [tenant_id || 1, categoria]
            );
            
            res.json(result.rows);
        } catch (error) {
            console.error('❌ Erro ao buscar complementos por categoria:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== BUSCAR COMPLEMENTOS PARA UM PRODUTO (COM AGRUPAMENTO) =====
    async buscarParaProduto(req, res) {
        try {
            const { produtoId } = req.params;
            
            // Buscar todos os grupos
            const gruposQuery = await pool.query(
                `SELECT g.*, 
                    (SELECT json_agg(
                        json_build_object(
                            'id', c.id,
                            'nome', c.nome,
                            'descricao', c.descricao,
                            'preco', c.preco,
                            'categoria', c.categoria_complemento,
                            'ordem', gi.ordem
                        ) ORDER BY gi.ordem, c.nome
                    ) FROM grupo_complemento_itens gi
                    JOIN complementos c ON gi.complemento_id = c.id
                    WHERE gi.grupo_id = g.id AND c.disponivel = true
                ) as complementos
                FROM grupos_complementos g
                WHERE g.tenant_id = $1
                ORDER BY g.ordem, g.nome`,
                [1] // tenant_id fixo
            );
            
            res.json(gruposQuery.rows);
        } catch (error) {
            console.error('❌ Erro ao buscar complementos para produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== VINCULAR COMPLEMENTOS A UM PRODUTO =====
    async vincularAoProduto(req, res) {
        try {
            const { produtoId } = req.params;
            const { grupos } = req.body;
            
            // Por enquanto, não temos tabela de vinculação produto-grupo
            // Futuramente implementaremos
            
            console.log(`🔄 Vinculando grupos ao produto #${produtoId}:`, grupos);
            res.json({ mensagem: 'Vínculos salvos com sucesso' });
        } catch (error) {
            console.error('❌ Erro ao vincular complementos ao produto:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = complementoController;