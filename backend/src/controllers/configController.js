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
            if (tenantQuery.rows.length === 0) return res.status(404).json({ erro: 'Loja não encontrada' });
            
            const tenantId = tenantQuery.rows[0].id;

            // Lista oficial de colunas permitidas (Evita falhas SQL)
            const whitelist = ['nome_loja', 'slogan', 'horario_funcionamento', 'endereco_completo', 'whatsapp', 'cep_loja', 'km_maximo_entrega', 'taxa_minima', 'taxa_por_km', 'frete_gratis_ativo', 'frete_gratis_acima', 'mensagem_banner_ativo', 'mensagem_banner', 'mensagem_banner_icone', 'mensagem_banner_cor', 'mensagem_banner_texto', 'logo_url', 'horarios', 'horarios_delivery', 'cor_principal', 'mensagem_km_excedido'];
            
            // Pega apenas as chaves que a tela enviou
            const camposParaAtualizar = Object.keys(dados).filter(key => whitelist.includes(key));
            if (camposParaAtualizar.length === 0) return res.json({ mensagem: 'Nenhum dado válido para atualizar.' });

            const existe = await pool.query('SELECT id FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);

            if (existe.rows.length > 0) {
                // ATUALIZAÇÃO DINÂMICA (Atualiza APENAS o que foi enviado)
                const setClause = camposParaAtualizar.map((campo, index) => `${campo} = $${index + 1}`).join(', ');
                const values = camposParaAtualizar.map(campo => dados[campo]);
                values.push(tenantId); // O último parâmetro é o ID

                await pool.query(`UPDATE configuracoes_loja SET ${setClause} WHERE tenant_id = $${values.length}`, values);
            } else {
                // CRIAÇÃO INICIAL DINÂMICA
                const camposComTenant = [...camposParaAtualizar, 'tenant_id'];
                const placeholders = camposComTenant.map((_, index) => `$${index + 1}`).join(', ');
                const values = camposParaAtualizar.map(campo => dados[campo]);
                values.push(tenantId);

                await pool.query(`INSERT INTO configuracoes_loja (${camposComTenant.join(', ')}) VALUES (${placeholders})`, values);
            }
            
            res.json({ mensagem: 'Salvo com sucesso absoluto!' });
        } catch (error) { 
            console.error("Erro Backend:", error);
            res.status(500).json({ erro: error.message }); 
        }
    }
};
module.exports = configController;