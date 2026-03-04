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
    async buscarConfiguracoes(req, res) {
        try {
            await garantirColunas();
            const { subdominio } = req.params;
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) return res.status(404).json({ erro: 'Loja não encontrada' });

            const configQuery = await pool.query('SELECT * FROM configuracoes_loja WHERE tenant_id = $1', [tenantQuery.rows[0].id]);
            if (configQuery.rows.length === 0) return res.json({ tenant_id: tenantQuery.rows[0].id });
            res.json(configQuery.rows[0]);
        } catch (error) { res.status(500).json({ erro: error.message }); }
    },

    async atualizarConfiguracoes(req, res) {
        try {
            await garantirColunas();
            const { subdominio } = req.params;
            const dadosEnviados = req.body;
            
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) return res.status(404).json({ erro: 'Loja não encontrada' });
            
            const tenantId = tenantQuery.rows[0].id;
            const existe = await pool.query('SELECT * FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);
            const atual = existe.rows.length > 0 ? existe.rows[0] : {};

            // MESCLAGEM BLINDADA: Se a tela não enviou um dado (ex: Horários), ele mantém o que já estava no banco!
            const nome_loja = dadosEnviados.nome_loja !== undefined ? dadosEnviados.nome_loja : (atual.nome_loja || '');
            const slogan = dadosEnviados.slogan !== undefined ? dadosEnviados.slogan : (atual.slogan || '');
            const horario_funcionamento = dadosEnviados.horario_funcionamento !== undefined ? dadosEnviados.horario_funcionamento : (atual.horario_funcionamento || '');
            const endereco_completo = dadosEnviados.endereco_completo !== undefined ? dadosEnviados.endereco_completo : (atual.endereco_completo || '');
            const whatsapp = dadosEnviados.whatsapp !== undefined ? dadosEnviados.whatsapp : (atual.whatsapp || '');
            const cep_loja = dadosEnviados.cep_loja !== undefined ? dadosEnviados.cep_loja : (atual.cep_loja || '');
            const km_maximo_entrega = dadosEnviados.km_maximo_entrega !== undefined ? dadosEnviados.km_maximo_entrega : (atual.km_maximo_entrega || 15);
            const mensagem_km_excedido = dadosEnviados.mensagem_km_excedido !== undefined ? dadosEnviados.mensagem_km_excedido : (atual.mensagem_km_excedido || '');
            const cor_principal = dadosEnviados.cor_principal !== undefined ? dadosEnviados.cor_principal : (atual.cor_principal || '#C83232');
            const taxa_por_km = dadosEnviados.taxa_por_km !== undefined ? dadosEnviados.taxa_por_km : (atual.taxa_por_km || 0);
            const taxa_minima = dadosEnviados.taxa_minima !== undefined ? dadosEnviados.taxa_minima : (atual.taxa_minima || 0);
            const frete_gratis_ativo = dadosEnviados.frete_gratis_ativo !== undefined ? dadosEnviados.frete_gratis_ativo : (atual.frete_gratis_ativo || false);
            const frete_gratis_acima = dadosEnviados.frete_gratis_acima !== undefined ? dadosEnviados.frete_gratis_acima : (atual.frete_gratis_acima || 0);
            
            const banner_ativo = dadosEnviados.mensagem_banner_ativo !== undefined ? dadosEnviados.mensagem_banner_ativo : (atual.mensagem_banner_ativo || false);
            const banner_texto = dadosEnviados.mensagem_banner !== undefined ? dadosEnviados.mensagem_banner : (atual.mensagem_banner || '');
            const banner_cor = dadosEnviados.mensagem_banner_cor !== undefined ? dadosEnviados.mensagem_banner_cor : (atual.mensagem_banner_cor || '#FFF3E0');
            const banner_cor_txt = dadosEnviados.mensagem_banner_texto !== undefined ? dadosEnviados.mensagem_banner_texto : (atual.mensagem_banner_texto || '#E65100');
            const banner_icone = dadosEnviados.mensagem_banner_icone !== undefined ? dadosEnviados.mensagem_banner_icone : (atual.mensagem_banner_icone || '📢');
            const logo_url = dadosEnviados.logo_url !== undefined ? dadosEnviados.logo_url : (atual.logo_url || '');
            
            const horarios = dadosEnviados.horarios !== undefined ? dadosEnviados.horarios : (atual.horarios || '');
            const horarios_delivery = dadosEnviados.horarios_delivery !== undefined ? dadosEnviados.horarios_delivery : (atual.horarios_delivery || '');

            if (existe.rows.length > 0) {
                await pool.query(
                    `UPDATE configuracoes_loja SET
                        nome_loja = $1, slogan = $2, horario_funcionamento = $3, endereco_completo = $4, whatsapp = $5, cep_loja = $6,
                        km_maximo_entrega = $7, mensagem_km_excedido = $8, cor_principal = $9, taxa_por_km = $10, taxa_minima = $11,
                        frete_gratis_ativo = $12, frete_gratis_acima = $13, mensagem_banner_ativo = $14, mensagem_banner = $15,
                        mensagem_banner_cor = $16, mensagem_banner_texto = $17, mensagem_banner_icone = $18, logo_url = $19,
                        horarios = $20, horarios_delivery = $21
                    WHERE tenant_id = $22`,
                    [ nome_loja, slogan, horario_funcionamento, endereco_completo, whatsapp, cep_loja, km_maximo_entrega, mensagem_km_excedido, cor_principal, taxa_por_km, taxa_minima, frete_gratis_ativo, frete_gratis_acima, banner_ativo, banner_texto, banner_cor, banner_cor_txt, banner_icone, logo_url, horarios, horarios_delivery, tenantId ]
                );
            } else {
                await pool.query(
                    `INSERT INTO configuracoes_loja (tenant_id, nome_loja, slogan, horario_funcionamento, endereco_completo, whatsapp, cep_loja, km_maximo_entrega, mensagem_km_excedido, cor_principal, taxa_por_km, taxa_minima, frete_gratis_ativo, frete_gratis_acima, mensagem_banner_ativo, mensagem_banner, mensagem_banner_cor, mensagem_banner_texto, mensagem_banner_icone, logo_url, horarios, horarios_delivery) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
                    [ tenantId, nome_loja, slogan, horario_funcionamento, endereco_completo, whatsapp, cep_loja, km_maximo_entrega, mensagem_km_excedido, cor_principal, taxa_por_km, taxa_minima, frete_gratis_ativo, frete_gratis_acima, banner_ativo, banner_texto, banner_cor, banner_cor_txt, banner_icone, logo_url, horarios, horarios_delivery ]
                );
            }
            res.json({ mensagem: 'Salvo com sucesso!' });
        } catch (error) { res.status(500).json({ erro: error.message }); }
    }
};
module.exports = configController;