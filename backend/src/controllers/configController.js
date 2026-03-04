// backend/src/controllers/configController.js
const pool = require('../config/database');

async function garantirColunas() {
    const colunas = [
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

            if (configQuery.rows.length === 0) {
                return res.json({ tenant_id: tenantId });
            }
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

            if (existe.rows.length > 0) {
                await pool.query(
                    `UPDATE configuracoes_loja SET
                        nome_loja = $1, slogan = $2, horario_funcionamento = $3,
                        endereco_completo = $4, whatsapp = $5, cep_loja = $6,
                        km_maximo_entrega = $7, cor_principal = $8, taxa_por_km = $9, 
                        taxa_minima = $10, frete_gratis_ativo = $11, frete_gratis_acima = $12,
                        mensagem_banner_ativo = $13, mensagem_banner = $14,
                        mensagem_banner_cor = $15, mensagem_banner_texto = $16,
                        mensagem_banner_icone = $17, logo_url = $18,
                        horarios = $19, horarios_delivery = $20
                    WHERE tenant_id = $21`,
                    [
                        dados.nome_loja, dados.slogan, dados.horario_funcionamento,
                        dados.endereco_completo, dados.whatsapp, dados.cep_loja,
                        dados.km_maximo_entrega, dados.cor_principal, dados.taxa_por_km, 
                        dados.taxa_minima, dados.frete_gratis_ativo, dados.frete_gratis_acima,
                        dados.mensagem_banner_ativo, dados.mensagem_banner,
                        dados.mensagem_banner_cor, dados.mensagem_banner_texto,
                        dados.mensagem_banner_icone, dados.logo_url,
                        dados.horarios, dados.horarios_delivery, tenantId
                    ]
                );
            } else {
                await pool.query(
                    `INSERT INTO configuracoes_loja (
                        tenant_id, nome_loja, slogan, horario_funcionamento,
                        endereco_completo, whatsapp, cep_loja, km_maximo_entrega,
                        cor_principal, taxa_por_km, taxa_minima, frete_gratis_ativo, frete_gratis_acima,
                        mensagem_banner_ativo, mensagem_banner, mensagem_banner_cor,
                        mensagem_banner_texto, mensagem_banner_icone, logo_url,
                        horarios, horarios_delivery
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
                    [
                        tenantId, dados.nome_loja, dados.slogan, dados.horario_funcionamento,
                        dados.endereco_completo, dados.whatsapp, dados.cep_loja,
                        dados.km_maximo_entrega, dados.cor_principal, dados.taxa_por_km, 
                        dados.taxa_minima, dados.frete_gratis_ativo, dados.frete_gratis_acima,
                        dados.mensagem_banner_ativo, dados.mensagem_banner,
                        dados.mensagem_banner_cor, dados.mensagem_banner_texto,
                        dados.mensagem_banner_icone, dados.logo_url,
                        dados.horarios, dados.horarios_delivery
                    ]
                );
            }
            res.json({ mensagem: 'Configurações guardadas com sucesso!' });
        } catch (error) { res.status(500).json({ erro: error.message }); }
    }
};
module.exports = configController;