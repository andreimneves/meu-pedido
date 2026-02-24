// backend/src/controllers/horarioController.js
const pool = require('../config/database');

const horarioController = {
    // Buscar horários de funcionamento do delivery
    async buscarHorarios(req, res) {
        try {
            const { subdominio } = req.params;
            
            console.log('🔍 Buscando horários para:', subdominio);
            
            // Buscar tenant pelo subdomínio
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Tentar buscar da tabela de horários (se existir)
            try {
                const horariosQuery = await pool.query(
                    'SELECT * FROM horarios_delivery WHERE tenant_id = $1 ORDER BY dia_semana',
                    [tenantId]
                );
                
                if (horariosQuery.rows.length > 0) {
                    return res.json(horariosQuery.rows);
                }
            } catch (err) {
                console.log('Tabela horarios_delivery pode não existir ainda');
            }
            
            // Se não encontrar, retorna horários padrão
            const horariosPadrao = [
                { dia_semana: 0, nome: 'Domingo', aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia_semana: 1, nome: 'Segunda', aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia_semana: 2, nome: 'Terça', aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia_semana: 3, nome: 'Quarta', aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia_semana: 4, nome: 'Quinta', aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia_semana: 5, nome: 'Sexta', aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia_semana: 6, nome: 'Sábado', aberto: true, abertura: '18:00', fechamento: '23:00' }
            ];
            
            res.json(horariosPadrao);
            
        } catch (error) {
            console.error('❌ Erro ao buscar horários:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Atualizar horários de funcionamento
    async atualizarHorarios(req, res) {
        const client = await pool.connect();
        try {
            const { subdominio } = req.params;
            const { horarios } = req.body;
            
            console.log('📝 Atualizando horários para:', subdominio);
            console.log('📦 Dados recebidos:', horarios);
            
            await client.query('BEGIN');
            
            // Buscar tenant
            const tenantQuery = await client.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Verificar se a tabela existe, se não, criar
            try {
                await client.query(`
                    CREATE TABLE IF NOT EXISTS horarios_delivery (
                        id SERIAL PRIMARY KEY,
                        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                        dia_semana INTEGER NOT NULL,
                        aberto BOOLEAN DEFAULT true,
                        abertura TIME,
                        fechamento TIME,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(tenant_id, dia_semana)
                    )
                `);
            } catch (err) {
                console.log('Tabela já existe ou erro ao criar:', err.message);
            }
            
            // Para cada dia, inserir ou atualizar
            for (const h of horarios) {
                // Verificar se já existe registro para este dia
                const existe = await client.query(
                    'SELECT id FROM horarios_delivery WHERE tenant_id = $1 AND dia_semana = $2',
                    [tenantId, h.dia_semana]
                );
                
                if (existe.rows.length > 0) {
                    // Atualizar
                    await client.query(
                        `UPDATE horarios_delivery 
                         SET aberto = $1, abertura = $2, fechamento = $3, updated_at = NOW()
                         WHERE tenant_id = $4 AND dia_semana = $5`,
                        [h.aberto, h.abertura, h.fechamento, tenantId, h.dia_semana]
                    );
                } else {
                    // Inserir
                    await client.query(
                        `INSERT INTO horarios_delivery (tenant_id, dia_semana, aberto, abertura, fechamento)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [tenantId, h.dia_semana, h.aberto, h.abertura, h.fechamento]
                    );
                }
            }
            
            await client.query('COMMIT');
            
            res.json({ 
                mensagem: 'Horários atualizados com sucesso!',
                horarios: horarios
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro ao atualizar horários:', error);
            res.status(500).json({ erro: error.message });
        } finally {
            client.release();
        }
    },

    // Verificar disponibilidade atual do delivery
    async verificarDisponibilidade(req, res) {
        try {
            const { subdominio } = req.params;
            
            console.log('🔍 Verificando disponibilidade para:', subdominio);
            
            // Buscar tenant
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
            const horaAtual = agora.getHours() * 60 + agora.getMinutes(); // minutos desde meia-noite
            
            let disponivel = false;
            let mensagem = '';
            let proximoHorario = '';
            
            // Tentar buscar horário do dia atual
            try {
                const horarioQuery = await pool.query(
                    'SELECT * FROM horarios_delivery WHERE tenant_id = $1 AND dia_semana = $2',
                    [tenantId, diaSemana]
                );
                
                if (horarioQuery.rows.length > 0) {
                    const hoje = horarioQuery.rows[0];
                    
                    if (hoje.aberto) {
                        const abertura = this._horaParaMinutos(hoje.abertura);
                        const fechamento = this._horaParaMinutos(hoje.fechamento);
                        
                        if (horaAtual >= abertura && horaAtual <= fechamento) {
                            disponivel = true;
                            mensagem = `✅ Delivery disponível agora (${hoje.abertura} às ${hoje.fechamento})`;
                        } else {
                            mensagem = `⏰ Delivery indisponível agora. Horário de hoje: ${hoje.abertura} às ${hoje.fechamento}`;
                            
                            // Calcular próximo horário
                            if (horaAtual < abertura) {
                                proximoHorario = hoje.abertura;
                            } else {
                                // Procurar próximo dia
                                proximoHorario = this._proximoHorario(tenantId, diaSemana);
                            }
                        }
                    } else {
                        mensagem = '🚫 Delivery fechado hoje';
                        proximoHorario = this._proximoHorario(tenantId, diaSemana);
                    }
                } else {
                    // Horário padrão se não encontrar configuração
                    const horariosPadrao = {
                        abertura: '18:00',
                        fechamento: '23:00'
                    };
                    
                    const abertura = this._horaParaMinutos('18:00');
                    const fechamento = this._horaParaMinutos('23:00');
                    
                    if (horaAtual >= abertura && horaAtual <= fechamento) {
                        disponivel = true;
                        mensagem = '✅ Delivery disponível agora (horário padrão: 18h às 23h)';
                    } else {
                        mensagem = '⏰ Delivery indisponível agora. Horário padrão: 18h às 23h';
                        proximoHorario = '18:00';
                    }
                }
            } catch (err) {
                console.log('Erro ao buscar horários, usando padrão:', err.message);
                
                // Fallback para horário padrão
                const abertura = 18 * 60; // 18:00 em minutos
                const fechamento = 23 * 60; // 23:00 em minutos
                
                if (horaAtual >= abertura && horaAtual <= fechamento) {
                    disponivel = true;
                    mensagem = '✅ Delivery disponível agora (horário padrão)';
                } else {
                    mensagem = '⏰ Delivery indisponível agora (horário padrão: 18h às 23h)';
                    proximoHorario = '18:00';
                }
            }
            
            res.json({
                disponivel: disponivel,
                mensagem: mensagem,
                pode_agendar: true,
                proximo_horario: proximoHorario,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Erro ao verificar disponibilidade:', error);
            res.status(500).json({ 
                disponivel: false,
                erro: error.message,
                mensagem: 'Erro ao verificar disponibilidade'
            });
        }
    },

    // Função auxiliar para converter hora string para minutos
    _horaParaMinutos(horaStr) {
        if (!horaStr) return 0;
        const [h, m] = horaStr.split(':').map(Number);
        return h * 60 + (m || 0);
    },

    // Função auxiliar para encontrar próximo horário disponível
    async _proximoHorario(tenantId, diaAtual) {
        try {
            // Buscar próximos 7 dias
            for (let i = 1; i <= 7; i++) {
                const dia = (diaAtual + i) % 7;
                const horario = await pool.query(
                    'SELECT * FROM horarios_delivery WHERE tenant_id = $1 AND dia_semana = $2 AND aberto = true',
                    [tenantId, dia]
                );
                
                if (horario.rows.length > 0) {
                    const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
                    return `${horario.rows[0].abertura} de ${diasSemana[dia]}`;
                }
            }
            return '18:00 (horário padrão)';
        } catch (err) {
            return '18:00 (horário padrão)';
        }
    }
};

module.exports = horarioController;