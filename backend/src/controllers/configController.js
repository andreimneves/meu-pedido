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
    for (let sql of colunas) {
        await pool.query(sql).catch(e => {}); 
    }
}

const configController = {
    async buscarConfiguracoes(req, res) {
        try {
            await garantirColunas();
            const { subdominio } = req.params;
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) return res.status(404).json({ erro: 'Estabelecimento não encontrado' });

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
            const dados = req.body;
            
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            
            const tenantId = tenantQuery.rows[0].id;
            const existe = await pool.query('SELECT * FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);
            const atual = existe.rows.length > 0 ? existe.rows[0] : {};

            // MESCLAGEM INTELIGENTE: Se o frontend não enviou algo, mantém o que já estava no banco!
            const nome_loja = dados.nome_loja !== undefined ? dados.nome_loja : (atual.nome_loja || '');
            const slogan = dados.slogan !== undefined ? dados.slogan : (atual.slogan || '');
            const horario_funcionamento = dados.horario_funcionamento !== undefined ? dados.horario_funcionamento : (atual.horario_funcionamento || 'Seg a Dom: 18h às 23h');
            const endereco_completo = dados.endereco_completo !== undefined ? dados.endereco_completo : (atual.endereco_completo || '');
            const whatsapp = dados.whatsapp !== undefined ? dados.whatsapp : (atual.whatsapp || '');
            const cep_loja = dados.cep_loja !== undefined ? dados.cep_loja : (atual.cep_loja || '');
            const km_maximo_entrega = dados.km_maximo_entrega !== undefined ? dados.km_maximo_entrega : (atual.km_maximo_entrega || 15);
            const mensagem_km_excedido = dados.mensagem_km_excedido !== undefined ? dados.mensagem_km_excedido : (atual.mensagem_km_excedido || '');
            const cor_principal = dados.cor_principal !== undefined ? dados.cor_principal : (atual.cor_principal || '#C83232');
            const taxa_por_km = dados.taxa_por_km !== undefined ? dados.taxa_por_km : (atual.taxa_por_km || 0);
            const taxa_minima = dados.taxa_minima !== undefined ? dados.taxa_minima : (atual.taxa_minima || 0);
            const frete_gratis_ativo = dados.frete_gratis_ativo !== undefined ? dados.frete_gratis_ativo : (atual.frete_gratis_ativo !== false);
            const frete_gratis_acima = dados.frete_gratis_acima !== undefined ? dados.frete_gratis_acima : (atual.frete_gratis_acima || 0);
            
            const banner_ativo = dados.mensagem_banner_ativo !== undefined ? dados.mensagem_banner_ativo : (atual.mensagem_banner_ativo || false);
            const banner_texto = dados.mensagem_banner !== undefined ? dados.mensagem_banner : (atual.mensagem_banner || '');
            const banner_cor = dados.mensagem_banner_cor !== undefined ? dados.mensagem_banner_cor : (atual.mensagem_banner_cor || '#FFF3E0');
            const banner_cor_txt = dados.mensagem_banner_texto !== undefined ? dados.mensagem_banner_texto : (atual.mensagem_banner_texto || '#E65100');
            const banner_icone = dados.mensagem_banner_icone !== undefined ? dados.mensagem_banner_icone : (atual.mensagem_banner_icone || '📢');
            const logo_url = dados.logo_url !== undefined ? dados.logo_url : (atual.logo_url || '');
            
            const horarios = dados.horarios !== undefined ? dados.horarios : (atual.horarios || '');
            const horarios_delivery = dados.horarios_delivery !== undefined ? dados.horarios_delivery : (atual.horarios_delivery || '');

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
            res.json({ mensagem: 'Configurações guardadas com sucesso!' });
        } catch (error) { res.status(500).json({ erro: error.message }); }
    }
};
module.exports = configController;