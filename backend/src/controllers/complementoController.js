const pool = require('../config/database');

// A MÁGICA: CRIA AS TABELAS AUTOMATICAMENTE NO SEU NEON DB
async function garantirTabelasComplementos() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS grupos_complementos (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER DEFAULT 1,
            nome VARCHAR(255) NOT NULL,
            obrigatorio BOOLEAN DEFAULT false,
            limite_selecao INTEGER DEFAULT 1,
            ordem INTEGER DEFAULT 0
        );`,
        `CREATE TABLE IF NOT EXISTS complementos (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER DEFAULT 1,
            nome VARCHAR(255) NOT NULL,
            preco NUMERIC(10,2) DEFAULT 0,
            categoria_complemento VARCHAR(100) DEFAULT 'geral',
            disponivel BOOLEAN DEFAULT true,
            ordem INTEGER DEFAULT 0
        );`,
        `CREATE TABLE IF NOT EXISTS vinculo_grupo_complemento (
            grupo_id INTEGER REFERENCES grupos_complementos(id) ON DELETE CASCADE,
            complemento_id INTEGER REFERENCES complementos(id) ON DELETE CASCADE,
            ordem INTEGER DEFAULT 0,
            PRIMARY KEY (grupo_id, complemento_id)
        );`,
        `CREATE TABLE IF NOT EXISTS vinculo_produto_grupo (
            produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
            grupo_id INTEGER REFERENCES grupos_complementos(id) ON DELETE CASCADE,
            ordem INTEGER DEFAULT 0,
            PRIMARY KEY (produto_id, grupo_id)
        );`
    ];

    for (let q of queries) {
        try { 
            await pool.query(q); 
        } catch(e) { 
            console.log("Aviso DB Complementos:", e.message); 
        }
    }
}

const complementoController = {
    // ==========================================
    // 1. GRUPOS
    // ==========================================
    async listarGrupos(req, res) {
        try {
            await garantirTabelasComplementos(); // Roda a vacina antes de ler
            const result = await pool.query('SELECT * FROM grupos_complementos ORDER BY ordem, nome');
            res.json(result.rows);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async criarGrupo(req, res) {
        try {
            await garantirTabelasComplementos(); // Roda a vacina antes de gravar
            const { tenant_id, nome, obrigatorio, limite_selecao, ordem } = req.body;
            const result = await pool.query(
                `INSERT INTO grupos_complementos (tenant_id, nome, obrigatorio, limite_selecao, ordem) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [tenant_id || 1, nome, obrigatorio || false, limite_selecao || 1, ordem || 0]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async atualizarGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            const { nome, obrigatorio, limite_selecao, ordem } = req.body;
            const result = await pool.query(
                `UPDATE grupos_complementos SET nome=$1, obrigatorio=$2, limite_selecao=$3, ordem=$4 WHERE id=$5 RETURNING *`,
                [nome, obrigatorio, limite_selecao, ordem, id]
            );
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Grupo não encontrado' });
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async excluirGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            const result = await pool.query('DELETE FROM grupos_complementos WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Grupo não encontrado' });
            res.json({ mensagem: 'Grupo excluído com sucesso' });
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // 2. ITENS (COMPLEMENTOS GERAIS)
    // ==========================================
    async listarItens(req, res) {
        try {
            await garantirTabelasComplementos();
            const result = await pool.query('SELECT * FROM complementos ORDER BY ordem, nome');
            res.json(result.rows);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async criarItem(req, res) {
        try {
            await garantirTabelasComplementos();
            const { tenant_id, nome, preco, categoria_complemento, disponivel, ordem } = req.body;
            const result = await pool.query(
                `INSERT INTO complementos (tenant_id, nome, preco, categoria_complemento, disponivel, ordem) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [tenant_id || 1, nome, preco || 0, categoria_complemento || 'geral', disponivel !== false, ordem || 0]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async atualizarItem(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            const { nome, preco, categoria_complemento, disponivel, ordem } = req.body;
            const result = await pool.query(
                `UPDATE complementos SET nome=$1, preco=$2, categoria_complemento=$3, disponivel=$4, ordem=$5 WHERE id=$6 RETURNING *`,
                [nome, preco, categoria_complemento, disponivel, ordem, id]
            );
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Item não encontrado' });
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async excluirItem(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            
            // Verifica se o item está sendo usado nalgum grupo
            const vinculos = await pool.query('SELECT * FROM vinculo_grupo_complemento WHERE complemento_id = $1', [id]);
            if (vinculos.rows.length > 0) {
                return res.status(400).json({ erro: 'Este item está dentro de um grupo. Remova-o do grupo antes de excluir.' });
            }
            
            const result = await pool.query('DELETE FROM complementos WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Item não encontrado' });
            res.json({ mensagem: 'Item excluído com sucesso' });
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // 3. VÍNCULOS ITEM -> GRUPO
    // ==========================================
    async listarItensDoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            const result = await pool.query(
                `SELECT c.*, v.ordem as ordem_vinculo 
                 FROM complementos c 
                 INNER JOIN vinculo_grupo_complemento v ON c.id = v.complemento_id 
                 WHERE v.grupo_id = $1 
                 ORDER BY v.ordem, c.nome`,
                [id]
            );
            res.json(result.rows);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async vincularItemAoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { grupoId, itemId } = req.params;
            const { ordem } = req.body;
            
            // "ON CONFLICT DO NOTHING" impede que dê erro se você tentar adicionar o mesmo item duas vezes
            await pool.query(
                `INSERT INTO vinculo_grupo_complemento (grupo_id, complemento_id, ordem) 
                 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *`,
                [grupoId, itemId, ordem || 0]
            );
            res.json({ mensagem: 'Item vinculado ao grupo com sucesso!' });
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async removerItemDoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { grupoId, itemId } = req.params;
            await pool.query('DELETE FROM vinculo_grupo_complemento WHERE grupo_id=$1 AND complemento_id=$2', [grupoId, itemId]);
            res.json({ mensagem: 'Item removido do grupo' });
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // 4. VÍNCULOS GRUPO -> PRODUTO
    // ==========================================
    async listarGruposDoProduto(req, res) {
        try {
            await garantirTabelasComplementos();
            const { produtoId } = req.params;
            const result = await pool.query(
                `SELECT g.*, v.ordem as ordem_vinculo 
                 FROM grupos_complementos g 
                 INNER JOIN vinculo_produto_grupo v ON g.id = v.grupo_id 
                 WHERE v.produto_id = $1 
                 ORDER BY v.ordem, g.nome`,
                [produtoId]
            );
            res.json(result.rows);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async vincularGruposProduto(req, res) {
        try {
            await garantirTabelasComplementos();
            const { produtoId } = req.params;
            const { grupos } = req.body; // Vem do Frontend: [1, 5, 3] (Lista de IDs de Grupos marcados)

            await pool.query('BEGIN'); // Inicia a gravação em lote
            
            // Limpa os antigos grupos deste produto para não duplicar
            await pool.query('DELETE FROM vinculo_produto_grupo WHERE produto_id = $1', [produtoId]);
            
            // Insere os novos grupos assinalados no painel
            if (grupos && grupos.length > 0) {
                for (let i = 0; i < grupos.length; i++) {
                    await pool.query(
                        `INSERT INTO vinculo_produto_grupo (produto_id, grupo_id, ordem) VALUES ($1, $2, $3)`,
                        [produtoId, grupos[i], i]
                    );
                }
            }
            
            await pool.query('COMMIT'); // Salva o lote
            res.json({ mensagem: 'Montagem salva com sucesso!' });
        } catch (error) {
            await pool.query('ROLLBACK'); // Se der erro no meio, ele cancela tudo
            res.status(500).json({ erro: error.message });
        }
    }
};
module.exports = complementoController;