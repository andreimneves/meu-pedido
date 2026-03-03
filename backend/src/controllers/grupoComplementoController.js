// backend/src/controllers/grupoComplementoController.js
const pool = require('../config/database');

const grupoComplementoController = {
    // ===== LISTAR TODOS OS GRUPOS =====
    async listar(req, res) {
        try {
            const { tenant_id } = req.query;
            const result = await pool.query(
                'SELECT * FROM grupos_complementos WHERE tenant_id = $1 ORDER BY ordem, nome',
                [tenant_id || 1]
            );
            res.json(result.rows);
        } catch (error) {
            console.error('❌ Erro ao listar grupos:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== BUSCAR GRUPO POR ID =====
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query(
                'SELECT * FROM grupos_complementos WHERE id = $1',
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Grupo não encontrado' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao buscar grupo:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== CRIAR GRUPO =====
    async criar(req, res) {
        try {
            const { tenant_id, nome, descricao, limite_selecao, obrigatorio, ordem } = req.body;
            
            if (!nome) {
                return res.status(400).json({ erro: 'Nome do grupo é obrigatório' });
            }
            
            const result = await pool.query(
                `INSERT INTO grupos_complementos (tenant_id, nome, descricao, limite_selecao, obrigatorio, ordem)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [tenant_id || 1, nome, descricao || '', limite_selecao || 1, obrigatorio || false, ordem || 0]
            );
            
            console.log(`✅ Grupo criado: ${nome}`);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao criar grupo:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== ATUALIZAR GRUPO =====
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { nome, descricao, limite_selecao, obrigatorio, ordem } = req.body;
            
            const result = await pool.query(
                `UPDATE grupos_complementos 
                 SET nome = $1, descricao = $2, limite_selecao = $3, obrigatorio = $4, ordem = $5
                 WHERE id = $6
                 RETURNING *`,
                [nome, descricao, limite_selecao, obrigatorio, ordem, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Grupo não encontrado' });
            }
            
            console.log(`✅ Grupo #${id} atualizado: ${nome}`);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao atualizar grupo:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== EXCLUIR GRUPO =====
    async excluir(req, res) {
        try {
            const { id } = req.params;
            
            // Verificar se existem itens vinculados
            const itensVinculados = await pool.query(
                'SELECT COUNT(*) as total FROM grupo_complemento_itens WHERE grupo_id = $1',
                [id]
            );
            
            if (parseInt(itensVinculados.rows[0].total) > 0) {
                return res.status(400).json({ 
                    erro: 'Não é possível excluir este grupo pois existem itens vinculados a ele'
                });
            }
            
            const result = await pool.query('DELETE FROM grupos_complementos WHERE id = $1 RETURNING id', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Grupo não encontrado' });
            }
            
            console.log(`✅ Grupo #${id} excluído`);
            res.json({ mensagem: 'Grupo excluído com sucesso' });
        } catch (error) {
            console.error('❌ Erro ao excluir grupo:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== LISTAR ITENS DO GRUPO =====
    async listarItens(req, res) {
        try {
            const { grupoId } = req.params;
            
            const result = await pool.query(
                `SELECT c.*, gi.ordem as grupo_ordem
                 FROM grupo_complemento_itens gi
                 JOIN complementos c ON gi.complemento_id = c.id
                 WHERE gi.grupo_id = $1
                 ORDER BY gi.ordem, c.nome`,
                [grupoId]
            );
            
            res.json(result.rows);
        } catch (error) {
            console.error('❌ Erro ao listar itens do grupo:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== ADICIONAR ITEM AO GRUPO =====
    async adicionarItem(req, res) {
        try {
            const { grupoId, complementoId } = req.params;
            const { ordem } = req.body;
            
            // Verificar se já existe
            const existe = await pool.query(
                'SELECT id FROM grupo_complemento_itens WHERE grupo_id = $1 AND complemento_id = $2',
                [grupoId, complementoId]
            );
            
            if (existe.rows.length > 0) {
                return res.status(400).json({ erro: 'Item já vinculado a este grupo' });
            }
            
            const result = await pool.query(
                `INSERT INTO grupo_complemento_itens (grupo_id, complemento_id, ordem)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
                [grupoId, complementoId, ordem || 0]
            );
            
            console.log(`✅ Item #${complementoId} adicionado ao grupo #${grupoId}`);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('❌ Erro ao adicionar item ao grupo:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== REMOVER ITEM DO GRUPO =====
    async removerItem(req, res) {
        try {
            const { grupoId, complementoId } = req.params;
            
            const result = await pool.query(
                'DELETE FROM grupo_complemento_itens WHERE grupo_id = $1 AND complemento_id = $2 RETURNING id',
                [grupoId, complementoId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Vínculo não encontrado' });
            }
            
            console.log(`✅ Item #${complementoId} removido do grupo #${grupoId}`);
            res.json({ mensagem: 'Item removido do grupo' });
        } catch (error) {
            console.error('❌ Erro ao remover item do grupo:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== ATUALIZAR ORDEM DOS ITENS NO GRUPO =====
    async atualizarOrdemItens(req, res) {
        try {
            const { grupoId } = req.params;
            const { itens } = req.body; // array de { id, ordem }
            
            const client = await pool.connect();
            
            try {
                await client.query('BEGIN');
                
                for (const item of itens) {
                    await client.query(
                        `UPDATE grupo_complemento_itens 
                         SET ordem = $1
                         WHERE grupo_id = $2 AND complemento_id = $3`,
                        [item.ordem, grupoId, item.id]
                    );
                }
                
                await client.query('COMMIT');
                console.log(`✅ Ordem dos itens atualizada no grupo #${grupoId}`);
                res.json({ mensagem: 'Ordem atualizada com sucesso' });
                
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
            
        } catch (error) {
            console.error('❌ Erro ao atualizar ordem dos itens:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = grupoComplementoController;