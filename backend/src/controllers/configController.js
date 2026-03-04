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
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS frete_gratis_ativo BOOLEAN DEFAULT false;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS frete_gratis_acima NUMERIC DEFAULT 0;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS taxa_minima NUMERIC DEFAULT 0;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS taxa_por_km NUMERIC DEFAULT 0;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS km_maximo_entrega NUMERIC DEFAULT 15;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_km_excedido TEXT;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS cor_principal VARCHAR(50) DEFAULT '#C83232';",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS logo_url TEXT;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS endereco_completo TEXT;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS cep_loja VARCHAR(20);",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS slogan VARCHAR(255);",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS nome_loja VARCHAR(255);"
    ];
    for (let sql of colunas) { 
        try { await pool.query(sql); } catch(e) {}
    }
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
            const dadosEnviados = req.body; // O pacote exato que a tela manda
            
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) return res.status(404).json({ erro: 'Loja não encontrada' });
            
            const tenantId = tenantQuery.rows[0].id;

            // LISTA DE TODAS AS COLUNAS EXISTENTES
            const colunasPermitidas = [
                'nome_loja', 'slogan', 'horario_funcionamento', 'endereco_completo',
                'whatsapp', 'cep_loja', 'km_maximo_entrega', 'mensagem_km_excedido',
                'cor_principal', 'taxa_por_km', 'taxa_minima', 'frete_gratis_ativo',
                'frete_gratis_acima', 'mensagem_banner_ativo', 'mensagem_banner',
                'mensagem_banner_cor', 'mensagem_banner_texto', 'mensagem_banner_icone',
                'logo_url', 'horarios', 'horarios_delivery'
            ];

            // A MÁGICA: Extrai APENAS o que o painel enviou. Ignora o resto.
            const dadosParaAtualizar = {};
            for (let chave of colunasPermitidas) {
                if (dadosEnviados[chave] !== undefined) {
                    dadosParaAtualizar[chave] = dadosEnviados[chave];
                }
            }

            const chaves = Object.keys(dadosParaAtualizar);
            if (chaves.length === 0) return res.json({ mensagem: 'Nenhum dado enviado para atualizar.' });

            const existe = await pool.query('SELECT id FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);

            if (existe.rows.length > 0) {
                // UPDATE DINÂMICO: Se você mandar 3 itens, ele monta um UPDATE de 3 itens. O resto fica salvo!
                const setClause = chaves.map((chave, index) => `${chave} = $${index + 1}`).join(', ');
                const values = chaves.map(chave => dadosParaAtualizar[chave]);
                values.push(tenantId); // Adiciona o ID no final

                const sql = `UPDATE configuracoes_loja SET ${setClause} WHERE tenant_id = $${values.length}`;
                await pool.query(sql, values);
            } else {
                // INSERT DINÂMICO (Para a primeira vez)
                const campos = [...chaves, 'tenant_id'];
                const placeholders = campos.map((_, i) => `$${i + 1}`).join(', ');
                const values = chaves.map(chave => dadosParaAtualizar[chave]);
                values.push(tenantId);

                const sql = `INSERT INTO configuracoes_loja (${campos.join(', ')}) VALUES (${placeholders})`;
                await pool.query(sql, values);
            }

            res.json({ mensagem: 'Salvo com sucesso absoluto!' });
        } catch(e) { 
            console.error("ERRO SQL:", e);
            res.status(500).json({ erro: e.message }); 
        }
    }
};
module.exports = configController;