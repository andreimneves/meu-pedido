const pool = require('../config/database');

const horarioController = {
    // ==========================================
    // LISTAR HORÁRIOS (para o painel admin)
    // ==========================================
    async listar(req, res) {
        try {
            const { tenant_id = 1 } = req.query;
            
            // Buscar horários da loja e delivery em uma única query
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
            
            res.json(result.rows);
        } catch (error) {
            console.error('❌ Erro ao listar horários:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // ATUALIZAR HORÁRIOS (em lote)
    // ==========================================
    async atualizarLote(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const { horarios, tenant_id = 1 } = req.body;
            
            for (const h of horarios) {
                // Atualizar loja
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
                
                // Atualizar delivery
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
            res.json({ mensagem: 'Horários atualizados com sucesso!' });
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro ao atualizar horários:', error);
            res.status(500).json({ erro: error.message });
        } finally {
            client.release();
        }
    },

    // ==========================================
    // VERIFICAR STATUS DA LOJA (para o site)
    // ==========================================
    async verificarStatus(req, res) {
        try {
            const { subdominio = 'dlcrepes' } = req.params;
            const agora = new Date();
            const diaSemana = agora.getDay();
            const horaAtual = agora.toTimeString().slice(0,5); // HH:MM
            
            // Buscar tenant_id pelo subdomínio
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Buscar horários de hoje
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
            
            const h = horarios.rows[0];
            
            // Função para comparar horários
            const horaAtualMinutos = horaAtual.split(':').reduce((h,m) => h*60 + parseInt(m));
            
            const lojaAbreMinutos = h.loja_abre.split(':').reduce((h,m) => h*60 + parseInt(m));
            const lojaFechaMinutos = h.loja_fecha.split(':').reduce((h,m) => h*60 + parseInt(m));
            
            const deliveryAbreMinutos = h.delivery_abre.split(':').reduce((h,m) => h*60 + parseInt(m));
            const deliveryFechaMinutos = h.delivery_fecha.split(':').reduce((h,m) => h*60 + parseInt(m));
            
            // Verificar se passou da meia-noite
            const lojaAbreHoje = lojaAbreMinutos <= lojaFechaMinutos;
            const deliveryAbreHoje = deliveryAbreMinutos <= deliveryFechaMinutos;
            
            // Status da loja
            let lojaAberta = false;
            let deliveryAberto = false;
            let mensagemLoja = '';
            let mensagemDelivery = '';
            
            if (!h.loja_aberta) {
                mensagemLoja = 'Loja fechada hoje';
            } else if (lojaAbreHoje) {
                // Horário normal (abre e fecha no mesmo dia)
                if (horaAtualMinutos >= lojaAbreMinutos && horaAtualMinutos <= lojaFechaMinutos) {
                    lojaAberta = true;
                    mensagemLoja = 'Loja aberta';
                } else if (horaAtualMinutos < lojaAbreMinutos) {
                    mensagemLoja = `Abre às ${h.loja_abre}`;
                } else {
                    mensagemLoja = 'Loja fechada';
                }
            } else {
                // Horário que passa da meia-noite (ex: 18:00 às 02:00)
                if (horaAtualMinutos >= lojaAbreMinutos || horaAtualMinutos <= lojaFechaMinutos) {
                    lojaAberta = true;
                    mensagemLoja = 'Loja aberta';
                } else {
                    mensagemLoja = `Abre às ${h.loja_abre}`;
                }
            }
            
            // Status do delivery (mesma lógica)
            if (!h.delivery_aberto) {
                mensagemDelivery = 'Delivery fechado hoje';
            } else if (deliveryAbreHoje) {
                if (horaAtualMinutos >= deliveryAbreMinutos && horaAtualMinutos <= deliveryFechaMinutos) {
                    deliveryAberto = true;
                    mensagemDelivery = 'Delivery disponível';
                } else if (horaAtualMinutos < deliveryAbreMinutos) {
                    mensagemDelivery = `Delivery abre às ${h.delivery_abre}`;
                } else {
                    mensagemDelivery = 'Delivery encerrado';
                }
            } else {
                if (horaAtualMinutos >= deliveryAbreMinutos || horaAtualMinutos <= deliveryFechaMinutos) {
                    deliveryAberto = true;
                    mensagemDelivery = 'Delivery disponível';
                } else {
                    mensagemDelivery = `Delivery abre às ${h.delivery_abre}`;
                }
            }
            
            res.json({
                loja_aberta: lojaAberta,
                delivery_aberto: deliveryAberto,
                pode_agendar: true, // Sempre pode agendar
                mensagem_loja: mensagemLoja,
                mensagem_delivery: mensagemDelivery,
                horario_loja: h.loja_abre && h.loja_fecha ? `${h.loja_abre} às ${h.loja_fecha}` : '18:00 às 23:00',
                horario_delivery: h.delivery_abre && h.delivery_fecha ? `${h.delivery_abre} às ${h.delivery_fecha}` : '18:00 às 23:00'
            });
            
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // FECHAR LOJA AGORA (botão de emergência)
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
            console.error('❌ Erro ao fechar loja:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // ABRIR LOJA AGORA (botão de emergência)
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
            console.error('❌ Erro ao abrir loja:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = horarioController;