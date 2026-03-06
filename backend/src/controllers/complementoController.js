const pool = require('../config/database');

let dbInitPromise = null;

function garantirTabelasComplementos() {
    if (!dbInitPromise) {
        dbInitPromise = (async () => {
            // 1. Tabela Produtos
            try {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS produtos (
                        id SERIAL PRIMARY KEY,
                        tenant_id INTEGER DEFAULT 1,
                        nome VARCHAR(255) NOT NULL,
                        descricao TEXT,
                        preco NUMERIC(10,2) DEFAULT 0,
                        categoria_nome VARCHAR(255),
                        imagem_url TEXT,
                        ativo BOOLEAN DEFAULT true
                    );
                `);
            } catch(e) { console.log("Ignorando erro produtos:", e.message); }

            // 2. Tabela Grupos
            try {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS grupos_complementos (
                        id SERIAL PRIMARY KEY,
                        tenant_id INTEGER DEFAULT 1,
                        nome VARCHAR(255) NOT NULL,
                        obrigatorio BOOLEAN DEFAULT false,
                        limite_selecao INTEGER DEFAULT 1,
                        minimo_selecao INTEGER DEFAULT 0,
                        ordem INTEGER DEFAULT 0
                    );
                `);
            } catch(e) { console.log("Ignorando erro grupos:", e.message); }

            // 3. Tabela Complementos (As suas opções)
            try {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS complementos (
                        id SERIAL PRIMARY KEY,
                        tenant_id INTEGER DEFAULT 1,
                        nome VARCHAR(255) NOT NULL,
                        preco NUMERIC(10,2) DEFAULT 0,
                        categoria_complemento VARCHAR(100) DEFAULT 'geral',
                        disponivel BOOLEAN DEFAULT true,
                        ordem INTEGER DEFAULT 0
                    );
                `);
            } catch(e) { console.log("Ignorando erro complementos:", e.message); }

            // ==========================================
            // 4. A TABELA EXATA DO SEU BANCO DE DADOS
            // Usa "grupo_itens" e as colunas originais
            // ==========================================
            try {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS grupo_itens (
                        grupo_id INTEGER,
                        item_id INTEGER
                    );
                `);
            } catch(e) { console.log("Ignorando erro grupo_itens:", e.message); }

            // 5. Tabela Vínculo Produto/Grupo
            try {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS vinculo_produto_grupo (
                        produto_id INTEGER,
                        grupo_id INTEGER,
                        ordem INTEGER DEFAULT 0
                    );
                `);
            } catch(e) { console.log("Ignorando erro produto/grupo:", e.message); }

            // 6. Vacinas de Colunas Básicas
            const vacinaColunas = [
                "ALTER TABLE grupos_complementos ADD COLUMN IF NOT EXISTS minimo_selecao INTEGER DEFAULT 0;",
                "ALTER TABLE grupos_complementos ADD COLUMN IF NOT EXISTS limite_selecao INTEGER DEFAULT 1;",
                "ALTER TABLE complementos ADD COLUMN IF NOT EXISTS disponivel BOOLEAN DEFAULT true;"
            ];
            
            for (let query of vacinaColunas) { 
                try { await pool.query(query); } catch(e) {} 
            }
        })();
    }
    return dbInitPromise;
}

const complementoController = {
    // ==========================================
    // 1. GRUPOS
    // ==========================================
    async listarGrupos(req, res) {
        try {
            await garantirTabelasComplementos();
            const result = await pool.query('SELECT * FROM grupos_complementos ORDER BY ordem, id');
            res.json(result.rows);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async criarGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { tenant_id, nome, obrigatorio, limite_selecao, minimo_selecao, ordem } = req.body;
            
            const result = await pool.query(
                `INSERT INTO grupos_complementos (tenant_id, nome, obrigatorio, minimo_selecao, limite_selecao, ordem) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [tenant_id || 1, nome, obrigatorio || false, minimo_selecao || 0, limite_selecao || 1, ordem || 0]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async atualizarGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            const { nome, obrigatorio, limite_selecao, minimo_selecao, ordem } = req.body;
            
            const result = await pool.query(
                `UPDATE grupos_complementos SET nome=$1, obrigatorio=$2, minimo_selecao=$3, limite_selecao=$4, ordem=$5 WHERE id=$6 RETURNING *`,
                [nome, obrigatorio, minimo_selecao || 0, limite_selecao || 1, ordem || 0, id]
            );
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Grupo não encontrado' });
            res.json(result.rows[0]);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async excluirGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            
            // Remove as ligações baseadas no seu banco de dados
            await pool.query('DELETE FROM grupo_itens WHERE grupo_id = $1', [id]).catch(()=>{});
            await pool.query('DELETE FROM vinculo_produto_grupo WHERE grupo_id = $1', [id]).catch(()=>{});
            
            const result = await pool.query('DELETE FROM grupos_complementos WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Grupo não encontrado' });
            res.json({ mensagem: 'Grupo excluído' });
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    // ==========================================
    // 2. ITENS (COMPLEMENTOS GERAIS)
    // ==========================================
    async listarItens(req, res) {
        try {
            await garantirTabelasComplementos();
            const result = await pool.query('SELECT * FROM complementos ORDER BY nome');
            res.json(result.rows);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async criarItem(req, res) {
        try {
            await garantirTabelasComplementos();
            const { tenant_id, nome, preco, disponivel } = req.body;
            const result = await pool.query(
                `INSERT INTO complementos (tenant_id, nome, preco, disponivel) VALUES ($1, $2, $3, $4) RETURNING *`,
                [tenant_id || 1, nome, preco || 0, disponivel !== false]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async atualizarItem(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            const { nome, preco, disponivel } = req.body;
            const result = await pool.query(
                `UPDATE complementos SET nome=$1, preco=$2, disponivel=$3 WHERE id=$4 RETURNING *`,
                [nome, preco, disponivel, id]
            );
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Item não encontrado' });
            res.json(result.rows[0]);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async excluirItem(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            
            // Procura na SUA tabela "grupo_itens" usando a SUA coluna "item_id"
            const vinculos = await pool.query('SELECT * FROM grupo_itens WHERE item_id = $1', [id]).catch(()=>({rows:[]}));
            if (vinculos.rows.length > 0) return res.status(400).json({ erro: 'Esta opção está sendo usada em um grupo. Remova-a do grupo primeiro.' });
            
            const result = await pool.query('DELETE FROM complementos WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Item não encontrado' });
            res.json({ mensagem: 'Item excluído' });
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    // ==========================================
    // 3. VÍNCULOS ITEM -> GRUPO (A LEITURA PERFEITA DO SEU BANCO)
    // ==========================================
    async listarItensDoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            
            // Une a tabela 'complementos' com a sua tabela 'grupo_itens' através do 'item_id'
            const result = await pool.query(
                `SELECT c.* FROM complementos c 
                 INNER JOIN grupo_itens v ON c.id = v.item_id 
                 WHERE v.grupo_id = $1 ORDER BY c.nome`,
                [id]
            );
            res.json(result.rows);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async vincularItemAoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { grupoId, itemId } = req.params;
            
            // Verifica na sua tabela usando o item_id
            const check = await pool.query('SELECT * FROM grupo_itens WHERE grupo_id = $1 AND item_id = $2', [grupoId, itemId]);
            
            if (check.rows.length === 0) {
                // Insere na sua tabela usando o item_id
                await pool.query(
                    `INSERT INTO grupo_itens (grupo_id, item_id) VALUES ($1, $2)`,
                    [grupoId, itemId]
                );
                res.json({ mensagem: 'Opção vinculada com sucesso!' });
            } else {
                return res.status(400).json({ erro: 'Esta opção já faz parte do grupo!' });
            }
        } catch (error) { 
            res.status(500).json({ erro: error.message }); 
        }
    },

    async removerItemDoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { grupoId, itemId } = req.params;
            
            // Apaga da sua tabela usando o item_id
            await pool.query('DELETE FROM grupo_itens WHERE grupo_id=$1 AND item_id=$2', [grupoId, itemId]);
            res.json({ mensagem: 'Opção removida do grupo' });
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    // ==========================================
    // 4. VÍNCULOS GRUPO -> PRODUTO
    // ==========================================
    async listarGruposDoProduto(req, res) {
        try {
            await garantirTabelasComplementos();
            const { produtoId } = req.params;
            const result = await pool.query(
                `SELECT g.*, v.ordem as ordem_vinculo FROM grupos_complementos g 
                 INNER JOIN vinculo_produto_grupo v ON g.id = v.grupo_id 
                 WHERE v.produto_id = $1 ORDER BY v.ordem, g.nome`,
                [produtoId]
            );
            res.json(result.rows);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async vincularGruposProduto(req, res) {
        try {
            await garantirTabelasComplementos();
            const { produtoId } = req.params;
            const { grupos } = req.body; 

            await pool.query('BEGIN');
            await pool.query('DELETE FROM vinculo_produto_grupo WHERE produto_id = $1', [produtoId]);
            
            if (grupos && grupos.length > 0) {
                for (let i = 0; i < grupos.length; i++) {
                    await pool.query(`INSERT INTO vinculo_produto_grupo (produto_id, grupo_id, ordem) VALUES ($1, $2, $3)`, [produtoId, grupos[i], i]);
                }
            }
            await pool.query('COMMIT');
            res.json({ mensagem: 'Vínculo salvo com sucesso!' });
        } catch (error) {
            await pool.query('ROLLBACK');
            res.status(500).json({ erro: error.message });
        }
    }
};
module.exports = complementoController;