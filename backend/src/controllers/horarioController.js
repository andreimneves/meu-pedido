const pool = require('../config/database');

const horarioController = {
    // ===== BUSCAR HORÁRIOS =====
    async buscarHorarios(req, res) {
        try {
            const { subdominio } = req.params;
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            const horarios = await pool.query(
                'SELECT * FROM horarios_delivery WHERE tenant_id = $1 ORDER BY dia_semana',
                [tenantId]
            );
            
            res.json(horarios.rows);
            
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== ATUALIZAR HORÁRIOS =====
    async atualizarHorarios(req, res) {
        const client = await pool.connect();
        
        try {
            const { subdominio } = req.params;
            const horarios = req.body;
            
            if (!Array.isArray(horarios) || horarios.length !== 7) {
                return res.status(400).json({ 
                    erro: 'É necessário enviar um array com 7 dias' 
                });
            }
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            await client.query('BEGIN');
            
            // Limpar horários antigos
            await client.query('DELETE FROM horarios_delivery WHERE tenant_id = $1', [tenantId]);
            
            // Inserir novos
            for (const h of horarios) {
                await client.query(
                    `INSERT INTO horarios_delivery 
                     (tenant_id, dia_semana, aberto, abertura, fechamento, tipo)
                     VALUES ($1, $2, $3, $4::time, $5::time, $6)`,
                    [
                        tenantId, 
                        h.dia_semana, 
                        h.aberto, 
                        h.abertura, 
                        h.fechamento,
                        h.tipo || 'delivery'
                    ]
                );
            }
            
            await client.query('COMMIT');
            
            res.json({ mensagem: 'Horários salvos com sucesso' });
            
        } catch (error) {
            await client.query('ROLLBACK');
            res.status(500).json({ erro: error.message });
        } finally {
            client.release();
        }
    },

    // ===== VERIFICAR DISPONIBILIDADE =====
    async verificarDisponibilidade(req, res) {
        try {
            const { subdominio } = req.params;
            const { tipo } = req.body;
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            const agora = new Date();
            const diaSemana = agora.getDay();
            
            const horario = await pool.query(
                'SELECT * FROM horarios_delivery WHERE tenant_id = $1 AND dia_semana = $2 AND tipo = $3',
                [tenantId, diaSemana, tipo || 'delivery']
            );
            
            if (horario.rows.length === 0) {
                return res.json({ 
                    disponivel: true,
                    pode_agendar: true,
                    mensagem: 'Horário não configurado'
                });
            }
            
            const hoje = horario.rows[0];
            
            if (!hoje.aberto) {
                return res.json({ 
                    disponivel: false,
                    pode_agendar: true,
                    mensagem: 'Fechado hoje'
                });
            }
            
            const horaAtual = agora.getHours() * 60 + agora.getMinutes();
            const [hAbre, mAbre] = hoje.abertura.split(':').map(Number);
            const [hFecha, mFecha] = hoje.fechamento.split(':').map(Number);
            
            const abertura = hAbre * 60 + mAbre;
            let fechamento = hFecha * 60 + mFecha;
            
            if (fechamento < abertura) fechamento += 24 * 60;
            
            const disponivel = horaAtual >= abertura && horaAtual <= fechamento;
            
            res.json({
                disponivel,
                pode_agendar: true,
                mensagem: disponivel ? 'Aberto agora' : 'Fechado agora'
            });
            
        } catch (error) {
            res.status(500).json({ disponivel: true, pode_agendar: true, erro: error.message });
        }
    }
};

module.exports = horarioController;