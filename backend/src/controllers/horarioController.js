const pool = require('../config/database');

const horarioController = {
    // ===== BUSCAR HORÁRIOS =====
    async buscarHorarios(req, res) {
        try {
            const { subdominio } = req.params;
            
            console.log('🔍 Buscando horários para:', subdominio);
            
            // Buscar tenant
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Buscar horários da tabela específica
            const horariosQuery = await pool.query(
                'SELECT * FROM horarios_delivery WHERE tenant_id = $1 ORDER BY dia_semana',
                [tenantId]
            );
            
            console.log(`✅ Encontrados ${horariosQuery.rows.length} horários`);
            res.json(horariosQuery.rows);
            
        } catch (error) {
            console.error('❌ Erro ao buscar horários:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // ===== ATUALIZAR HORÁRIOS =====
    async atualizarHorarios(req, res) {
        const client = await pool.connect();
        
        try {
            const { subdominio } = req.params;
            const horariosRecebidos = req.body; // Array direto
            
            console.log('📦 Horários recebidos:', JSON.stringify(horariosRecebidos, null, 2));
            
            // Validação básica
            if (!Array.isArray(horariosRecebidos)) {
                return res.status(400).json({ 
                    erro: 'Formato inválido. Esperado um array de horários.' 
                });
            }
            
            if (horariosRecebidos.length !== 7) {
                return res.status(400).json({ 
                    erro: 'É necessário enviar horários para os 7 dias da semana.' 
                });
            }
            
            // Buscar tenant
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            await client.query('BEGIN');
            
            // Opção 1: Substituir todos os horários (mais simples)
            await client.query('DELETE FROM horarios_delivery WHERE tenant_id = $1', [tenantId]);
            
            // Inserir os novos horários
            for (const h of horariosRecebidos) {
                // Validar cada horário
                if (h.dia_semana === undefined || h.dia_semana < 0 || h.dia_semana > 6) {
                    throw new Error(`Dia da semana inválido: ${h.dia_semana}`);
                }
                
                // Garantir formato HH:MM:SS
                let abertura = h.abertura;
                let fechamento = h.fechamento;
                
                if (abertura && abertura.length === 5) abertura += ':00';
                if (fechamento && fechamento.length === 5) fechamento += ':00';
                
                await client.query(
                    `INSERT INTO horarios_delivery 
                     (tenant_id, dia_semana, aberto, abertura, fechamento, created_at, updated_at)
                     VALUES ($1, $2, $3, $4::time, $5::time, NOW(), NOW())`,
                    [tenantId, h.dia_semana, h.aberto, abertura, fechamento]
                );
            }
            
            await client.query('COMMIT');
            
            // Buscar os horários atualizados
            const horariosAtualizados = await pool.query(
                'SELECT * FROM horarios_delivery WHERE tenant_id = $1 ORDER BY dia_semana',
                [tenantId]
            );
            
            console.log('✅ Horários salvos com sucesso!');
            
            res.json({ 
                mensagem: 'Horários salvos com sucesso!',
                horarios: horariosAtualizados.rows
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro ao atualizar horários:', error);
            res.status(500).json({ 
                erro: error.message,
                detalhe: 'Erro ao processar a requisição'
            });
        } finally {
            client.release();
        }
    },

    // ===== VERIFICAR DISPONIBILIDADE =====
    async verificarDisponibilidade(req, res) {
        try {
            const { subdominio } = req.params;
            
            console.log('🔍 Verificando disponibilidade para:', subdominio);
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            const agora = new Date();
            const diaSemana = agora.getDay(); // 0 = Domingo, 1 = Segunda, ...
            const horaAtual = agora.getHours() * 60 + agora.getMinutes();
            
            const horarioQuery = await pool.query(
                'SELECT * FROM horarios_delivery WHERE tenant_id = $1 AND dia_semana = $2',
                [tenantId, diaSemana]
            );
            
            if (horarioQuery.rows.length === 0) {
                return res.json({ 
                    disponivel: false,
                    pode_agendar: true,
                    mensagem: 'Horário não configurado. Por favor, agende seu pedido.'
                });
            }
            
            const hoje = horarioQuery.rows[0];
            
            if (!hoje.aberto) {
                return res.json({ 
                    disponivel: false,
                    pode_agendar: true,
                    mensagem: 'Fechado hoje. Você pode agendar seu pedido.'
                });
            }
            
            // Converter horários para minutos
            const abertura = this._horaParaMinutos(hoje.abertura);
            let fechamento = this._horaParaMinutos(hoje.fechamento);
            
            // Ajustar se passar da meia-noite
            if (fechamento < abertura) {
                fechamento += 24 * 60;
            }
            
            const disponivel = horaAtual >= abertura && horaAtual <= fechamento;
            
            const mensagem = disponivel 
                ? 'Delivery disponível agora!' 
                : `Fora do horário (${hoje.abertura.substring(0,5)} às ${hoje.fechamento.substring(0,5)})`;
            
            res.json({
                disponivel,
                pode_agendar: true,
                mensagem,
                horario_hoje: `${hoje.abertura.substring(0,5)} às ${hoje.fechamento.substring(0,5)}`
            });
            
        } catch (error) {
            console.error('❌ Erro:', error);
            res.status(500).json({ 
                disponivel: true,
                pode_agendar: true,
                erro: error.message
            });
        }
    },

    // ===== FUNÇÃO AUXILIAR =====
    _horaParaMinutos(horaStr) {
        if (!horaStr) return 0;
        const partes = horaStr.split(':');
        return (parseInt(partes[0]) || 0) * 60 + (parseInt(partes[1]) || 0);
    }
};

module.exports = horarioController;