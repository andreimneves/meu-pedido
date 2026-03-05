const pool = require('../config/database');

const horarioController = {
    // ===== BUSCAR HORÁRIOS =====
    async buscarHorarios(req, res) {
        try {
            const { subdominio } = req.params;
            
            console.log('🔍 Buscando horários para:', subdominio);
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Buscar TODAS as colunas de horário
            const configQuery = await pool.query(
                `SELECT 
                    horario_funcionamento,
                    horario_loja_segunda, horario_loja_terca, horario_loja_quarta,
                    horario_loja_quinta, horario_loja_sexta, horario_loja_sabado, horario_loja_domingo,
                    horario_delivery_segunda, horario_delivery_terca, horario_delivery_quarta,
                    horario_delivery_quinta, horario_delivery_sexta, horario_delivery_sabado, horario_delivery_domingo
                FROM configuracoes_loja WHERE tenant_id = $1`,
                [tenantId]
            );
            
            if (configQuery.rows.length === 0) {
                return res.json({
                    horario_funcionamento: 'Seg a Dom: 18h às 23h',
                    loja: gerarHorariosPadrao(),
                    delivery: gerarHorariosPadrao()
                });
            }
            
            // Montar objeto de resposta
            const loja = {
                segunda: JSON.parse(configQuery.rows[0].horario_loja_segunda || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}'),
                terca: JSON.parse(configQuery.rows[0].horario_loja_terca || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}'),
                quarta: JSON.parse(configQuery.rows[0].horario_loja_quarta || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}'),
                quinta: JSON.parse(configQuery.rows[0].horario_loja_quinta || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}'),
                sexta: JSON.parse(configQuery.rows[0].horario_loja_sexta || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}'),
                sabado: JSON.parse(configQuery.rows[0].horario_loja_sabado || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}'),
                domingo: JSON.parse(configQuery.rows[0].horario_loja_domingo || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}')
            };
            
            const delivery = {
                segunda: JSON.parse(configQuery.rows[0].horario_delivery_segunda || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}'),
                terca: JSON.parse(configQuery.rows[0].horario_delivery_terca || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}'),
                quarta: JSON.parse(configQuery.rows[0].horario_delivery_quarta || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}'),
                quinta: JSON.parse(configQuery.rows[0].horario_delivery_quinta || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}'),
                sexta: JSON.parse(configQuery.rows[0].horario_delivery_sexta || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}'),
                sabado: JSON.parse(configQuery.rows[0].horario_delivery_sabado || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}'),
                domingo: JSON.parse(configQuery.rows[0].horario_delivery_domingo || '{"ativo":true,"abertura":"18:00","fechamento":"23:00"}')
            };
            
            res.json({
                horario_funcionamento: configQuery.rows[0].horario_funcionamento || 'Seg a Dom: 18h às 23h',
                loja,
                delivery
            });
            
        } catch (error) {
            console.error('❌ Erro ao buscar horários:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== ATUALIZAR HORÁRIOS =====
    async atualizarHorarios(req, res) {
        try {
            const { subdominio } = req.params;
            const { loja, delivery, horario_funcionamento } = req.body;
            
            console.log('📝 Atualizando horários individuais:');
            console.log('Loja:', loja);
            console.log('Delivery:', delivery);
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Construir query de update
            const updates = [];
            const values = [];
            let paramCount = 1;
            
            // Atualizar horário resumido
            if (horario_funcionamento) {
                updates.push(`horario_funcionamento = $${paramCount}`);
                values.push(horario_funcionamento);
                paramCount++;
            }
            
            // Atualizar horários da loja
            const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
            
            if (loja) {
                dias.forEach(dia => {
                    if (loja[dia]) {
                        updates.push(`horario_loja_${dia} = $${paramCount}`);
                        values.push(JSON.stringify(loja[dia]));
                        paramCount++;
                    }
                });
            }
            
            if (delivery) {
                dias.forEach(dia => {
                    if (delivery[dia]) {
                        updates.push(`horario_delivery_${dia} = $${paramCount}`);
                        values.push(JSON.stringify(delivery[dia]));
                        paramCount++;
                    }
                });
            }
            
            if (updates.length === 0) {
                return res.json({ mensagem: 'Nenhum dado para atualizar' });
            }
            
            values.push(tenantId);
            const sql = `UPDATE configuracoes_loja SET ${updates.join(', ')} WHERE tenant_id = $${paramCount}`;
            
            console.log('📝 SQL:', sql);
            console.log('📊 Valores:', values);
            
            await pool.query(sql, values);
            
            res.json({ 
                mensagem: '✅ Horários salvos com sucesso!',
                atualizado: true
            });
            
        } catch (error) {
            console.error('❌ Erro ao atualizar horários:', error);
            res.status(500).json({ erro: error.message });
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
            
            // Buscar horários do dia atual
            const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
            const hoje = dias[new Date().getDay()];
            
            const configQuery = await pool.query(
                tipo === 'delivery' 
                    ? `SELECT horario_delivery_${hoje} as horario FROM configuracoes_loja WHERE tenant_id = $1`
                    : `SELECT horario_loja_${hoje} as horario FROM configuracoes_loja WHERE tenant_id = $1`,
                [tenantId]
            );
            
            if (configQuery.rows.length === 0 || !configQuery.rows[0].horario) {
                return res.json({ 
                    disponivel: true, 
                    pode_agendar: true,
                    mensagem: 'Disponível (horário padrão)'
                });
            }
            
            const horarioHoje = JSON.parse(configQuery.rows[0].horario);
            
            if (!horarioHoje.ativo) {
                return res.json({ 
                    disponivel: false, 
                    pode_agendar: true,
                    mensagem: 'Fechado hoje'
                });
            }
            
            const agora = new Date();
            const horaAtual = agora.getHours() * 60 + agora.getMinutes();
            
            const [hAbre, mAbre] = horarioHoje.abertura.split(':').map(Number);
            const [hFecha, mFecha] = horarioHoje.fechamento.split(':').map(Number);
            
            const aberturaMin = hAbre * 60 + (mAbre || 0);
            let fechamentoMin = hFecha * 60 + (mFecha || 0);
            
            if (fechamentoMin < aberturaMin) {
                fechamentoMin += 24 * 60;
            }
            
            const disponivel = horaAtual >= aberturaMin && horaAtual <= fechamentoMin;
            
            res.json({
                disponivel,
                pode_agendar: true,
                mensagem: disponivel ? 'Disponível agora' : 'Fechado agora',
                horario_hoje: `${horarioHoje.abertura} às ${horarioHoje.fechamento}`
            });
            
        } catch (error) {
            console.error('❌ Erro ao verificar disponibilidade:', error);
            res.status(500).json({ 
                disponivel: true,
                pode_agendar: true,
                erro: error.message 
            });
        }
    }
};

function gerarHorariosPadrao() {
    return {
        segunda: { ativo: true, abertura: '18:00', fechamento: '23:00' },
        terca: { ativo: true, abertura: '18:00', fechamento: '23:00' },
        quarta: { ativo: true, abertura: '18:00', fechamento: '23:00' },
        quinta: { ativo: true, abertura: '18:00', fechamento: '23:00' },
        sexta: { ativo: true, abertura: '18:00', fechamento: '23:00' },
        sabado: { ativo: true, abertura: '18:00', fechamento: '23:00' },
        domingo: { ativo: true, abertura: '18:00', fechamento: '23:00' }
    };
}

module.exports = horarioController;