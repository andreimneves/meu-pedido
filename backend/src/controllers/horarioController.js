// backend/src/controllers/horarioController.js
const pool = require('../config/database');

const horarioController = {
    // ===== BUSCAR HORÁRIOS =====
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
            
            // Tentar buscar da tabela de horários
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
                { dia_semana: 0, aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia_semana: 1, aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia_semana: 2, aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia_semana: 3, aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia_semana: 4, aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia_semana: 5, aberto: true, abertura: '18:00', fechamento: '23:00' },
                { dia_semana: 6, aberto: true, abertura: '18:00', fechamento: '23:00' }
            ];
            
            res.json(horariosPadrao);
            
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
            const { horarios } = req.body;
            
            console.log('📝 Atualizando horários para:', subdominio);
            console.log('📦 Dados recebidos:', horarios);
            
            if (!horarios || !Array.isArray(horarios)) {
                return res.status(400).json({ erro: 'Formato de horários inválido' });
            }
            
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
            
            // Para cada dia, inserir ou atualizar
            for (const h of horarios) {
                if (h.dia_semana === undefined) continue;
                
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
                        [h.aberto || false, h.abertura || '18:00', h.fechamento || '23:00', tenantId, h.dia_semana]
                    );
                } else {
                    // Inserir
                    await client.query(
                        `INSERT INTO horarios_delivery (tenant_id, dia_semana, aberto, abertura, fechamento)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [tenantId, h.dia_semana, h.aberto || false, h.abertura || '18:00', h.fechamento || '23:00']
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

    // ===== VERIFICAR DISPONIBILIDADE =====
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
            const diaSemana = agora.getDay();
            const horaAtual = agora.getHours() * 60 + agora.getMinutes();
            
            let disponivel = false;
            let mensagem = '';
            
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
                            mensagem = 'Delivery disponível agora';
                        } else {
                            mensagem = `Delivery indisponível agora. Horário: ${hoje.abertura} às ${hoje.fechamento}`;
                        }
                    } else {
                        mensagem = 'Delivery fechado hoje';
                    }
                } else {
                    // Horário padrão
                    const abertura = 18 * 60;
                    const fechamento = 23 * 60;
                    
                    if (horaAtual >= abertura && horaAtual <= fechamento) {
                        disponivel = true;
                        mensagem = 'Delivery disponível agora (horário padrão)';
                    } else {
                        mensagem = 'Delivery indisponível agora (horário padrão: 18h às 23h)';
                    }
                }
            } catch (err) {
                console.log('Erro ao buscar horários, usando padrão:', err.message);
                
                const abertura = 18 * 60;
                const fechamento = 23 * 60;
                
                if (horaAtual >= abertura && horaAtual <= fechamento) {
                    disponivel = true;
                    mensagem = 'Delivery disponível agora (horário padrão)';
                } else {
                    mensagem = 'Delivery indisponível agora (horário padrão: 18h às 23h)';
                }
            }
            
            res.json({
                disponivel: disponivel,
                mensagem: mensagem,
                pode_agendar: true
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
    }
};

module.exports = horarioController;