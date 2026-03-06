const pool = require('../config/database');

// ======================================================
// GARANTIR QUE AS TABELAS EXISTEM (auto-migração segura)
// ======================================================
async function garantirTabelas() {

    try {

        await pool.query(`
        CREATE TABLE IF NOT EXISTS grupos_complementos (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(255),
            obrigatorio BOOLEAN DEFAULT false,
            limite_selecao INTEGER DEFAULT 1,
            ordem INTEGER DEFAULT 0
        );
        `);

        await pool.query(`
        CREATE TABLE IF NOT EXISTS complementos (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(255),
            preco DECIMAL(10,2) DEFAULT 0,
            disponivel BOOLEAN DEFAULT true,
            ordem INTEGER DEFAULT 0
        );
        `);

        await pool.query(`
        CREATE TABLE IF NOT EXISTS grupo_itens (
            grupo_id INTEGER,
            complemento_id INTEGER,
            ordem INTEGER DEFAULT 0,
            UNIQUE(grupo_id, complemento_id)
        );
        `);

        await pool.query(`
        CREATE TABLE IF NOT EXISTS produto_grupos (
            produto_id INTEGER,
            grupo_id INTEGER,
            UNIQUE(produto_id, grupo_id)
        );
        `);

    } catch (e) {

        console.log('Aviso DB:', e.message);

    }

}

garantirTabelas();


// ======================================================
// CONTROLLER
// ======================================================

const complementoController = {

    // ==========================================
    // GRUPOS
    // ==========================================

    async listarGrupos(req, res) {

        try {

            const result = await pool.query(`
                SELECT *
                FROM grupos_complementos
                ORDER BY ordem, id
            `);

            res.json(result.rows);

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    async criarGrupo(req, res) {

        try {

            const { nome, obrigatorio, limite_selecao } = req.body;

            const result = await pool.query(`
                INSERT INTO grupos_complementos
                (nome, obrigatorio, limite_selecao)
                VALUES ($1,$2,$3)
                RETURNING *
            `, [nome, obrigatorio, limite_selecao]);

            res.json(result.rows[0]);

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    async atualizarGrupo(req, res) {

        try {

            const { id } = req.params;
            const { nome, obrigatorio, limite_selecao } = req.body;

            const result = await pool.query(`
                UPDATE grupos_complementos
                SET nome=$1,
                    obrigatorio=$2,
                    limite_selecao=$3
                WHERE id=$4
                RETURNING *
            `, [nome, obrigatorio, limite_selecao, id]);

            res.json(result.rows[0]);

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    async excluirGrupo(req, res) {

        try {

            const { id } = req.params;

            await pool.query(
                'DELETE FROM grupo_itens WHERE grupo_id=$1',
                [id]
            );

            await pool.query(
                'DELETE FROM produto_grupos WHERE grupo_id=$1',
                [id]
            );

            await pool.query(
                'DELETE FROM grupos_complementos WHERE id=$1',
                [id]
            );

            res.json({ sucesso: true });

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    // ==========================================
    // ITENS
    // ==========================================

    async listarItens(req, res) {

        try {

            const result = await pool.query(`
                SELECT *
                FROM complementos
                ORDER BY ordem, id
            `);

            res.json(result.rows);

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    async criarItem(req, res) {

        try {

            const { nome, preco, disponivel } = req.body;

            const result = await pool.query(`
                INSERT INTO complementos
                (nome, preco, disponivel)
                VALUES ($1,$2,$3)
                RETURNING *
            `, [nome, preco, disponivel]);

            res.json(result.rows[0]);

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    async atualizarItem(req, res) {

        try {

            const { id } = req.params;
            const { nome, preco, disponivel } = req.body;

            const result = await pool.query(`
                UPDATE complementos
                SET nome=$1,
                    preco=$2,
                    disponivel=$3
                WHERE id=$4
                RETURNING *
            `, [nome, preco, disponivel, id]);

            res.json(result.rows[0]);

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    async excluirItem(req, res) {

        try {

            const { id } = req.params;

            await pool.query(
                'DELETE FROM grupo_itens WHERE complemento_id=$1',
                [id]
            );

            await pool.query(
                'DELETE FROM complementos WHERE id=$1',
                [id]
            );

            res.json({ sucesso: true });

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    // ==========================================
    // ITENS DO GRUPO
    // ==========================================

    async listarItensDoGrupo(req, res) {

        try {

            const { id } = req.params;

            const result = await pool.query(`
                SELECT c.*
                FROM complementos c
                INNER JOIN grupo_itens gi
                ON gi.complemento_id = c.id
                WHERE gi.grupo_id = $1
            `, [id]);

            res.json(result.rows);

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    async vincularItemAoGrupo(req, res) {

        try {

            const { grupoId, itemId } = req.params;

            await pool.query(`
                INSERT INTO grupo_itens
                (grupo_id, complemento_id)
                VALUES ($1,$2)
                ON CONFLICT DO NOTHING
            `, [grupoId, itemId]);

            res.json({ sucesso: true });

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    async removerItemDoGrupo(req, res) {

        try {

            const { grupoId, itemId } = req.params;

            await pool.query(`
                DELETE FROM grupo_itens
                WHERE grupo_id=$1
                AND complemento_id=$2
            `, [grupoId, itemId]);

            res.json({ sucesso: true });

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    // ==========================================
    // GRUPOS DO PRODUTO
    // ==========================================

    async listarGruposDoProduto(req, res) {

        try {

            const { produtoId } = req.params;

            const result = await pool.query(`
                SELECT g.*
                FROM grupos_complementos g
                INNER JOIN produto_grupos pg
                ON pg.grupo_id = g.id
                WHERE pg.produto_id = $1
            `, [produtoId]);

            res.json(result.rows);

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    async vincularGruposProduto(req, res) {

        try {

            const { produtoId } = req.params;
            const { grupos } = req.body;

            await pool.query(
                'DELETE FROM produto_grupos WHERE produto_id=$1',
                [produtoId]
            );

            if (Array.isArray(grupos)) {

                for (let g of grupos) {

                    await pool.query(`
                        INSERT INTO produto_grupos
                        (produto_id, grupo_id)
                        VALUES ($1,$2)
                        ON CONFLICT DO NOTHING
                    `, [produtoId, g]);

                }

            }

            res.json({ sucesso: true });

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    }

};

module.exports = complementoController;