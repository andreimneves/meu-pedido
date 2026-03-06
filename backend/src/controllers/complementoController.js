const pool = require('../config/database');

let dbInitPromise = null;

function garantirTabelasComplementos() {
    if (!dbInitPromise) {
        dbInitPromise = (async () => {
            // Tabelas baseadas na estrutura real do banco de dados
            try {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS grupo_itens (
                        grupo_id INTEGER,
                        item_id INTEGER
                    );
                `);
            } catch(e) { console.log("Erro ao garantir grupo_itens:", e.message); }
            
            // Outras tabelas necessárias (produtos, grupos_complementos, complementos, vinculo_produto_grupo)
            // ... (restante das queries de criação omitido para brevidade, mas mantendo a lógica de item_id)
        })();
    }
    return dbInitPromise;
}

const complementoController = {
    // Listagem de Grupos
    async listarGrupos(req, res) {
        try {
            await garantirTabelasComplementos();
            const result = await pool.query('SELECT * FROM grupos_complementos ORDER BY ordem, id');
            res.json(result.rows);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    // Exclusão de Item (Usa a coluna correta item_id)
    async excluirItem(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            
            const vinculos = await pool.query('SELECT * FROM grupo_itens WHERE item_id = $1', [id]);
            if (vinculos.rows.length > 0) {
                return res.status(400).json({ erro: 'Esta opção está sendo usada em um grupo. Remova-a do grupo primeiro.' });
            }
            
            const result = await pool.query('DELETE FROM complementos WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Item não encontrado' });
            res.json({ mensagem: 'Item excluído' });
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    // Listagem de Itens do Grupo (Usa item_id no INNER JOIN)
    async listarItensDoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            
            const result = await pool.query(
                `SELECT c.* FROM complementos c 
                 INNER JOIN grupo_itens v ON c.id = v.item_id 
                 WHERE v.grupo_id = $1 ORDER BY c.nome`,
                [id]
            );
            res.json(result.rows);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    // Vínculo (Usa item_id no INSERT)
    async vincularItemAoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { grupoId, itemId } = req.params;
            
            const check = await pool.query('SELECT * FROM grupo_itens WHERE grupo_id = $1 AND item_id = $2', [grupoId, itemId]);
            
            if (check.rows.length === 0) {
                await pool.query(
                    `INSERT INTO grupo_itens (grupo_id, item_id) VALUES ($1, $2)`,
                    [grupoId, itemId]
                );
                res.json({ mensagem: 'Opção vinculada com sucesso!' });
            } else {
                return res.status(400).json({ erro: 'Esta opção já faz parte do grupo!' });
            }
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    // Remoção (Usa item_id no DELETE)
    async removerItemDoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { grupoId, itemId } = req.params;
            await pool.query('DELETE FROM grupo_itens WHERE grupo_id=$1 AND item_id=$2', [grupoId, itemId]);
            res.json({ mensagem: 'Opção removida do grupo' });
        } catch (error) { res.status(500).json({ erro: error.message }); }
    }
    
    // ... (restante das funções de Produto/Grupo)
};

module.exports = complementoController;