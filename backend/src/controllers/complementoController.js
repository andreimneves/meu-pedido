const pool = require('../config/db');

const complementoController = {

    async listar(req, res) {
        try {
            const result = await pool.query(
                'SELECT * FROM complementos ORDER BY id'
            );
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

    }

};

module.exports = complementoController;