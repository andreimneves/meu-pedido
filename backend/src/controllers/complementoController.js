const pool = require('../config/database');

// ==========================================
// MÁGICA: SCRIPT DE REPARO AUTOMÁTICO DO BANCO
// ==========================================
async function repararBanco() {
    try {
        // 1. Garante as tabelas principais
        await pool.query(`
            CREATE TABLE IF NOT EXISTS grupos_complementos (
                id SERIAL PRIMARY KEY, tenant_id INTEGER DEFAULT 1, nome VARCHAR(255) NOT NULL,
                obrigatorio BOOLEAN DEFAULT false, limite_selecao INTEGER DEFAULT 1, ordem INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS complementos (
                id SERIAL PRIMARY KEY, tenant_id INTEGER DEFAULT 1, nome VARCHAR(255) NOT NULL,
                preco DECIMAL(10,2) DEFAULT 0, disponivel BOOLEAN DEFAULT true, ordem INTEGER DEFAULT 0
            );
        `);

        // 2. DESTRANCA AS TABELAS DE VÍNCULOS E INJETA 'ID'
        await pool.query(`ALTER TABLE grupo_itens DROP CONSTRAINT IF EXISTS grupo_itens_pkey;`).catch(()=>{});
        await pool.query(`ALTER TABLE produto_grupos DROP CONSTRAINT IF EXISTS produto_grupos_pkey;`).catch(()=>{});
        await pool.query(`ALTER TABLE grupo_itens ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;`).catch(()=>{});
        await pool.query(`ALTER TABLE produto_grupos ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;`).catch(()=>{});

        // 3. Cria se não existirem
        await pool.query(`
            CREATE TABLE IF NOT EXISTS grupo_itens (id SERIAL PRIMARY KEY, grupo_id INTEGER, item_id INTEGER);
            CREATE TABLE IF NOT EXISTS produto_grupos (id SERIAL PRIMARY KEY, produto_id INTEGER, grupo_id INTEGER);
        `);
        console.log('✅ Banco de dados de complementos verificado e reparado com sucesso!');
    } catch (e) {
        console.log('Aviso no reparo do DB:', e.message);
    }
}
repararBanco(); // Roda a limpeza assim que o servidor liga

const complementoController = {
    // ==========================================
    // 1. GRUPOS
    // ==========================================
    async listarGrupos(req, res) {
        try {
            const result = await pool.query('SELECT * FROM grupos_complementos ORDER BY id DESC');
            res.json(result.rows);
        } catch(e) { res.status(500).json({erro: e.message}); }
    },
    async criarGrupo(req, res) {
        try {
            const { nome, obrigatorio, limite_selecao } = req.body;
            const result = await pool.query('INSERT INTO grupos_complementos (nome, obrigatorio, limite_selecao) VALUES ($1, $2, $3) RETURNING *', [nome, obrigatorio || false, limite_selecao || 1]);
            res.json(result.rows[0]);
        } catch(e) { res.status(500).json({erro: e.message}); }
    },
    async atualizarGrupo(req, res) {
        try {
            const { id } = req.params;
            const { nome, obrigatorio, limite_selecao } = req.body;
            const result = await pool.query('UPDATE grupos_complementos SET nome=$1, obrigatorio=$2, limite_selecao=$3 WHERE id=$4 RETURNING *', [nome, obrigatorio || false, limite_selecao || 1, id]);
            res.json(result.rows[0]);
        } catch(e) { res.status(500).json({erro: e.message}); }
    },
    // CORREÇÃO: Limpa dependências sem falhar antes de excluir o grupo
    async excluirGrupo(req, res) {
        try {
            const { id } = req.params;
            try { await pool.query('DELETE FROM produto_grupos WHERE grupo_id = $1', [id]); } catch(e){}
            try { await pool.query('DELETE FROM grupo_itens WHERE grupo_id = $1', [id]); } catch(e){}
            await pool.query('DELETE FROM grupos_complementos WHERE id = $1', [id]);
            res.json({sucesso: true});
        } catch(e) { res.status(500).json({erro: e.message}); }
    },

    // ==========================================
    // 2. ITENS
    // ==========================================
    async listarItens(req, res) {
        try {
            const result = await pool.query('SELECT * FROM complementos ORDER BY nome');
            res.json(result.rows);
        } catch(e) { res.status(500).json({erro: e.message}); }
    },
    async criarItem(req, res) {
        try {
            const { nome, preco, disponivel } = req.body;
            const result = await pool.query('INSERT INTO complementos (nome, preco, disponivel) VALUES ($1, $2, $3) RETURNING *', [nome, preco || 0, disponivel !== false]);
            res.json(result.rows[0]);
        } catch(e) { res.status(500).json({erro: e.message}); }
    },
    async atualizarItem(req, res) {
        try {
            const { id } = req.params;
            const { nome, preco, disponivel } = req.body;
            const result = await pool.query('UPDATE complementos SET nome=$1, preco=$2, disponivel=$3 WHERE id=$4 RETURNING *', [nome, preco || 0, disponivel !== false, id]);
            res.json(result.rows[0]);
        } catch(e) { res.status(500).json({erro: e.message}); }
    },
    // CORREÇÃO: Limpa os vínculos invisíveis antes de excluir de vez o item
    async excluirItem(req, res) {
        try {
            const { id } = req.params;
            try { await pool.query('DELETE FROM grupo_itens WHERE item_id = $1', [id]); } catch(e){}
            await pool.query('DELETE FROM complementos WHERE id = $1', [id]);
            res.json({sucesso: true});
        } catch(e) { res.status(500).json({erro: e.message}); }
    },

    // ==========================================
    // 3. VÍNCULOS GRUPO-ITEM
    // ==========================================
    async listarItensDoGrupo(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query(`SELECT c.* FROM complementos c INNER JOIN grupo_itens gi ON c.id = gi.item_id WHERE gi.grupo_id = $1 ORDER BY c.nome`, [id]);
            res.json(result.rows);
        } catch(e) { res.status(500).json({erro: e.message}); }
    },
    async vincularItemAoGrupo(req, res) {
        try {
            const { grupoId, itemId } = req.params;
            const check = await pool.query('SELECT * FROM grupo_itens WHERE grupo_id = $1 AND item_id = $2', [grupoId, itemId]);
            if (check.rows.length === 0) { await pool.query('INSERT INTO grupo_itens (grupo_id, item_id) VALUES ($1, $2)', [grupoId, itemId]); }
            res.json({sucesso: true});
        } catch(e) { res.status(500).json({erro: e.message}); }
    },
    async removerItemDoGrupo(req, res) {
        try {
            const { grupoId, itemId } = req.params;
            await pool.query('DELETE FROM grupo_itens WHERE grupo_id = $1 AND item_id = $2', [grupoId, itemId]);
            res.json({sucesso: true});
        } catch(e) { res.status(500).json({erro: e.message}); }
    },

    // ==========================================
    // 4. VÍNCULOS PRODUTO-GRUPO
    // ==========================================
    async listarGruposDoProduto(req, res) {
        try {
            const { produtoId } = req.params;
            const result = await pool.query('SELECT grupo_id as id FROM produto_grupos WHERE produto_id = $1', [produtoId]);
            res.json(result.rows);
        } catch(e) { res.status(500).json({erro: e.message}); }
    },
    async vincularGruposProduto(req, res) {
        try {
            const { produtoId } = req.params;
            const { grupos } = req.body; 
            await pool.query('DELETE FROM produto_grupos WHERE produto_id = $1', [produtoId]);
            if (grupos && Array.isArray(grupos) && grupos.length > 0) {
                for (let grupoId of grupos) {
                    await pool.query('INSERT INTO produto_grupos (produto_id, grupo_id) VALUES ($1, $2)', [produtoId, grupoId]);
                }
            }
            res.json({ sucesso: true });
        } catch(e) { res.status(500).json({erro: e.message}); }
    }
};

module.exports = complementoController;