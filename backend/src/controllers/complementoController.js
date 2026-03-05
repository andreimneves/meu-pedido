const pool = require('../config/database');

async function garantirTabelasComplementos() {
    try {
        // 1. Garante que a tabela de produtos existe ANTES de criar vínculos
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
        // 2. Tabela de Grupos
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
        // 3. Tabela de Itens (Complementos)
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
        // 4. Vínculo: Quais itens estão dentro de qual grupo
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vinculo_grupo_complemento (
                grupo_id INTEGER REFERENCES grupos_complementos(id) ON DELETE CASCADE,
                complemento_id INTEGER REFERENCES complementos(id) ON DELETE CASCADE,
                ordem INTEGER DEFAULT 0,
                PRIMARY KEY (grupo_id, complemento_id)
            );
        `);
        // 5. Vínculo: Quais grupos pertencem a qual produto
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vinculo_produto_grupo (
                produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
                grupo_id INTEGER REFERENCES grupos_complementos(id) ON DELETE CASCADE,
                ordem INTEGER DEFAULT 0,
                PRIMARY KEY (produto_id, grupo_id)
            );
        `);
    } catch(e) { 
        console.log("Aviso ao criar tabelas de complementos:", e.message); 
    }
}

const complementoController = {
    // ==========================================
    // 1. GRUPOS
    // ==========================================
    async listarGrupos(req, res) {
        try {
            await garantirTabelasComplementos();
            const result = await pool.query('SELECT * FROM grupos_complementos ORDER BY ordem, nome');
            res.json(result.rows);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async criarGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { tenant_id, nome, obrigatorio, limite_selecao, ordem } = req.body;
            const result = await pool.query(
                `INSERT INTO grupos_complementos (tenant_id, nome, obrigatorio, limite_selecao, ordem) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [tenant_id || 1, nome, obrigatorio || false, limite_selecao || 1, ordem || 0]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) { res.status(500).json({ erro: error.message }); }
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
            const result = await pool.query('SELECT * FROM complementos ORDER BY ordem, nome');
            res.json(result.rows);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async criarItem(req, res) {
        try {
            await garantirTabelasComplementos();
            const { tenant_id, nome, preco, categoria_complemento, disponivel, ordem } = req.body;
            const result = await pool.query(
                `INSERT INTO complementos (tenant_id, nome, preco, categoria_complemento, disponivel, ordem) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [tenant_id || 1, nome, preco || 0, categoria_complemento || 'geral', disponivel !== false, ordem || 0]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) { res.status(500).json({ erro: error.message }); }
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
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async excluirItem(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            const vinculos = await pool.query('SELECT * FROM vinculo_grupo_complemento WHERE complemento_id = $1', [id]);
            if (vinculos.rows.length > 0) return res.status(400).json({ erro: 'Este item está sendo usado em um grupo. Remova-o do grupo primeiro.' });
            
            const result = await pool.query('DELETE FROM complementos WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Item não encontrado' });
            res.json({ mensagem: 'Item excluído' });
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    // ==========================================
    // 3. VÍNCULOS ITEM -> GRUPO
    // ==========================================
    async listarItensDoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            const result = await pool.query(
                `SELECT c.*, v.ordem as ordem_vinculo FROM complementos c 
                 INNER JOIN vinculo_grupo_complemento v ON c.id = v.complemento_id 
                 WHERE v.grupo_id = $1 ORDER BY v.ordem, c.nome`,
                [id]
            );
            res.json(result.rows);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async vincularItemAoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { grupoId, itemId } = req.params;
            await pool.query(
                `INSERT INTO vinculo_grupo_complemento (grupo_id, complemento_id, ordem) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                [grupoId, itemId, 0]
            );
            res.json({ mensagem: 'Item vinculado ao grupo' });
        } catch (error) { res.status(500).json({ erro: error.message }); }
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
            const { grupos } = req.body; // Array [1, 2, 3]

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