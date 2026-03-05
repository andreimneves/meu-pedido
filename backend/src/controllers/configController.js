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
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            const configQuery = await pool.query('SELECT * FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);
            
            if (configQuery.rows.length === 0) {
                return res.json({ tenant_id: tenantId });
            }
            
            res.json(configQuery.rows[0]);
        } catch (error) { 
            console.error('Erro ao buscar configurações:', error);
            res.status(500).json({ erro: error.message }); 
        }
    },

    async atualizarConfiguracoes(req, res) {
        try {
            await garantirColunas();
            const { subdominio } = req.params;
            const dadosEnviados = req.body;
            
            console.log('📥 Dados recebidos:', dadosEnviados);
            
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;

            // Verificar se já existe registro
            const existe = await pool.query('SELECT * FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);

            if (existe.rows.length > 0) {
                // Buscar dados atuais
                const dadosAtuais = existe.rows[0];
                
                // Merge dos dados (preserva o que não foi enviado)
                const dadosCompletos = { ...dadosAtuais, ...dadosEnviados };
                
                // Remover campos que não devem ser atualizados
                delete dadosCompletos.id;
                delete dadosCompletos.tenant_id;
                
                // Construir UPDATE com todos os campos
                const campos = Object.keys(dadosCompletos);
                const setClause = campos.map((campo, index) => `${campo} = $${index + 1}`).join(', ');
                const valores = campos.map(campo => dadosCompletos[campo]);
                valores.push(tenantId);
                
                const sql = `UPDATE configuracoes_loja SET ${setClause} WHERE tenant_id = $${campos.length + 1}`;
                
                console.log('📝 SQL:', sql);
                console.log('📊 Valores:', valores);
                
                await pool.query(sql, valores);
                
                // Buscar dados atualizados
                const configAtualizada = await pool.query('SELECT * FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);
                
                res.json({ 
                    mensagem: 'Configurações guardadas com sucesso!',
                    dados: configAtualizada.rows[0]
                });
                
            } else {
                // INSERT para primeira vez
                const campos = [...Object.keys(dadosEnviados), 'tenant_id'];
                const placeholders = campos.map((_, i) => `$${i + 1}`).join(', ');
                const valores = [...Object.values(dadosEnviados), tenantId];
                
                const sql = `INSERT INTO configuracoes_loja (${campos.join(', ')}) VALUES (${placeholders})`;
                await pool.query(sql, valores);
                
                res.json({ mensagem: 'Configurações iniciais salvas com sucesso!' });
            }
            
        } catch(e) { 
            console.error("❌ ERRO CRÍTICO:", e);
            res.status(500).json({ erro: e.message }); 
        }
    }
};

module.exports = configController;