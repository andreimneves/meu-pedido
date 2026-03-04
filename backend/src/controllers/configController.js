// backend/src/controllers/configController.js
const pool = require('../config/database');

async function garantirColunas() {
    const colunas = [
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS horario_funcionamento VARCHAR(255);",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS horarios TEXT;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS horarios_delivery TEXT;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_banner_ativo BOOLEAN DEFAULT false;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_banner TEXT;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_banner_cor VARCHAR(50) DEFAULT '#FFF3E0';",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_banner_texto VARCHAR(50) DEFAULT '#E65100';",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_banner_icone VARCHAR(20) DEFAULT '📢';"
    ];
    for (let sql of colunas) { await pool.query(sql).catch(e => {}); }
}

const configController = {
    // 1. BUSCAR TUDO (Lido pelo Cliente e pelo Admin)
    async buscarConfiguracoes(req, res) {
        try {
            await garantirColunas();
            const { subdominio } = req.params;
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) return res.status(404).json({ erro: 'Loja não encontrada' });

            const tenantId = tenantQuery.rows[0].id;
            const configQuery = await pool.query('SELECT * FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);

            if (configQuery.rows.length === 0) return res.json({ tenant_id: tenantId });
            res.json(configQuery.rows[0]);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    // 2. ATUALIZAR APENAS AS CONFIGURAÇÕES GERAIS
    async atualizarGeral(req, res) {
        try {
            await garantirColunas();
            const { subdominio } = req.params;
            const d = req.body;
            
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) return res.status(404).json({ erro: 'Loja não encontrada' });
            const tenantId = tenantQuery.rows[0].id;
            
            const existe = await pool.query('SELECT id FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);

            if (existe.rows.length > 0) {
                // ATUALIZA SÓ O GERAL (Nunca toca nos horários)
                await pool.query(
                    `UPDATE configuracoes_loja SET
                        nome_loja = $1, slogan = $2, endereco_completo = $3, whatsapp = $4, cep_loja = $5,
                        km_maximo_entrega = $6, mensagem_km_excedido = $7, cor_principal = $8, taxa_por_km = $9, taxa_minima = $10,
                        frete_gratis_ativo = $11, frete_gratis_acima = $12, mensagem_banner_ativo = $13, mensagem_banner = $14,
                        mensagem_banner_cor = $15, mensagem_banner_texto = $16, mensagem_banner_icone = $17, logo_url = $18
                    WHERE tenant_id = $19`,
                    [
                        d.nome_loja || '', d.slogan || '', d.endereco_completo || '', d.whatsapp || '', d.cep_loja || '',
                        d.km_maximo_entrega || 15, d.mensagem_km_excedido || '', d.cor_principal || '#C83232', d.taxa_por_km || 0, d.taxa_minima || 0,
                        d.frete_gratis_ativo !== false, d.frete_gratis_acima || 0, d.mensagem_banner_ativo || false, d.mensagem_banner || '',
                        d.mensagem_banner_cor || '#FFF3E0', d.mensagem_banner_texto || '#E65100', d.mensagem_banner_icone || '📢', d.logo_url || '',
                        tenantId
                    ]
                );
            } else {
                await pool.query(
                    `INSERT INTO configuracoes_loja (
                        tenant_id, nome_loja, slogan, endereco_completo, whatsapp, cep_loja, km_maximo_entrega, mensagem_km_excedido, 
                        cor_principal, taxa_por_km, taxa_minima, frete_gratis_ativo, frete_gratis_acima, mensagem_banner_ativo, 
                        mensagem_banner, mensagem_banner_cor, mensagem_banner_texto, mensagem_banner_icone, logo_url
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
                    [
                        tenantId, d.nome_loja || '', d.slogan || '', d.endereco_completo || '', d.whatsapp || '', d.cep_loja || '',
                        d.km_maximo_entrega || 15, d.mensagem_km_excedido || '', d.cor_principal || '#C83232', d.taxa_por_km || 0, d.taxa_minima || 0,
                        d.frete_gratis_ativo !== false, d.frete_gratis_acima || 0, d.mensagem_banner_ativo || false, d.mensagem_banner || '',
                        d.mensagem_banner_cor || '#FFF3E0', d.mensagem_banner_texto || '#E65100', d.mensagem_banner_icone || '📢', d.logo_url || ''
                    ]
                );
            }
            res.json({ mensagem: 'Configurações Gerais salvas com sucesso!' });
        } catch(e) { res.status(500).json({ erro: e.message }); }
    },

    // 3. ATUALIZAR APENAS OS HORÁRIOS E TEXTO RESUMO
    async atualizarHorarios(req, res) {
        try {
            await garantirColunas();
            const { subdominio } = req.params;
            const d = req.body;
            
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) return res.status(404).json({ erro: 'Loja não encontrada' });
            const tenantId = tenantQuery.rows[0].id;
            
            const existe = await pool.query('SELECT id FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);

            if (existe.rows.length > 0) {
                // ATUALIZA SÓ OS HORÁRIOS E TEXTO (Nunca toca na Mensagem Personalizada/Logo)
                await pool.query(
                    `UPDATE configuracoes_loja SET
                        horario_funcionamento = $1, horarios = $2, horarios_delivery = $3
                    WHERE tenant_id = $4`,
                    [d.horario_funcionamento || 'Seg a Dom: 18h às 23h', d.horarios || '{}', d.horarios_delivery || '{}', tenantId]
                );
            } else {
                await pool.query(
                    `INSERT INTO configuracoes_loja (tenant_id, horario_funcionamento, horarios, horarios_delivery) VALUES ($1, $2, $3, $4)`,
                    [tenantId, d.horario_funcionamento || 'Seg a Dom: 18h às 23h', d.horarios || '{}', d.horarios_delivery || '{}']
                );
            }
            res.json({ mensagem: 'Horários salvos com sucesso!' });
        } catch(e) { res.status(500).json({ erro: e.message }); }
    }
};
module.exports = configController;