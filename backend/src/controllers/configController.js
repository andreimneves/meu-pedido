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
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_banner_icone VARCHAR(20) DEFAULT '📢';",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_km_excedido TEXT;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS frete_gratis_ativo BOOLEAN DEFAULT true;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS frete_gratis_acima DECIMAL(10,2) DEFAULT 50.00;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS cor_principal VARCHAR(50) DEFAULT '#C83232';"
    ];
    for (let sql of colunas) {
        await pool.query(sql).catch(e => console.log("Aviso Migration:", e.message)); 
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

            // Mapeamento blindado de variáveis para garantir que recebe tudo do frontend
            const nome_loja = dados.nome_loja || '';
            const slogan = dados.slogan || '';
            const horario_funcionamento = dados.horario_funcionamento || '';
            const endereco_completo = dados.endereco_completo || '';
            const whatsapp = dados.whatsapp || '';
            const cep_loja = dados.cep_loja || '';
            const km_maximo_entrega = dados.km_maximo_entrega || 15;
            const mensagem_km_excedido = dados.mensagem_km_excedido || '';
            const cor_principal = dados.cor_principal || '#C83232';
            const taxa_por_km = dados.taxa_por_km || 0;
            const taxa_minima = dados.taxa_minima || 0;
            const frete_gratis_ativo = dados.frete_gratis_ativo !== false;
            const frete_gratis_acima = dados.frete_gratis_acima || 0;
            
            // Centralização das variáveis de Mensagem
            const banner_ativo = dados.mensagem_banner_ativo || dados.mensagem_ativa || false;
            const banner_texto = dados.mensagem_banner || dados.mensagem_texto || '';
            const banner_cor = dados.mensagem_banner_cor || '#FFF3E0';
            const banner_cor_txt = dados.mensagem_banner_texto || '#E65100';
            const banner_icone = dados.mensagem_banner_icone || '📢';
            const logo_url = dados.logo_url || '';
            
            // Centralização dos Horários JSON
            const horarios = dados.horarios || '';
            const horarios_delivery = dados.horarios_delivery || '';

            if (existe.rows.length > 0) {
                await pool.query(
                    `UPDATE configuracoes_loja SET
                        nome_loja = $1, slogan = $2, horario_funcionamento = $3,
                        endereco_completo = $4, whatsapp = $5, cep_loja = $6,
                        km_maximo_entrega = $7, mensagem_km_excedido = $8,
                        cor_principal = $9, taxa_por_km = $10, taxa_minima = $11,
                        frete_gratis_ativo = $12, frete_gratis_acima = $13,
                        mensagem_banner_ativo = $14, mensagem_banner = $15,
                        mensagem_banner_cor = $16, mensagem_banner_texto = $17,
                        mensagem_banner_icone = $18, logo_url = $19,
                        horarios = $20, horarios_delivery = $21
                    WHERE tenant_id = $22`,
                    [
                        nome_loja, slogan, horario_funcionamento,
                        endereco_completo, whatsapp, cep_loja,
                        km_maximo_entrega, mensagem_km_excedido,
                        cor_principal, taxa_por_km, taxa_minima,
                        frete_gratis_ativo, frete_gratis_acima,
                        banner_ativo, banner_texto,
                        banner_cor, banner_cor_txt,
                        banner_icone, logo_url,
                        horarios, horarios_delivery, tenantId
                    ]
                );
            } else {
                await pool.query(
                    `INSERT INTO configuracoes_loja (
                        tenant_id, nome_loja, slogan, horario_funcionamento,
                        endereco_completo, whatsapp, cep_loja, km_maximo_entrega,
                        mensagem_km_excedido, cor_principal, taxa_por_km, taxa_minima, frete_gratis_ativo, frete_gratis_acima,
                        mensagem_banner_ativo, mensagem_banner, mensagem_banner_cor,
                        mensagem_banner_texto, mensagem_banner_icone, logo_url,
                        horarios, horarios_delivery
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
                    [
                        tenantId, nome_loja, slogan, horario_funcionamento,
                        endereco_completo, whatsapp, cep_loja, km_maximo_entrega,
                        mensagem_km_excedido, cor_principal, taxa_por_km, taxa_minima, frete_gratis_ativo, frete_gratis_acima,
                        banner_ativo, banner_texto, banner_cor, banner_cor_txt,
                        banner_icone, logo_url, horarios, horarios_delivery
                    ]
                );
            }
            res.json({ mensagem: 'Configurações guardadas com sucesso!' });
        } catch (error) { 
            console.error("ERRO GRAVE AO SALVAR: ", error);
            res.status(500).json({ erro: error.message }); 
        }
    }
};
module.exports = configController;