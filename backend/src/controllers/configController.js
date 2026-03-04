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

    async atualizarConfiguracoes(req, res) {
        try {
            await garantirColunas();
            const { subdominio } = req.params;
            const d = req.body;
            
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) return res.status(404).json({ erro: 'Loja não encontrada' });
            
            const tenantId = tenantQuery.rows[0].id;
            const existe = await pool.query('SELECT * FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);
            const atual = existe.rows.length > 0 ? existe.rows[0] : {};

            // MESCLAGEM BLINDADA
            const obj = {
                nome_loja: d.hasOwnProperty('nome_loja') ? d.nome_loja : (atual.nome_loja || ''),
                slogan: d.hasOwnProperty('slogan') ? d.slogan : (atual.slogan || ''),
                horario_funcionamento: d.hasOwnProperty('horario_funcionamento') ? d.horario_funcionamento : (atual.horario_funcionamento || 'Seg a Dom: 18h às 23h'),
                endereco_completo: d.hasOwnProperty('endereco_completo') ? d.endereco_completo : (atual.endereco_completo || ''),
                whatsapp: d.hasOwnProperty('whatsapp') ? d.whatsapp : (atual.whatsapp || ''),
                cep_loja: d.hasOwnProperty('cep_loja') ? d.cep_loja : (atual.cep_loja || ''),
                km_maximo_entrega: d.hasOwnProperty('km_maximo_entrega') ? d.km_maximo_entrega : (atual.km_maximo_entrega || 15),
                mensagem_km_excedido: d.hasOwnProperty('mensagem_km_excedido') ? d.mensagem_km_excedido : (atual.mensagem_km_excedido || ''),
                cor_principal: d.hasOwnProperty('cor_principal') ? d.cor_principal : (atual.cor_principal || '#C83232'),
                taxa_por_km: d.hasOwnProperty('taxa_por_km') ? d.taxa_por_km : (atual.taxa_por_km || 0),
                taxa_minima: d.hasOwnProperty('taxa_minima') ? d.taxa_minima : (atual.taxa_minima || 0),
                frete_gratis_ativo: d.hasOwnProperty('frete_gratis_ativo') ? d.frete_gratis_ativo : (atual.frete_gratis_ativo || false),
                frete_gratis_acima: d.hasOwnProperty('frete_gratis_acima') ? d.frete_gratis_acima : (atual.frete_gratis_acima || 0),
                mensagem_banner_ativo: d.hasOwnProperty('mensagem_banner_ativo') ? d.mensagem_banner_ativo : (atual.mensagem_banner_ativo || false),
                mensagem_banner: d.hasOwnProperty('mensagem_banner') ? d.mensagem_banner : (atual.mensagem_banner || ''),
                mensagem_banner_cor: d.hasOwnProperty('mensagem_banner_cor') ? d.mensagem_banner_cor : (atual.mensagem_banner_cor || '#FFF3E0'),
                mensagem_banner_texto: d.hasOwnProperty('mensagem_banner_texto') ? d.mensagem_banner_texto : (atual.mensagem_banner_texto || '#E65100'),
                mensagem_banner_icone: d.hasOwnProperty('mensagem_banner_icone') ? d.mensagem_banner_icone : (atual.mensagem_banner_icone || '📢'),
                logo_url: d.hasOwnProperty('logo_url') ? d.logo_url : (atual.logo_url || ''),
                horarios: d.hasOwnProperty('horarios') ? d.horarios : (atual.horarios || '{}'),
                horarios_delivery: d.hasOwnProperty('horarios_delivery') ? d.horarios_delivery : (atual.horarios_delivery || '{}')
            };

            if (existe.rows.length > 0) {
                await pool.query(
                    `UPDATE configuracoes_loja SET
                        nome_loja=$1, slogan=$2, horario_funcionamento=$3, endereco_completo=$4, whatsapp=$5, cep_loja=$6,
                        km_maximo_entrega=$7, mensagem_km_excedido=$8, cor_principal=$9, taxa_por_km=$10, taxa_minima=$11,
                        frete_gratis_ativo=$12, frete_gratis_acima=$13, mensagem_banner_ativo=$14, mensagem_banner=$15,
                        mensagem_banner_cor=$16, mensagem_banner_texto=$17, mensagem_banner_icone=$18, logo_url=$19,
                        horarios=$20, horarios_delivery=$21
                    WHERE tenant_id=$22`,
                    [obj.nome_loja, obj.slogan, obj.horario_funcionamento, obj.endereco_completo, obj.whatsapp, obj.cep_loja, obj.km_maximo_entrega, obj.mensagem_km_excedido, obj.cor_principal, obj.taxa_por_km, obj.taxa_minima, obj.frete_gratis_ativo, obj.frete_gratis_acima, obj.mensagem_banner_ativo, obj.mensagem_banner, obj.mensagem_banner_cor, obj.mensagem_banner_texto, obj.mensagem_banner_icone, obj.logo_url, obj.horarios, obj.horarios_delivery, tenantId]
                );
            } else {
                await pool.query(
                    `INSERT INTO configuracoes_loja (tenant_id, nome_loja, slogan, horario_funcionamento, endereco_completo, whatsapp, cep_loja, km_maximo_entrega, mensagem_km_excedido, cor_principal, taxa_por_km, taxa_minima, frete_gratis_ativo, frete_gratis_acima, mensagem_banner_ativo, mensagem_banner, mensagem_banner_cor, mensagem_banner_texto, mensagem_banner_icone, logo_url, horarios, horarios_delivery) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
                    [tenantId, obj.nome_loja, obj.slogan, obj.horario_funcionamento, obj.endereco_completo, obj.whatsapp, obj.cep_loja, obj.km_maximo_entrega, obj.mensagem_km_excedido, obj.cor_principal, obj.taxa_por_km, obj.taxa_minima, obj.frete_gratis_ativo, obj.frete_gratis_acima, obj.mensagem_banner_ativo, obj.mensagem_banner, obj.mensagem_banner_cor, obj.mensagem_banner_texto, obj.mensagem_banner_icone, obj.logo_url, obj.horarios, obj.horarios_delivery]
                );
            }
            res.json({ mensagem: 'Salvo com sucesso!' });
        } catch(e) { res.status(500).json({ erro: e.message }); }
    }
};
module.exports = configController;