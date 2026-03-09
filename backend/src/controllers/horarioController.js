const pool = require('../config/database');

const horarioController = {
    // ==========================================
    // LISTAR HORÁRIOS (para o painel admin)
    // ==========================================
    listar: async (req, res) => {
        try {
            const { tenant_id = 1 } = req.query;
            
            console.log('🔍 Buscando horários para tenant:', tenant_id);
            
            const result = await pool.query(`
                SELECT 
                    dias.dia_semana,
                    dias.nome_dia,
                    COALESCE(loja.aberto, true) as loja_aberta,
                    COALESCE(loja.abre, '18:00') as loja_abre,
                    COALESCE(loja.fecha, '23:00') as loja_fecha,
                    COALESCE(delivery.aberto, true) as delivery_aberto,
                    COALESCE(delivery.abre, '18:00') as delivery_abre,
                    COALESCE(delivery.fecha, '23:00') as delivery_fecha
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
    // ATUALIZAR HORÁRIOS EM LOTE (VERSÃO CORRIGIDA)
    // ==========================================
    atualizarLote: async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const { horarios, tenant_id = 1 } = req.body;
            
            console.log('📝 Recebidos para atualização:', horarios.length, 'registros');
            
            for (const h of horarios) {
                // GARANTIR APENAS HH:MM (5 caracteres)
                const loja_abre = h.loja_abre ? h.loja_abre.substring(0,5) : '18:00';
                const loja_fecha = h.loja_fecha ? h.loja_fecha.substring(0,5) : '23:00';
                const delivery_abre = h.delivery_abre ? h.delivery_abre.substring(0,5) : '18:00';
                const delivery_fecha = h.delivery_fecha ? h.delivery_fecha.substring(0,5) : '23:00';
                
                console.log(`📌 Dia ${h.dia_semana}: Loja ${loja_abre}-${loja_fecha}, Delivery ${delivery_abre}-${delivery_fecha}`);
                
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
                `, [tenant_id, h.dia_semana, h.loja_aberta, loja_abre, loja_fecha]);
                
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
                `, [tenant_id, h.dia_semana, h.delivery_aberto, delivery_abre, delivery_fecha]);
            }
            
            await client.query('COMMIT');
            console.log('✅ Horários atualizados com sucesso!');
            res.json({ mensagem: 'Horários salvos com sucesso!' });
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro ao atualizar horários:', error);
            res.status(500).json({ erro: error.message });
        } finally {
            client.release();
        }
    },

    // ==========================================
    // VERIFICAR STATUS ATUAL (para o cliente)
    // ==========================================
    verificarStatus: async (req, res) => {
        try {
            const { subdominio } = req.params;
            const agora = new Date();
            const diaSemana = agora.getDay();
            const horaAtual = agora.getHours().toString().padStart(2,'0') + ':' + 
                             agora.getMinutes().toString().padStart(2,'0');
            
            console.log(`🔍 Verificando status para: ${subdominio}, dia: ${diaSemana}, hora: ${horaAtual}`);
            
            // Buscar tenant
            const tenant = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenant.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenant.rows[0].id;
            
            // Buscar horários de hoje
            const lojaQuery = await pool.query(
                `SELECT * FROM horarios_funcionamento 
                 WHERE tenant_id = $1 AND dia_semana = $2 AND tipo = 'loja'`,
                [tenantId, diaSemana]
            );
            
            const deliveryQuery = await pool.query(
                `SELECT * FROM horarios_funcionamento 
                 WHERE tenant_id = $1 AND dia_semana = $2 AND tipo = 'delivery'`,
                [tenantId, diaSemana]
            );
            
            const loja = lojaQuery.rows[0] || { 
                aberto: true, 
                abre: '18:00', 
                fecha: '23:00' 
            };
            
            const delivery = deliveryQuery.rows[0] || { 
                aberto: true, 
                abre: '18:00', 
                fecha: '23:00' 
            };
            
            function horaParaMinutos(hora) {
                const [h, m] = hora.split(':').map(Number);
                return h * 60 + (m || 0);
            }
            
            const agoraMin = horaParaMinutos(horaAtual);
            const lojaAbreMin = horaParaMinutos(loja.abre);
            const lojaFechaMin = horaParaMinutos(loja.fecha);
            const deliveryAbreMin = horaParaMinutos(delivery.abre);
            const deliveryFechaMin = horaParaMinutos(delivery.fecha);
            
            // Verificar se passa da meia-noite
            const lojaPassaMeiaNoite = lojaFechaMin < lojaAbreMin;
            const deliveryPassaMeiaNoite = deliveryFechaMin < deliveryAbreMin;
            
            // Status da loja
            let loja_aberta = false;
            let mensagem_loja = '';
            let proximoHorarioLoja = '';
            
            if (!loja.aberto) {
                mensagem_loja = 'Loja fechada hoje';
                // Buscar próximo dia aberto
                const proximoDia = await buscarProximoDiaAberto(tenantId, 'loja', diaSemana);
                proximoHorarioLoja = proximoDia ? `${proximoDia.nome_dia} às ${proximoDia.abre}` : 'Sem previsão';
            } else if (lojaPassaMeiaNoite) {
                if (agoraMin >= lojaAbreMin || agoraMin <= lojaFechaMin) {
                    loja_aberta = true;
                    mensagem_loja = '🟢 Loja aberta agora';
                } else {
                    mensagem_loja = `🔴 Fechada agora • Abre às ${loja.abre}`;
                    proximoHorarioLoja = `hoje às ${loja.abre}`;
                }
            } else {
                if (agoraMin >= lojaAbreMin && agoraMin <= lojaFechaMin) {
                    loja_aberta = true;
                    mensagem_loja = '🟢 Loja aberta agora';
                } else if (agoraMin < lojaAbreMin) {
                    mensagem_loja = `🔴 Fechada agora • Abre às ${loja.abre}`;
                    proximoHorarioLoja = `hoje às ${loja.abre}`;
                } else {
                    mensagem_loja = '🔴 Loja fechada hoje';
                    const proximoDia = await buscarProximoDiaAberto(tenantId, 'loja', diaSemana);
                    proximoHorarioLoja = proximoDia ? `${proximoDia.nome_dia} às ${proximoDia.abre}` : 'Sem previsão';
                }
            }
            
            // Status do delivery
            let delivery_aberto = false;
            let mensagem_delivery = '';
            let proximoHorarioDelivery = '';
            
            if (!delivery.aberto) {
                mensagem_delivery = 'Delivery fechado hoje';
                const proximoDia = await buscarProximoDiaAberto(tenantId, 'delivery', diaSemana);
                proximoHorarioDelivery = proximoDia ? `${proximoDia.nome_dia} às ${proximoDia.abre}` : 'Sem previsão';
            } else if (deliveryPassaMeiaNoite) {
                if (agoraMin >= deliveryAbreMin || agoraMin <= deliveryFechaMin) {
                    delivery_aberto = true;
                    mensagem_delivery = '🟢 Delivery disponível agora';
                } else {
                    mensagem_delivery = `🔴 Delivery indisponível • Abre às ${delivery.abre}`;
                    proximoHorarioDelivery = `hoje às ${delivery.abre}`;
                }
            } else {
                if (agoraMin >= deliveryAbreMin && agoraMin <= deliveryFechaMin) {
                    delivery_aberto = true;
                    mensagem_delivery = '🟢 Delivery disponível agora';
                } else if (agoraMin < deliveryAbreMin) {
                    mensagem_delivery = `🔴 Delivery indisponível • Abre às ${delivery.abre}`;
                    proximoHorarioDelivery = `hoje às ${delivery.abre}`;
                } else {
                    mensagem_delivery = '🔴 Delivery encerrado hoje';
                    const proximoDia = await buscarProximoDiaAberto(tenantId, 'delivery', diaSemana);
                    proximoHorarioDelivery = proximoDia ? `${proximoDia.nome_dia} às ${proximoDia.abre}` : 'Sem previsão';
                }
            }
            
            res.json({
                loja_aberta,
                delivery_aberto,
                pode_agendar: true,
                mensagem_loja,
                mensagem_delivery,
                horario_loja: `${loja.abre} às ${loja.fecha}`,
                horario_delivery: `${delivery.abre} às ${delivery.fecha}`,
                proximo_loja: proximoHorarioLoja,
                proximo_delivery: proximoHorarioDelivery
            });
            
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
            res.status(500).json({ 
                loja_aberta: true,
                delivery_aberto: true,
                erro: error.message 
            });
        }
    },

    // ==========================================
    // BUSCAR HORÁRIOS DISPONÍVEIS PARA AGENDAMENTO
    // ==========================================
    horariosDisponiveis: async (req, res) => {
        try {
            const { subdominio, tipo } = req.params;
            const { data } = req.query;
            
            const dataSelecionada = data ? new Date(data) : new Date();
            const diaSemana = dataSelecionada.getDay();
            
            // Buscar tenant
            const tenant = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenant.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenant.rows[0].id;
            
            // Buscar horário do dia
            const horarioQuery = await pool.query(
                `SELECT * FROM horarios_funcionamento 
                 WHERE tenant_id = $1 AND dia_semana = $2 AND tipo = $3`,
                [tenantId, diaSemana, tipo]
            );
            
            const horario = horarioQuery.rows[0];
            
            if (!horario || !horario.aberto) {
                return res.json({ 
                    disponivel: false, 
                    opcoes: [],
                    mensagem: 'Indisponível nesta data'
                });
            }
            
            // Gerar opções de horário de hora em hora
            const opcoes = [];
            const [abreH, abreM] = horario.abre.split(':').map(Number);
            const [fechaH, fechaM] = horario.fecha.split(':').map(Number);
            
            let horaInicio = abreH;
            let minutoInicio = abreM;
            let horaFim = fechaH;
            
            // Se for hoje, só mostrar horários futuros
            const hoje = new Date();
            if (dataSelecionada.toDateString() === hoje.toDateString()) {
                const horaAtual = hoje.getHours();
                const minutoAtual = hoje.getMinutes();
                
                if (horaAtual > abreH || (horaAtual === abreH && minutoAtual > abreM)) {
                    horaInicio = horaAtual + 1;
                    minutoInicio = 0;
                }
            }
            
            // Lidar com horários que passam da meia-noite
            if (fechaH < abreH) {
                horaFim += 24;
            }
            
            for (let h = horaInicio; h < horaFim; h++) {
                const hora = h % 24;
                const horaFormatada = `${hora.toString().padStart(2,'0')}:00`;
                const horaFimFormatada = `${(hora+1).toString().padStart(2,'0')}:00`;
                
                opcoes.push({
                    valor: horaFormatada,
                    texto: `${horaFormatada} às ${horaFimFormatada}`,
                    disponivel: true
                });
            }
            
            res.json({
                disponivel: true,
                data: dataSelecionada.toISOString().split('T')[0],
                tipo,
                opcoes
            });
            
        } catch (error) {
            console.error('❌ Erro ao buscar horários disponíveis:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // FECHAR LOJA AGORA
    // ==========================================
    fecharLojaAgora: async (req, res) => {
        try {
            const { tenant_id = 1 } = req.body;
            
            console.log('🔴 Fechando loja para tenant:', tenant_id);
            
            await pool.query(`
                UPDATE horarios_funcionamento 
                SET aberto = false 
                WHERE tenant_id = $1 AND tipo = 'loja'
            `, [tenant_id]);
            
            console.log('✅ Loja fechada com sucesso!');
            res.json({ mensagem: 'Loja fechada com sucesso!' });
            
        } catch (error) {
            console.error('❌ Erro ao fechar loja:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ==========================================
    // ABRIR LOJA AGORA
    // ==========================================
    abrirLojaAgora: async (req, res) => {
        try {
            const { tenant_id = 1 } = req.body;
            
            console.log('🟢 Abrindo loja para tenant:', tenant_id);
            
            await pool.query(`
                UPDATE horarios_funcionamento 
                SET aberto = true 
                WHERE tenant_id = $1 AND tipo = 'loja'
            `, [tenant_id]);
            
            console.log('✅ Loja aberta com sucesso!');
            res.json({ mensagem: 'Loja aberta com sucesso!' });
            
        } catch (error) {
            console.error('❌ Erro ao abrir loja:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

// Função auxiliar para buscar próximo dia aberto
async function buscarProximoDiaAberto(tenantId, tipo, diaAtual) {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    for (let i = 1; i <= 7; i++) {
        const dia = (diaAtual + i) % 7;
        const result = await pool.query(
            `SELECT * FROM horarios_funcionamento 
             WHERE tenant_id = $1 AND dia_semana = $2 AND tipo = $3 AND aberto = true`,
            [tenantId, dia, tipo]
        );
        
        if (result.rows.length > 0) {
            return {
                dia_semana: dia,
                nome_dia: dias[dia],
                abre: result.rows[0].abre
            };
        }
    }
    return null;
}

module.exports = horarioController;