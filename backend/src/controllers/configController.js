// backend/src/controllers/configController.js
const pool = require('../config/database');

const configController = {
    async buscarConfiguracoes(req, res) {
        try {
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
            const { subdominio } = req.params;
            const d = req.body; // Pega o pacote completo que o Frontend montou
            
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) return res.status(404).json({ erro: 'Loja não encontrada' });
            const tenantId = tenantQuery.rows[0].id;
            
            const existe = await pool.query('SELECT id FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);

            // Garante que não vem nulo
            const nome_loja = d.nome_loja !== undefined ? d.nome_loja : '';
            const slogan = d.slogan !== undefined ? d.slogan : '';
            const horario_funcionamento = d.horario_funcionamento !== undefined ? d.horario_funcionamento : 'Seg a Dom: 18h às 23h';
            const endereco_completo = d.endereco_completo !== undefined ? d.endereco_completo : '';
            const whatsapp = d.whatsapp !== undefined ? d.whatsapp : '';
            const cep_loja = d.cep_loja !== undefined ? d.cep_loja : '';
            const km_maximo_entrega = d.km_maximo_entrega !== undefined ? d.km_maximo_entrega : 15;
            const mensagem_km_excedido = d.mensagem_km_excedido !== undefined ? d.mensagem_km_excedido : '';
            const cor_principal = d.cor_principal !== undefined ? d.cor_principal : '#C83232';
            const taxa_por_km = d.taxa_por_km !== undefined ? d.taxa_por_km : 0;
            const taxa_minima = d.taxa_minima !== undefined ? d.taxa_minima : 0;
            const frete_gratis_ativo = d.frete_gratis_ativo !== undefined ? d.frete_gratis_ativo : false;
            const frete_gratis_acima = d.frete_gratis_acima !== undefined ? d.frete_gratis_acima : 0;
            const mensagem_banner_ativo = d.mensagem_banner_ativo !== undefined ? d.mensagem_banner_ativo : false;
            const mensagem_banner = d.mensagem_banner !== undefined ? d.mensagem_banner : '';
            const mensagem_banner_cor = d.mensagem_banner_cor !== undefined ? d.mensagem_banner_cor : '#FFF3E0';
            const mensagem_banner_texto = d.mensagem_banner_texto !== undefined ? d.mensagem_banner_texto : '#E65100';
            const mensagem_banner_icone = d.mensagem_banner_icone !== undefined ? d.mensagem_banner_icone : '📢';
            const logo_url = d.logo_url !== undefined ? d.logo_url : '';
            const horarios = d.horarios !== undefined ? d.horarios : '{}';
            const horarios_delivery = d.horarios_delivery !== undefined ? d.horarios_delivery : '{}';

            if (existe.rows.length > 0) {
                await pool.query(
                    `UPDATE configuracoes_loja SET
                        nome_loja = $1, slogan = $2, horario_funcionamento = $3, endereco_completo = $4, whatsapp = $5, cep_loja = $6,
                        km_maximo_entrega = $7, mensagem_km_excedido = $8, cor_principal = $9, taxa_por_km = $10, taxa_minima = $11,
                        frete_gratis_ativo = $12, frete_gratis_acima = $13, mensagem_banner_ativo = $14, mensagem_banner = $15,
                        mensagem_banner_cor = $16, mensagem_banner_texto = $17, mensagem_banner_icone = $18, logo_url = $19,
                        horarios = $20, horarios_delivery = $21
                    WHERE tenant_id = $22`,
                    [nome_loja, slogan, horario_funcionamento, endereco_completo, whatsapp, cep_loja, km_maximo_entrega, mensagem_km_excedido, cor_principal, taxa_por_km, taxa_minima, frete_gratis_ativo, frete_gratis_acima, mensagem_banner_ativo, mensagem_banner, mensagem_banner_cor, mensagem_banner_texto, mensagem_banner_icone, logo_url, horarios, horarios_delivery, tenantId]
                );
            } else {
                await pool.query(
                    `INSERT INTO configuracoes_loja (
                        tenant_id, nome_loja, slogan, horario_funcionamento, endereco_completo, whatsapp, cep_loja, km_maximo_entrega, mensagem_km_excedido, 
                        cor_principal, taxa_por_km, taxa_minima, frete_gratis_ativo, frete_gratis_acima, mensagem_banner_ativo, 
                        mensagem_banner, mensagem_banner_cor, mensagem_banner_texto, mensagem_banner_icone, logo_url, horarios, horarios_delivery
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
                    [tenantId, nome_loja, slogan, horario_funcionamento, endereco_completo, whatsapp, cep_loja, km_maximo_entrega, mensagem_km_excedido, cor_principal, taxa_por_km, taxa_minima, frete_gratis_ativo, frete_gratis_acima, mensagem_banner_ativo, mensagem_banner, mensagem_banner_cor, mensagem_banner_texto, mensagem_banner_icone, logo_url, horarios, horarios_delivery]
                );
            }
            return res.json({ mensagem: 'Tudo salvo perfeitamente!' });
        } catch(e) { res.status(500).json({ erro: e.message }); }
    }
};
module.exports = configController;