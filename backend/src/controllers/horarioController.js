// ==========================================
// backend/src/controllers/horarioController.js
// ==========================================
const pool = require('../config/database');

const horarioController = {
    // ==========================================
    // LISTAR HORÁRIOS
    // ==========================================
    async listar(req, res) {
        try {
            const { tenant_id = 1 } = req.query;
            
            console.log('🔍 Buscando horários para tenant:', tenant_id);
            
            // Verificar se a tabela existe
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'horarios_funcionamento'
                );
            `);
            
            if (!tableCheck.rows[0].exists) {
                return res.status(404).json({ 
                    erro: 'Tabela horarios_funcionamento não existe. Execute o script SQL primeiro.' 
                });
            }
            
            const result = await pool.query(`
                SELECT 
                    dias.dia_semana,
                    dias.nome_dia,
                    COALESCE(loja.aberto, true) as loja_aberta,
                    COALESCE(loja.abre, '18:00:00'::time) as loja_abre,
                    COALESCE(loja.fecha, '23:00:00'::time) as loja_fecha,
                    COALESCE(delivery.aberto, true) as delivery_aberto,
                    COALESCE(delivery.abre, '18:00:00'::time) as delivery_abre,
                    COALESCE(delivery.fecha, '23:00:00'::time) as delivery_fecha
                FROM (
                    VALUES 
                        (0, 'Domingo'),
                        (1, 'Segunda'),
                        (2, 'Terça'),
                        (3, 'Quarta'),
                        (4, 'Quinta'),
                        (5, 'Sexta'),
                        (6, 'Sábado')
                ) AS dias(dia_semana, nome_dia)
                LEFT JOIN horarios_funcionamento loja 
                    ON loja.dia_semana = dias.dia_semana 
                    AND loja.tipo = 'loja' 
                    AND loja.tenant_id = $1
                LEFT JOIN horarios_funcionamento delivery 
                    ON delivery.dia_semana = dias.dia_semana 
                    AND delivery.tipo = 'delivery' 
                    AND delivery.tenant_id = $1
                ORDER BY dias.dia_semana
            `, [tenant_id]);
            
            console.log('✅ Horários encontrados:', result.rows.length);
            res.json(result.rows);
            
        } catch (error) {
            console.error('❌ Erro ao listar horários:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // ATUALIZAR HORÁRIOS
    // ==========================================
    async atualizarLote(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const { horarios, tenant_id = 1 } = req.body;
            
            console.log('📝 Atualizando horários para tenant:', tenant_id);
            
            for (const h of horarios) {
                await client.query(`
                    INSERT INTO horarios_funcionamento 
                        (tenant_id, dia_semana, tipo, aberto, abre, fecha)
                    VALUES ($1, $2, 'loja', $3, $4, $5)
                    ON CONFLICT (tenant_id, dia_semana, tipo) 
                    DO UPDATE SET 
                        aberto = EXCLUDED.aberto,
                        abre = EXCLUDED.abre,
                        fecha = EXCLUDED.fecha,
                        updated_at = CURRENT_TIMESTAMP
                `, [tenant_id, h.dia_semana, h.loja_aberta, h.loja_abre, h.loja_fecha]);
                
                await client.query(`
                    INSERT INTO horarios_funcionamento 
                        (tenant_id, dia_semana, tipo, aberto, abre, fecha)
                    VALUES ($1, $2, 'delivery', $3, $4, $5)
                    ON CONFLICT (tenant_id, dia_semana, tipo) 
                    DO UPDATE SET 
                        aberto = EXCLUDED.aberto,
                        abre = EXCLUDED.abre,
                        fecha = EXCLUDED.fecha,
                        updated_at = CURRENT_TIMESTAMP
                `, [tenant_id, h.dia_semana, h.delivery_aberto, h.delivery_abre, h.delivery_fecha]);
            }
            
            await client.query('COMMIT');
            console.log('✅ Horários atualizados!');
            res.json({ mensagem: 'Horários salvos com sucesso!' });
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro:', error);
            res.status(500).json({ erro: error.message });
        } finally {
            client.release();
        }
    },

    // ==========================================
    // VERIFICAR STATUS
    // ==========================================
    async verificarStatus(req, res) {
        try {
            const { subdominio = 'dlcrepes' } = req.params;
            const agora = new Date();
            const diaSemana = agora.getDay();
            const horaAtual = agora.toTimeString().slice(0,5);
            
            console.log(`🔍 Verificando status: ${subdominio}, dia ${diaSemana}, hora ${horaAtual}`);
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            const horarios = await pool.query(`
                SELECT 
                    COALESCE(loja.aberto, true) as loja_aberta,
                    COALESCE(loja.abre, '18:00:00'::time) as loja_abre,
                    COALESCE(loja.fecha, '23:00:00'::time) as loja_fecha,
                    COALESCE(delivery.aberto, true) as delivery_aberto,
                    COALESCE(delivery.abre, '18:00:00'::time) as delivery_abre,
                    COALESCE(delivery.fecha, '23:00:00'::time) as delivery_fecha
                FROM (
                    SELECT $1 as tenant_id, $2 as dia_semana
                ) as params
                LEFT JOIN horarios_funcionamento loja 
                    ON loja.tenant_id = params.tenant_id 
                    AND loja.dia_semana = params.dia_semana 
                    AND loja.tipo = 'loja'
                LEFT JOIN horarios_funcionamento delivery 
                    ON delivery.tenant_id = params.tenant_id 
                    AND delivery.dia_semana = params.dia_semana 
                    AND delivery.tipo = 'delivery'
            `, [tenantId, diaSemana]);
            
            const h = horarios.rows[0] || {
                loja_aberta: true,
                loja_abre: '18:00:00',
                loja_fecha: '23:00:00',
                delivery_aberto: true,
                delivery_abre: '18:00:00',
                delivery_fecha: '23:00:00'
            };
            
            function horaParaMinutos(hora) {
                const [h, m] = hora.split(':').map(Number);
                return h * 60 + m;
            }
            
            const horaAtualMin = horaParaMinutos(horaAtual);
            const lojaAbreMin = horaParaMinutos(h.loja_abre);
            const lojaFechaMin = horaParaMinutos(h.loja_fecha);
            
            let loja_aberta = false;
            let mensagem_loja = '';
            
            if (!h.loja_aberta) {
                mensagem_loja = 'Loja fechada hoje';
            } else if (horaAtualMin >= lojaAbreMin && horaAtualMin <= lojaFechaMin) {
                loja_aberta = true;
                mensagem_loja = 'Loja aberta';
            } else if (horaAtualMin < lojaAbreMin) {
                mensagem_loja = `Abre às ${h.loja_abre}`;
            } else {
                mensagem_loja = 'Loja fechada';
            }
            
            res.json({
                loja_aberta,
                delivery_aberto: h.delivery_aberto,
                pode_agendar: true,
                mensagem_loja,
                horario_loja: `${h.loja_abre} às ${h.loja_fecha}`
            });
            
        } catch (error) {
            console.error('❌ Erro:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // FECHAR LOJA AGORA
    // ==========================================
    async fecharLojaAgora(req, res) {
        try {
            const { tenant_id = 1 } = req.body;
            
            await pool.query(`
                UPDATE horarios_funcionamento 
                SET aberto = false 
                WHERE tenant_id = $1 AND tipo = 'loja'
            `, [tenant_id]);
            
            res.json({ mensagem: 'Loja fechada com sucesso!' });
            
        } catch (error) {
            console.error('❌ Erro:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // ABRIR LOJA AGORA
    // ==========================================
    async abrirLojaAgora(req, res) {
        try {
            const { tenant_id = 1 } = req.body;
            
            await pool.query(`
                UPDATE horarios_funcionamento 
                SET aberto = true 
                WHERE tenant_id = $1 AND tipo = 'loja'
            `, [tenant_id]);
            
            res.json({ mensagem: 'Loja aberta com sucesso!' });
            
        } catch (error) {
            console.error('❌ Erro:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // ROTA DE TESTE
    // ==========================================
    async teste(req, res) {
        try {
            const pool = require('../config/database');
            
            // Verificar se a tabela existe
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'horarios_funcionamento'
                );
            `);
            
            if (!tableCheck.rows[0].exists) {
                return res.json({ 
                    status: 'tabela_nao_existe',
                    mensagem: 'Execute o script SQL para criar a tabela'
                });
            }
            
            const result = await pool.query('SELECT * FROM horarios_funcionamento LIMIT 5');
            
            res.json({ 
                status: 'ok',
                tabela_existe: true,
                registros: result.rows.length,
                dados: result.rows 
            });
            
        } catch (error) {
            res.status(500).json({ 
                status: 'erro',
                erro: error.message 
            });
        }
    }
};

module.exports = horarioController;