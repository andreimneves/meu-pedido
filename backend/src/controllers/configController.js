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
            
            // Buscar tenant
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Buscar configurações
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
            
            // Buscar tenant
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;

            // Verificar se já existe registro
            const existe = await pool.query('SELECT * FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);

            if (existe.rows.length > 0) {
                // MÉTODO SIMPLES E DIRETO: Update específico para cada campo
                // Vamos construir um UPDATE que só altera os campos enviados
                
                const updates = [];
                const values = [];
                let paramCount = 1;
                
                // Mapear todos os campos possíveis
                const campos = {
                    nome_loja: dadosEnviados.nome_loja,
                    slogan: dadosEnviados.slogan,
                    horario_funcionamento: dadosEnviados.horario_funcionamento,
                    endereco_completo: dadosEnviados.endereco_completo,
                    whatsapp: dadosEnviados.whatsapp,
                    cep_loja: dadosEnviados.cep_loja,
                    km_maximo_entrega: dadosEnviados.km_maximo_entrega,
                    mensagem_km_excedido: dadosEnviados.mensagem_km_excedido,
                    cor_principal: dadosEnviados.cor_principal,
                    taxa_por_km: dadosEnviados.taxa_por_km,
                    taxa_minima: dadosEnviados.taxa_minima,
                    frete_gratis_ativo: dadosEnviados.frete_gratis_ativo,
                    frete_gratis_acima: dadosEnviados.frete_gratis_acima,
                    mensagem_banner_ativo: dadosEnviados.mensagem_banner_ativo,
                    mensagem_banner: dadosEnviados.mensagem_banner,
                    mensagem_banner_cor: dadosEnviados.mensagem_banner_cor,
                    mensagem_banner_texto: dadosEnviados.mensagem_banner_texto,
                    mensagem_banner_icone: dadosEnviados.mensagem_banner_icone,
                    logo_url: dadosEnviados.logo_url,
                    horarios: dadosEnviados.horarios,
                    horarios_delivery: dadosEnviados.horarios_delivery
                };
                
                // Adicionar apenas campos que foram enviados (não undefined)
                for (const [campo, valor] of Object.entries(campos)) {
                    if (valor !== undefined) {
                        updates.push(`${campo} = $${paramCount}`);
                        values.push(valor);
                        paramCount++;
                    }
                }
                
                if (updates.length === 0) {
                    return res.json({ mensagem: 'Nenhum dado para atualizar' });
                }
                
                // Adicionar tenant_id no final
                values.push(tenantId);
                
                const sql = `UPDATE configuracoes_loja SET ${updates.join(', ')} WHERE tenant_id = $${paramCount}`;
                
                console.log('📝 SQL:', sql);
                console.log('📊 Valores:', values);
                
                await pool.query(sql, values);
                
                // Buscar e retornar os dados atualizados para confirmar
                const configAtualizada = await pool.query('SELECT * FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);
                
                res.json({ 
                    mensagem: '✅ Configurações salvas com sucesso!',
                    dados: configAtualizada.rows[0],
                    campos_atualizados: updates.map(u => u.split(' ')[0])
                });
                
            } else {
                // INSERT para primeira vez
                const campos = [];
                const placeholders = [];
                const values = [];
                let paramCount = 1;
                
                const camposInsert = {
                    nome_loja: dadosEnviados.nome_loja,
                    slogan: dadosEnviados.slogan,
                    horario_funcionamento: dadosEnviados.horario_funcionamento,
                    endereco_completo: dadosEnviados.endereco_completo,
                    whatsapp: dadosEnviados.whatsapp,
                    cep_loja: dadosEnviados.cep_loja,
                    km_maximo_entrega: dadosEnviados.km_maximo_entrega,
                    mensagem_km_excedido: dadosEnviados.mensagem_km_excedido,
                    cor_principal: dadosEnviados.cor_principal,
                    taxa_por_km: dadosEnviados.taxa_por_km,
                    taxa_minima: dadosEnviados.taxa_minima,
                    frete_gratis_ativo: dadosEnviados.frete_gratis_ativo,
                    frete_gratis_acima: dadosEnviados.frete_gratis_acima,
                    mensagem_banner_ativo: dadosEnviados.mensagem_banner_ativo,
                    mensagem_banner: dadosEnviados.mensagem_banner,
                    mensagem_banner_cor: dadosEnviados.mensagem_banner_cor,
                    mensagem_banner_texto: dadosEnviados.mensagem_banner_texto,
                    mensagem_banner_icone: dadosEnviados.mensagem_banner_icone,
                    logo_url: dadosEnviados.logo_url,
                    horarios: dadosEnviados.horarios,
                    horarios_delivery: dadosEnviados.horarios_delivery
                };
                
                for (const [campo, valor] of Object.entries(camposInsert)) {
                    if (valor !== undefined) {
                        campos.push(campo);
                        placeholders.push(`$${paramCount}`);
                        values.push(valor);
                        paramCount++;
                    }
                }
                
                campos.push('tenant_id');
                placeholders.push(`$${paramCount}`);
                values.push(tenantId);
                
                const sql = `INSERT INTO configuracoes_loja (${campos.join(', ')}) VALUES (${placeholders.join(', ')})`;
                
                await pool.query(sql, values);
                
                res.json({ 
                    mensagem: '✅ Configurações iniciais salvas com sucesso!' 
                });
            }
            
        } catch(e) { 
            console.error("❌ ERRO CRÍTICO:", e);
            res.status(500).json({ erro: e.message }); 
        }
    }
};

module.exports = configController;