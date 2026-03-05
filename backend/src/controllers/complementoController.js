const pool = require('../config/database');

// O "Semáforo": Garante que a criação de tabelas roda apenas UMA VEZ sem atropelos
let dbInitPromise = null;

function garantirTabelasComplementos() {
    if (!dbInitPromise) {
        dbInitPromise = (async () => {
            try {
                // Criar tabelas base se não existirem
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
                        minimo_selecao INTEGER DEFAULT 0,
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
                // RECRIAÇÃO DA TABELA DE VÍNCULOS (CORRIGIDA)
                // ==========================================
                
                // Primeiro, dropar a tabela antiga se existir
                await pool.query("DROP TABLE IF EXISTS vinculo_grupo_complemento CASCADE;");
                
                // Recriar com a estrutura CORRETA - usando complemento_id
                await pool.query(`
                    CREATE TABLE vinculo_grupo_complemento (
                        grupo_id INTEGER REFERENCES grupos_complementos(id) ON DELETE CASCADE,
                        complemento_id INTEGER REFERENCES complementos(id) ON DELETE CASCADE,
                        ordem INTEGER DEFAULT 0,
                        PRIMARY KEY (grupo_id, complemento_id)
                    );
                `);

                // Criar tabela de vínculos produto-grupo
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS vinculo_produto_grupo (
                        produto_id INTEGER,
                        grupo_id INTEGER REFERENCES grupos_complementos(id) ON DELETE CASCADE,
                        ordem INTEGER DEFAULT 0,
                        PRIMARY KEY (produto_id, grupo_id)
                    );
                `);

                // Adicionar colunas que podem estar faltando
                const colunas = [
                    "ALTER TABLE grupos_complementos ADD COLUMN IF NOT EXISTS minimo_selecao INTEGER DEFAULT 0;",
                    "ALTER TABLE grupos_complementos ADD COLUMN IF NOT EXISTS limite_selecao INTEGER DEFAULT 1;",
                    "ALTER TABLE complementos ADD COLUMN IF NOT EXISTS disponivel BOOLEAN DEFAULT true;"
                ];
                
                for (let query of colunas) { 
                    try { await pool.query(query); } catch(e) {} 
                }

                console.log('✅ Tabelas de complementos verificadas/criadas com sucesso');
                
            } catch(e) {
                console.log("❌ Erro na inicialização do DB:", e.message);
                dbInitPromise = null; // Se falhar, permite tentar de novo
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
        } catch (error) { 
            console.error('❌ Erro ao listar grupos:', error);
            res.status(500).json({ erro: error.message }); 
        }
    },

    async criarGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { tenant_id, nome, obrigatorio, limite_selecao, minimo_selecao, ordem } = req.body;
            
            const result = await pool.query(
                `INSERT INTO grupos_complementos (tenant_id, nome, obrigatorio, minimo_selecao, limite_selecao, ordem) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [tenant_id || 1, nome, obrigatorio || false, minimo_selecao || 0, limite_selecao || 1, ordem || 0]
            );
            console.log('✅ Grupo criado:', result.rows[0]);
            res.status(201).json(result.rows[0]);
        } catch (error) { 
            console.error('❌ Erro ao criar grupo:', error);
            res.status(500).json({ erro: error.message }); 
        }
    },

    async atualizarGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            const { nome, obrigatorio, limite_selecao, minimo_selecao, ordem } = req.body;
            
            const result = await pool.query(
                `UPDATE grupos_complementos SET nome=$1, obrigatorio=$2, minimo_selecao=$3, limite_selecao=$4, ordem=$5 
                 WHERE id=$6 RETURNING *`,
                [nome, obrigatorio, minimo_selecao || 0, limite_selecao || 1, ordem || 0, id]
            );
            
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Grupo não encontrado' });
            
            console.log('✅ Grupo atualizado:', result.rows[0]);
            res.json(result.rows[0]);
        } catch (error) { 
            console.error('❌ Erro ao atualizar grupo:', error);
            res.status(500).json({ erro: error.message }); 
        }
    },

    async excluirGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            
            // Remover vínculos primeiro
            await pool.query('DELETE FROM vinculo_grupo_complemento WHERE grupo_id = $1', [id]);
            await pool.query('DELETE FROM vinculo_produto_grupo WHERE grupo_id = $1', [id]);
            
            const result = await pool.query('DELETE FROM grupos_complementos WHERE id = $1 RETURNING *', [id]);
            
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Grupo não encontrado' });
            
            console.log('✅ Grupo excluído:', id);
            res.json({ mensagem: 'Grupo excluído com sucesso' });
        } catch (error) { 
            console.error('❌ Erro ao excluir grupo:', error);
            res.status(500).json({ erro: error.message }); 
        }
    },

    // ==========================================
    // 2. ITENS (COMPLEMENTOS GERAIS)
    // ==========================================
    async listarItens(req, res) {
        try {
            await garantirTabelasComplementos();
            const result = await pool.query('SELECT * FROM complementos ORDER BY nome');
            res.json(result.rows);
        } catch (error) { 
            console.error('❌ Erro ao listar itens:', error);
            res.status(500).json({ erro: error.message }); 
        }
    },

    async criarItem(req, res) {
        try {
            await garantirTabelasComplementos();
            const { tenant_id, nome, preco, disponivel } = req.body;
            const result = await pool.query(
                `INSERT INTO complementos (tenant_id, nome, preco, disponivel) 
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [tenant_id || 1, nome, preco || 0, disponivel !== false]
            );
            console.log('✅ Item criado:', result.rows[0]);
            res.status(201).json(result.rows[0]);
        } catch (error) { 
            console.error('❌ Erro ao criar item:', error);
            res.status(500).json({ erro: error.message }); 
        }
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
            
            console.log('✅ Item atualizado:', result.rows[0]);
            res.json(result.rows[0]);
        } catch (error) { 
            console.error('❌ Erro ao atualizar item:', error);
            res.status(500).json({ erro: error.message }); 
        }
    },

    async excluirItem(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            
            // Verificar se está vinculado a algum grupo
            const vinculos = await pool.query('SELECT * FROM vinculo_grupo_complemento WHERE complemento_id = $1', [id]);
            
            if (vinculos.rows.length > 0) {
                return res.status(400).json({ 
                    erro: 'Este item está sendo usado em um ou mais grupos. Remova-o dos grupos primeiro.' 
                });
            }
            
            const result = await pool.query('DELETE FROM complementos WHERE id = $1 RETURNING *', [id]);
            
            if (result.rows.length === 0) return res.status(404).json({ erro: 'Item não encontrado' });
            
            console.log('✅ Item excluído:', id);
            res.json({ mensagem: 'Item excluído com sucesso' });
        } catch (error) { 
            console.error('❌ Erro ao excluir item:', error);
            res.status(500).json({ erro: error.message }); 
        }
    },

    // ==========================================
    // 3. VÍNCULOS ITEM -> GRUPO (CORRIGIDO)
    // ==========================================
    async listarItensDoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { id } = req.params;
            
            console.log(`🔍 Buscando itens do grupo: ${id}`);
            
            const result = await pool.query(
                `SELECT c.* FROM complementos c 
                 INNER JOIN vinculo_grupo_complemento v ON c.id = v.complemento_id 
                 WHERE v.grupo_id = $1 ORDER BY c.nome`,
                [id]
            );
            
            console.log(`✅ Encontrados ${result.rows.length} itens no grupo ${id}`);
            res.json(result.rows);
        } catch (error) { 
            console.error('❌ Erro ao listar itens do grupo:', error);
            res.status(500).json({ erro: error.message }); 
        }
    },

    async vincularItemAoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { grupoId, itemId } = req.params;
            
            console.log(`🔗 Vinculando item ${itemId} ao grupo ${grupoId}`);
            
            // Verificar se já existe
            const check = await pool.query(
                'SELECT * FROM vinculo_grupo_complemento WHERE grupo_id = $1 AND complemento_id = $2', 
                [grupoId, itemId]
            );
            
            if (check.rows.length === 0) {
                await pool.query(
                    `INSERT INTO vinculo_grupo_complemento (grupo_id, complemento_id) VALUES ($1, $2)`,
                    [grupoId, itemId]
                );
                console.log('✅ Item vinculado com sucesso');
                res.json({ mensagem: 'Item vinculado com sucesso!' });
            } else {
                console.log('⚠️ Item já estava vinculado');
                return res.status(400).json({ erro: 'Esta opção já faz parte do grupo!' });
            }
        } catch (error) { 
            console.error('❌ Erro ao vincular item:', error);
            res.status(500).json({ erro: error.message }); 
        }
    },

    async removerItemDoGrupo(req, res) {
        try {
            await garantirTabelasComplementos();
            const { grupoId, itemId } = req.params;
            
            console.log(`🔗 Removendo item ${itemId} do grupo ${grupoId}`);
            
            await pool.query(
                'DELETE FROM vinculo_grupo_complemento WHERE grupo_id=$1 AND complemento_id=$2', 
                [grupoId, itemId]
            );
            
            console.log('✅ Item removido do grupo');
            res.json({ mensagem: 'Item removido do grupo' });
        } catch (error) { 
            console.error('❌ Erro ao remover item:', error);
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
            
            console.log(`🔍 Buscando grupos do produto: ${produtoId}`);
            
            const result = await pool.query(
                `SELECT g.* FROM grupos_complementos g 
                 INNER JOIN vinculo_produto_grupo v ON g.id = v.grupo_id 
                 WHERE v.produto_id = $1 ORDER BY v.ordem, g.nome`,
                [produtoId]
            );
            
            console.log(`✅ Encontrados ${result.rows.length} grupos para o produto ${produtoId}`);
            res.json(result.rows);
        } catch (error) { 
            console.error('❌ Erro ao listar grupos do produto:', error);
            res.status(500).json({ erro: error.message }); 
        }
    },

    async vincularGruposProduto(req, res) {
        try {
            await garantirTabelasComplementos();
            const { produtoId } = req.params;
            const { grupos } = req.body; 

            console.log(`📦 Vinculando grupos ao produto ${produtoId}:`, grupos);

            await pool.query('BEGIN');
            
            // Remover vínculos antigos
            await pool.query('DELETE FROM vinculo_produto_grupo WHERE produto_id = $1', [produtoId]);
            
            // Inserir novos vínculos
            if (grupos && grupos.length > 0) {
                for (let i = 0; i < grupos.length; i++) {
                    await pool.query(
                        `INSERT INTO vinculo_produto_grupo (produto_id, grupo_id, ordem) VALUES ($1, $2, $3)`, 
                        [produtoId, grupos[i], i]
                    );
                }
            }
            
            await pool.query('COMMIT');
            console.log('✅ Grupos vinculados com sucesso');
            res.json({ mensagem: 'Vínculo salvo com sucesso!' });
        } catch (error) {
            await pool.query('ROLLBACK');
            console.error('❌ Erro ao vincular grupos ao produto:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // 5. ROTA ESPECIAL PARA O FRONTEND (COMPATIBILIDADE)
    // ==========================================
    async listarGruposComItens(req, res) {
        try {
            await garantirTabelasComplementos();
            
            // Buscar todos os grupos
            const grupos = await pool.query('SELECT * FROM grupos_complementos ORDER BY ordem, id');
            
            // Para cada grupo, buscar seus itens
            const resultado = [];
            for (let g of grupos.rows) {
                const itens = await pool.query(
                    `SELECT c.* FROM complementos c 
                     INNER JOIN vinculo_grupo_complemento v ON c.id = v.complemento_id 
                     WHERE v.grupo_id = $1 ORDER BY c.nome`,
                    [g.id]
                );
                
                resultado.push({
                    ...g,
                    itens: itens.rows
                });
            }
            
            res.json(resultado);
        } catch (error) {
            console.error('❌ Erro ao listar grupos com itens:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = complementoController;