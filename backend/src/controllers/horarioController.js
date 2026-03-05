const pool = require('../config/database');

const horarioController = {
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
            
            const configQuery = await pool.query(
                'SELECT horarios, horarios_delivery, horario_funcionamento FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );
            
            if (configQuery.rows.length === 0) {
                return res.json({
                    horarios: '{}',
                    horarios_delivery: '{}',
                    horario_funcionamento: 'Seg a Dom: 18h às 23h'
                });
            }
            
            res.json({
                horarios: configQuery.rows[0].horarios || '{}',
                horarios_delivery: configQuery.rows[0].horarios_delivery || '{}',
                horario_funcionamento: configQuery.rows[0].horario_funcionamento || 'Seg a Dom: 18h às 23h'
            });
            
        } catch (error) {
            console.error('❌ Erro ao buscar horários:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    async atualizarHorarios(req, res) {
        try {
            const { subdominio } = req.params;
            const dados = req.body;
            
            console.log('📝 Recebendo dados para atualização:');
            console.log('Subdomínio:', subdominio);
            console.log('Dados completos:', JSON.stringify(dados, null, 2));
            
            if (!dados) {
                return res.status(400).json({ erro: 'Nenhum dado recebido' });
            }
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            let horarios = dados.horarios;
            let horarios_delivery = dados.horarios_delivery;
            let horario_funcionamento = dados.horario_funcionamento;
            
            // Garantir que são strings
            if (horarios && typeof horarios === 'object') {
                horarios = JSON.stringify(horarios);
            }
            if (horarios_delivery && typeof horarios_delivery === 'object') {
                horarios_delivery = JSON.stringify(horarios_delivery);
            }
            
            console.log('📦 Processado:');
            console.log('- horarios:', horarios ? horarios.substring(0, 100) + '...' : 'null');
            console.log('- horarios_delivery:', horarios_delivery ? horarios_delivery.substring(0, 100) + '...' : 'null');
            console.log('- horario_funcionamento:', horario_funcionamento);
            
            const existe = await pool.query(
                'SELECT id FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );
            
            if (existe.rows.length > 0) {
                const updates = [];
                const values = [];
                let paramCount = 1;
                
                if (horarios !== undefined) {
                    updates.push(`horarios = $${paramCount}`);
                    values.push(horarios);
                    paramCount++;
                }
                if (horarios_delivery !== undefined) {
                    updates.push(`horarios_delivery = $${paramCount}`);
                    values.push(horarios_delivery);
                    paramCount++;
                }
                if (horario_funcionamento !== undefined) {
                    updates.push(`horario_funcionamento = $${paramCount}`);
                    values.push(horario_funcionamento);
                    paramCount++;
                }
                
                if (updates.length === 0) {
                    return res.json({ mensagem: 'Nenhum dado para atualizar' });
                }
                
                values.push(tenantId);
                const sql = `UPDATE configuracoes_loja SET ${updates.join(', ')} WHERE tenant_id = $${paramCount}`;
                
                console.log('📝 SQL:', sql);
                console.log('📊 Valores:', values);
                
                await pool.query(sql, values);
                
            } else {
                const campos = ['tenant_id'];
                const placeholders = ['$1'];
                const values = [tenantId];
                let paramCount = 2;
                
                if (horarios !== undefined) {
                    campos.push('horarios');
                    placeholders.push(`$${paramCount}`);
                    values.push(horarios);
                    paramCount++;
                }
                if (horarios_delivery !== undefined) {
                    campos.push('horarios_delivery');
                    placeholders.push(`$${paramCount}`);
                    values.push(horarios_delivery);
                    paramCount++;
                }
                if (horario_funcionamento !== undefined) {
                    campos.push('horario_funcionamento');
                    placeholders.push(`$${paramCount}`);
                    values.push(horario_funcionamento);
                    paramCount++;
                }
                
                const sql = `INSERT INTO configuracoes_loja (${campos.join(', ')}) VALUES (${placeholders.join(', ')})`;
                
                console.log('📝 SQL:', sql);
                console.log('📊 Valores:', values);
                
                await pool.query(sql, values);
            }
            
            res.json({ 
                mensagem: '✅ Horários salvos com sucesso!',
                recebido: dados
            });
            
        } catch (error) {
            console.error('❌ ERRO DETALHADO:', error);
            res.status(500).json({ 
                erro: error.message,
                stack: error.stack
            });
        }
    },

    async verificarDisponibilidade(req, res) {
        try {
            const { subdominio } = req.params;
            const { tipo, data } = req.body;
            
            console.log(`🔍 Verificando disponibilidade: ${subdominio}, ${tipo}, ${data || 'agora'}`);
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            const configQuery = await pool.query(
                'SELECT horarios, horarios_delivery FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );
            
            if (configQuery.rows.length === 0) {
                return res.json({ 
                    disponivel: true, 
                    pode_agendar: true,
                    opcoes_horario: gerarOpcoesPadrao()
                });
            }
            
            let horariosStr;
            if (tipo === 'delivery') {
                horariosStr = configQuery.rows[0].horarios_delivery;
            } else {
                horariosStr = configQuery.rows[0].horarios;
            }
            
            let horarios = {};
            if (horariosStr) {
                try {
                    horarios = typeof horariosStr === 'string' ? JSON.parse(horariosStr) : horariosStr;
                } catch (e) {
                    console.error('Erro ao parsear horários:', e);
                }
            }
            
            const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
            
            if (!data) {
                const agora = new Date();
                const diaAtual = dias[agora.getDay()];
                const horaAtual = agora.getHours() * 60 + agora.getMinutes();
                
                const configHoje = horarios[diaAtual];
                
                if (!configHoje || String(configHoje.ativo) !== 'true') {
                    return res.json({ 
                        disponivel: false, 
                        pode_agendar: true,
                        mensagem: `Fechado agora. Agende para outro horário.`
                    });
                }
                
                const [hAbre, mAbre] = (configHoje.abertura || '18:00').split(':').map(Number);
                const [hFecha, mFecha] = (configHoje.fechamento || '23:00').split(':').map(Number);
                
                const aberturaMin = hAbre * 60 + (mAbre || 0);
                let fechamentoMin = hFecha * 60 + (mFecha || 0);
                
                if (fechamentoMin < aberturaMin) {
                    fechamentoMin += 24 * 60;
                }
                
                const disponivel = horaAtual >= aberturaMin && horaAtual <= fechamentoMin;
                
                return res.json({
                    disponivel,
                    pode_agendar: true,
                    mensagem: disponivel ? 'Disponível agora' : 'Fechado agora',
                    horario_hoje: `${configHoje.abertura || '18:00'} às ${configHoje.fechamento || '23:00'}`
                });
            }
            
            const dataObj = new Date(data + 'T12:00:00');
            const diaNome = dias[dataObj.getDay()];
            const configDia = horarios[diaNome];
            
            const disponivel = configDia && String(configDia.ativo) === 'true';
            
            let opcoes = [];
            if (disponivel) {
                opcoes = gerarOpcoesHorario(
                    configDia.abertura || '18:00',
                    configDia.fechamento || '23:00',
                    dataObj.toDateString() === new Date().toDateString()
                );
            }
            
            res.json({
                disponivel,
                pode_agendar: disponivel,
                opcoes_horario: opcoes,
                mensagem: disponivel ? 'Disponível' : 'Fechado neste dia'
            });
            
        } catch (error) {
            console.error('❌ Erro ao verificar disponibilidade:', error);
            res.status(500).json({ 
                erro: error.message, 
                disponivel: true,
                pode_agendar: true 
            });
        }
    }
};

function gerarOpcoesHorario(aberturaStr, fechamentoStr, isHoje) {
    const opcoes = [];
    
    let [hAbre, mAbre] = aberturaStr.split(':').map(Number);
    let [hFecha, mFecha] = fechamentoStr.split(':').map(Number);
    
    let minAbre = hAbre * 60 + (mAbre || 0);
    let minFecha = hFecha * 60 + (mFecha || 0);
    
    if (minFecha < minAbre) {
        minFecha += 24 * 60;
    }
    
    if (isHoje) {
        const agora = new Date();
        const minAgora = agora.getHours() * 60 + agora.getMinutes();
        if (minAgora > minAbre) {
            minAbre = Math.ceil(minAgora / 60) * 60;
        }
    }
    
    for (let m = minAbre; m < minFecha; m += 60) {
        const hInicio = Math.floor(m / 60) % 24;
        const mInicio = m % 60;
        const hFim = Math.floor((m + 60) / 60) % 24;
        const mFim = (m + 60) % 60;
        
        opcoes.push({
            valor: `${String(hInicio).padStart(2, '0')}:${String(mInicio).padStart(2, '0')}`,
            texto: `${String(hInicio).padStart(2, '0')}:${String(mInicio).padStart(2, '0')} às ${String(hFim).padStart(2, '0')}:${String(mFim).padStart(2, '0')}`
        });
    }
    
    return opcoes;
}

function gerarOpcoesPadrao() {
    const opcoes = [];
    for (let h = 18; h < 23; h++) {
        opcoes.push({
            valor: `${String(h).padStart(2, '0')}:00`,
            texto: `${String(h).padStart(2, '0')}:00 às ${String(h+1).padStart(2, '0')}:00`
        });
    }
    return opcoes;
}

module.exports = horarioController;