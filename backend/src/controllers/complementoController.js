const pool = require('../config/database');

// O "Semáforo": Garante que a correção no banco roda apenas 1 vez quando o servidor liga
let dbInitPromise = null;

function garantirTabelasComplementos() {
    if (!dbInitPromise) {
        dbInitPromise = (async () => {
            try {
                // 1. Criação das tabelas principais
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
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS grupos_complementos (
                        id SERIAL PRIMARY KEY,
                        tenant_id INTEGER DEFAULT 1,
                        nome VARCHAR(255) NOT NULL,
                        obrigatorio BOOLEAN DEFAULT false,
                        limite_selecao INTEGER DEFAULT 1,
                        ordem INTEGER DEFAULT 0
                    );
                `);
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

                // ==========================================
                // A CURA DO FANTASMA (MUDANÇA DE NOME SEM PERDER DADOS)
                // ==========================================
                
                // Tenta renomear a tabela caso ainda se chame "grupo_itens"
                try { await pool.query("ALTER TABLE grupo_itens RENAME TO vinculo_grupo_complemento;"); } catch(e) {}
                
                // Cria a tabela de vínculos se for um sistema zerado
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS vinculo_grupo_complemento (
                        grupo_id INTEGER REFERENCES grupos_complementos(id) ON DELETE CASCADE,
                        ordem INTEGER DEFAULT 0
                    );
                `);

                // Tenta mudar o nome da coluna antiga "item_id" para "complemento_id" (Esta é a cura para o seu erro!)
                try { await pool.query("ALTER TABLE vinculo_grupo_complemento RENAME COLUMN item_id TO complemento_id;"); } catch(e) {}

                // Garante que a coluna "complemento_id" existe de qualquer forma
                try { await pool.query("ALTER TABLE vinculo_grupo_complemento ADD COLUMN IF NOT EXISTS complemento_id INTEGER REFERENCES complementos(id) ON DELETE CASCADE;"); } catch(e) {}

                // Tabela de produtos e grupos
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS vinculo_produto_grupo (
                        produto_id INTEGER,
                        grupo_id INTEGER REFERENCES grupos_complementos(id) ON DELETE CASCADE,
                        ordem INTEGER DEFAULT 0,
                        PRIMARY KEY (produto_id, grupo_id)
                    );
                `);

                // Vacina para outras colunas
                const vacinaColunas = [
                    "ALTER TABLE grupos_complementos ADD COLUMN IF NOT EXISTS minimo_selecao INTEGER DEFAULT 0;",
                    "ALTER TABLE grupos_complementos ADD COLUMN IF NOT EXISTS limite_selecao INTEGER DEFAULT 1;",
                    "ALTER TABLE complementos ADD COLUMN IF NOT EXISTS disponivel BOOLEAN DEFAULT true;"
                ];
                
                for (let query of vacinaColunas) { 
                    await pool.query(query).catch(e => {}); 
                }

            } catch(e) {
                console.log("Erro na inicialização do DB:", e.message);
                dbInitPromise = null; 
                throw e;
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
            const vinculos = await pool.query('SELECT * FROM vinculo_grupo_complemento WHERE complemento_id = $1', [id]);
            if (vinculos.rows.length > 0) return res.status(400).json({ erro: 'Este item está sendo usado num grupo. Remova-o do grupo primeiro.' });
            
            const result = await pool.query('DELETE FROM complementos WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Item não encontrado' });
            res.json({ mensagem: 'Item excluído' });
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    // ==========================================
    // 3. VÍNCULOS ITEM -> GRUPO (A CORREÇÃO)
    // ==========================================
    async listarItensDoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            const result = await pool.query(
                `SELECT c.* FROM complementos c 
                 INNER JOIN vinculo_grupo_complemento v ON c.id = v.complemento_id 
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
            
            const check = await pool.query('SELECT * FROM vinculo_grupo_complemento WHERE grupo_id = $1 AND complemento_id = $2', [grupoId, itemId]);
            
            if (check.rows.length === 0) {
                await pool.query(
                    `INSERT INTO vinculo_grupo_complemento (grupo_id, complemento_id) VALUES ($1, $2)`,
                    [grupoId, itemId]
                );
                res.json({ mensagem: 'Item vinculado com sucesso!' });
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
            await pool.query('DELETE FROM vinculo_grupo_complemento WHERE grupo_id=$1 AND complemento_id=$2', [grupoId, itemId]);
            res.json({ mensagem: 'Item removido do grupo' });
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