const pool = require('../config/database');

const complementoController = {

    async listar(req, res) {
        try {
            const result = await pool.query(`
                SELECT * 
                FROM complementos
                ORDER BY id
            `);

            res.json(result.rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({ erro: error.message });
        }
    },

    async buscarPorId(req, res) {
        try {
            const { id } = req.params;

            const result = await pool.query(
                'SELECT * FROM complementos WHERE id = $1',
                [id]
            );

            res.json(result.rows[0] || null);

        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async buscarPorCategoria(req, res) {
        try {
            const { categoria } = req.params;

            const result = await pool.query(
                'SELECT * FROM complementos WHERE categoria_complemento = $1 ORDER BY ordem',
                [categoria]
            );

            res.json(result.rows);

        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async buscarPorGrupo(req, res) {
        try {
            const { grupoId } = req.params;

            const result = await pool.query(`
                SELECT c.*
                FROM complementos c
                INNER JOIN grupo_itens gi ON gi.complemento_id = c.id
                WHERE gi.grupo_id = $1
            `, [grupoId]);

            res.json(result.rows);

        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async buscarParaProduto(req, res) {
        try {
            const { produtoId } = req.params;

            const result = await pool.query(`
                SELECT c.*
                FROM complementos c
                INNER JOIN grupo_itens gi ON gi.complemento_id = c.id
                INNER JOIN produto_grupos pg ON pg.grupo_id = gi.grupo_id
                WHERE pg.produto_id = $1
            `, [produtoId]);

            res.json(result.rows);

        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async buscarGruposPorProduto(req, res) {
        try {
            const { produtoId } = req.params;

            const result = await pool.query(`
                SELECT g.*
                FROM grupos_complementos g
                INNER JOIN produto_grupos pg ON pg.grupo_id = g.id
                WHERE pg.produto_id = $1
            `, [produtoId]);

            res.json(result.rows);

        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async criar(req, res) {
        try {
            const { nome, preco, categoria_complemento, disponivel } = req.body;

            const result = await pool.query(`
                INSERT INTO complementos
                (nome, preco, categoria_complemento, disponivel)
                VALUES ($1,$2,$3,$4)
                RETURNING *
            `, [nome, preco, categoria_complemento, disponivel]);

            res.json(result.rows[0]);

        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const { nome, preco, categoria_complemento, disponivel } = req.body;

            const result = await pool.query(`
                UPDATE complementos
                SET nome=$1, preco=$2, categoria_complemento=$3, disponivel=$4
                WHERE id=$5
                RETURNING *
            `, [nome, preco, categoria_complemento, disponivel, id]);

            res.json(result.rows[0]);

        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async excluir(req, res) {
        try {
            const { id } = req.params;

            await pool.query(
                'DELETE FROM grupo_itens WHERE complemento_id = $1',
                [id]
            );

            await pool.query(
                'DELETE FROM complementos WHERE id = $1',
                [id]
            );

            res.json({ sucesso: true });

        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async vincularAoProduto(req, res) {
        try {

            const { produtoId } = req.params;
            const { grupos } = req.body;

            await pool.query(
                'DELETE FROM produto_grupos WHERE produto_id=$1',
                [produtoId]
            );

            for (let g of grupos) {

                await pool.query(`
                    INSERT INTO produto_grupos (produto_id,grupo_id)
                    VALUES ($1,$2)
                `, [produtoId, g]);

            }

            res.json({ sucesso: true });

        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    }

};

module.exports = complementoController;