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
            
            // Buscar configurações
            const configQuery = await pool.query(
                'SELECT horarios, horarios_delivery, horario_funcionamento FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );
            
            if (configQuery.rows.length === 0) {
                // Criar registro padrão
                const horariosPadrao = {
                    horarios: JSON.stringify({
                        domingo: { ativo: true, abertura: '18:00', fechamento: '23:00' },
                        segunda: { ativo: true, abertura: '18:00', fechamento: '23:00' },
                        terca: { ativo: true, abertura: '18:00', fechamento: '23:00' },
                        quarta: { ativo: true, abertura: '18:00', fechamento: '23:00' },
                        quinta: { ativo: true, abertura: '18:00', fechamento: '23:00' },
                        sexta: { ativo: true, abertura: '18:00', fechamento: '23:00' },
                        sabado: { ativo: true, abertura: '18:00', fechamento: '23:00' }
                    }),
                    horarios_delivery: JSON.stringify({
                        domingo: { ativo: true, abertura: '18:00', fechamento: '23:00' },
                        segunda: { ativo: true, abertura: '18:00', fechamento: '23:00' },
                        terca: { ativo: true, abertura: '18:00', fechamento: '23:00' },
                        quarta: { ativo: true, abertura: '18:00', fechamento: '23:00' },
                        quinta: { ativo: true, abertura: '18:00', fechamento: '23:00' },
                        sexta: { ativo: true, abertura: '18:00', fechamento: '23:00' },
                        sabado: { ativo: true, abertura: '18:00', fechamento: '23:00' }
                    }),
                    horario_funcionamento: 'Seg a Dom: 18h às 23h'
                };
                
                return res.json(horariosPadrao);
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

    // ===== ATUALIZAR HORÁRIOS =====
    async atualizarHorarios(req, res) {
        try {
            const { subdominio } = req.params;
            const { horarios, horarios_delivery, horario_funcionamento } = req.body;
            
            console.log('📝 Atualizando horários para:', subdominio);
            
            // Buscar tenant
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Verificar se já existe registro
            const existe = await pool.query(
                'SELECT id FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );
            
            if (existe.rows.length > 0) {
                // Atualizar apenas campos de horário
                await pool.query(
                    `UPDATE configuracoes_loja 
                     SET horarios = COALESCE($1, horarios),
                         horarios_delivery = COALESCE($2, horarios_delivery),
                         horario_funcionamento = COALESCE($3, horario_funcionamento)
                     WHERE tenant_id = $4`,
                    [horarios, horarios_delivery, horario_funcionamento, tenantId]
                );
            } else {
                // Inserir novo registro
                await pool.query(
                    `INSERT INTO configuracoes_loja (tenant_id, horarios, horarios_delivery, horario_funcionamento)
                     VALUES ($1, $2, $3, $4)`,
                    [tenantId, horarios, horarios_delivery, horario_funcionamento]
                );
            }
            
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
            const { tipo, data, horario } = req.body;
            
            // Buscar tenant
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Buscar configurações
            const configQuery = await pool.query(
                'SELECT horarios, horarios_delivery FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );
            
            if (configQuery.rows.length === 0) {
                return res.json({ disponivel: true, pode_agendar: true });
            }
            
            const horariosConfig = tipo === 'delivery' 
                ? configQuery.rows[0].horarios_delivery 
                : configQuery.rows[0].horarios;
            
            // Se não tem configuração, considera sempre disponível
            if (!horariosConfig) {
                return res.json({ disponivel: true, pode_agendar: true });
            }
            
            let mapaHorarios;
            try {
                mapaHorarios = typeof horariosConfig === 'string' 
                    ? JSON.parse(horariosConfig) 
                    : horariosConfig;
            } catch (e) {
                mapaHorarios = {};
            }
            
            const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
            const agora = new Date();
            
            // Se não tem data específica, verifica agora
            if (!data) {
                const diaAtual = dias[agora.getDay()];
                const horaAtual = agora.getHours() * 60 + agora.getMinutes();
                
                const configHoje = mapaHorarios[diaAtual];
                
                if (!configHoje || String(configHoje.ativo) !== 'true') {
                    return res.json({ 
                        disponivel: false, 
                        pode_agendar: true,
                        mensagem: `Fechado agora. Agende para outro horário.`,
                        proximos_horarios: gerarProximosHorarios(mapaHorarios, diaAtual, horaAtual)
                    });
                }
                
                const [hAbre, mAbre] = (configHoje.abertura || '18:00').split(':').map(Number);
                const [hFecha, mFecha] = (configHoje.fechamento || '23:00').split(':').map(Number);
                
                const aberturaMin = hAbre * 60 + (mAbre || 0);
                let fechamentoMin = hFecha * 60 + (mFecha || 0);
                
                // Ajusta se passar da meia-noite
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
            
            // Verifica disponibilidade para data específica
            const dataObj = new Date(data + 'T12:00:00');
            const diaNome = dias[dataObj.getDay()];
            const configDia = mapaHorarios[diaNome];
            
            const disponivel = configDia && String(configDia.ativo) === 'true';
            
            // Gera opções de horário para o dia
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
            res.status(500).json({ erro: error.message, disponivel: false });
        }
    }
};

// Funções auxiliares
function gerarProximosHorarios(mapaHorarios, diaAtual, horaAtual) {
    const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const proximos = [];
    
    let diasPercorridos = 0;
    let indexAtual = dias.indexOf(diaAtual);
    
    while (proximos.length < 3 && diasPercorridos < 7) {
        const diaCheck = dias[(indexAtual + diasPercorridos) % 7];
        const config = mapaHorarios[diaCheck];
        
        if (config && String(config.ativo) === 'true') {
            const [hAbre] = (config.abertura || '18:00').split(':').map(Number);
            
            if (diasPercorridos === 0) {
                // Hoje, mas depois do horário atual
                if (horaAtual < hAbre * 60) {
                    proximos.push({
                        dia: diaCheck,
                        data: new Date(new Date().setHours(hAbre, 0, 0, 0)).toISOString(),
                        horario: config.abertura
                    });
                }
            } else {
                // Próximos dias
                const data = new Date();
                data.setDate(data.getDate() + diasPercorridos);
                proximos.push({
                    dia: diaCheck,
                    data: data.toISOString().split('T')[0],
                    horario: config.abertura
                });
            }
        }
        diasPercorridos++;
    }
    
    return proximos;
}

function gerarOpcoesHorario(aberturaStr, fechamentoStr, isHoje) {
    const opcoes = [];
    
    let [hAbre, mAbre] = aberturaStr.split(':').map(Number);
    let [hFecha, mFecha] = fechamentoStr.split(':').map(Number);
    
    let minAbre = hAbre * 60 + (mAbre || 0);
    let minFecha = hFecha * 60 + (mFecha || 0);
    
    if (minFecha < minAbre) {
        minFecha += 24 * 60;
    }
    
    // Se for hoje, começa do horário atual ou próximo
    if (isHoje) {
        const agora = new Date();
        const minAgora = agora.getHours() * 60 + agora.getMinutes();
        if (minAgora > minAbre) {
            minAbre = Math.ceil(minAgora / 60) * 60;
        }
    }
    
    // Gera blocos de 1 hora
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

module.exports = horarioController;