// backend/src/controllers/horarioController.js
const pool = require('../config/database');

const horarioController = {
    // Buscar horários do delivery
    async buscarHorarios(req, res) {
        try {
            const { subdominio } = req.params;
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            const horarios = await pool.query(
                'SELECT * FROM horarios_delivery WHERE tenant_id = $1 ORDER BY dia_semana',
                [tenantId]
            );
            
            res.json(horarios.rows);
            
        } catch (error) {
            console.error('Erro ao buscar horários:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Atualizar horários
    async atualizarHorarios(req, res) {
        const client = await pool.connect();
        try {
            const { subdominio } = req.params;
            const { horarios } = req.body;
            
            await client.query('BEGIN');
            
            const tenantQuery = await client.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Atualizar cada horário
            for (const h of horarios) {
                await client.query(
                    `UPDATE horarios_delivery SET
                        aberto = $1,
                        abertura = $2,
                        fechamento = $3,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE tenant_id = $4 AND dia_semana = $5`,
                    [h.aberto, h.abertura, h.fechamento, tenantId, h.dia_semana]
                );
            }
            
            await client.query('COMMIT');
            res.json({ mensagem: 'Horários atualizados com sucesso!' });
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao atualizar horários:', error);
            res.status(500).json({ erro: error.message });
        } finally {
            client.release();
        }
    },

    // Verificar se delivery está disponível agora
    async verificarDisponibilidade(req, res) {
        try {
            const { subdominio } = req.params;
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            const agora = new Date();
            const diaSemana = agora.getDay(); // 0=domingo, 1=segunda...
            const horaAtual = agora.toTimeString().slice(0,5); // 'HH:MM'
            
            const horario = await pool.query(
                `SELECT * FROM horarios_delivery 
                 WHERE tenant_id = $1 AND dia_semana = $2 AND aberto = true`,
                [tenantId, diaSemana]
            );
            
            if (horario.rows.length === 0) {
                return res.json({ 
                    disponivel: false, 
                    mensagem: 'Hoje não estamos fazendo entregas. Você pode retirar na loja!' 
                });
            }
            
            const { abertura, fechamento } = horario.rows[0];
            
            // Comparar horários
            if (horaAtual >= abertura && horaAtual <= fechamento) {
                res.json({ 
                    disponivel: true, 
                    mensagem: 'Delivery disponível!',
                    horario: `${abertura} às ${fechamento}`
                });
            } else {
                res.json({ 
                    disponivel: false, 
                    mensagem: `Fora do horário de delivery (${abertura} às ${fechamento}). Você pode retirar na loja!` 
                });
            }
            
        } catch (error) {
            console.error('Erro ao verificar disponibilidade:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = horarioController;