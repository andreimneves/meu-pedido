const pool = require('../config/db');

const horarioController = {

    // LISTAR HORÁRIOS
    async listar(req, res) {

        try {

            const result = await pool.query(
                `SELECT * 
                 FROM horarios_funcionamento
                 WHERE tipo = $1
                 ORDER BY dia_semana`,
                ['loja']
            );

            res.json(result.rows);

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    },


    // ATUALIZAR HORÁRIO
    async atualizar(req, res) {

        try {

            const { id } = req.params;

            const {
                aberto,
                abre,
                fecha,
                delivery_abre,
                delivery_fecha
            } = req.body;

            const result = await pool.query(
                `UPDATE horarios_funcionamento
                 SET aberto = $1,
                     abre = $2,
                     fecha = $3,
                     delivery_abre = $4,
                     delivery_fecha = $5
                 WHERE id = $6
                 AND tipo = 'loja'
                 RETURNING *`,
                [aberto, abre, fecha, delivery_abre, delivery_fecha, id]
            );

            res.json(result.rows[0]);

        } catch (error) {

            res.status(500).json({ erro: error.message });

        }

    }

};

module.exports = horarioController;