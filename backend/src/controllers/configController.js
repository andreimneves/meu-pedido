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
    // ===== BUSCAR CONFIGURAÇÕES =====
    async buscarConfiguracoes(req, res) {
        try {
            await garantirColunas();
            const { subdominio } = req.params;
            
            console.log('🔍 Buscando configurações para:', subdominio);
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            const configQuery = await pool.query(
                'SELECT * FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );
            
            if (configQuery.rows.length === 0) {
                // Criar registro inicial se não existir
                const insertQuery = await pool.query(
                    `INSERT INTO configuracoes_loja (tenant_id, horario_funcionamento, horarios, horarios_delivery) 
                     VALUES ($1, $2, $3, $4) RETURNING *`,
                    [tenantId, 'Seg a Dom: 18h às 23h', '{}', '{}']
                );
                return res.json(insertQuery.rows[0]);
            }
            
            res.json(configQuery.rows[0]);
            
        } catch (error) { 
            console.error('❌ Erro ao buscar configurações:', error);
            res.status(500).json({ erro: error.message }); 
        }
    },

    // ===== ATUALIZAR CONFIGURAÇÕES =====
    async atualizarConfiguracoes(req, res) {
        try {
            await garantirColunas();
            const { subdominio } = req.params;
            const dadosEnviados = req.body;
            
            console.log('📥 Dados recebidos:', JSON.stringify(dadosEnviados, null, 2));
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Loja não encontrada' });
            }
            
            const tenantId = tenantQuery.rows[0].id;

            // LISTA DE TODAS AS COLUNAS EXISTENTES (incluindo horários)
            const colunasPermitidas = [
                'nome_loja', 'slogan', 'horario_funcionamento', 'endereco_completo',
                'whatsapp', 'cep_loja', 'km_maximo_entrega', 'mensagem_km_excedido',
                'cor_principal', 'taxa_por_km', 'taxa_minima', 'frete_gratis_ativo',
                'frete_gratis_acima', 'mensagem_banner_ativo', 'mensagem_banner',
                'mensagem_banner_cor', 'mensagem_banner_texto', 'mensagem_banner_icone',
                'logo_url', 'horarios', 'horarios_delivery'
            ];

            // Verifica se já existe um registro
            const existe = await pool.query(
                'SELECT * FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );

            if (existe.rows.length > 0) {
                // PEGA OS DADOS ATUAIS DO BANCO
                const dadosAtuais = existe.rows[0];
                
                // CRIA UM OBJETO COM TODOS OS DADOS (ATUAIS + NOVOS)
                const dadosCompletos = { ...dadosAtuais };
                
                // SOBRESCREVE APENAS OS CAMPOS QUE FORAM ENVIADOS
                for (let chave of colunasPermitidas) {
                    if (dadosEnviados[chave] !== undefined) {
                        dadosCompletos[chave] = dadosEnviados[chave];
                    }
                }
                
                // REMOVE CAMPOS QUE NÃO DEVEM IR NO UPDATE
                delete dadosCompletos.id;
                delete dadosCompletos.tenant_id;
                
                // CONSTRÓI O UPDATE COM TODOS OS CAMPOS
                const chaves = Object.keys(dadosCompletos);
                const setClause = chaves.map((chave, index) => `${chave} = $${index + 1}`).join(', ');
                const values = chaves.map(chave => dadosCompletos[chave]);
                values.push(tenantId);

                const sql = `UPDATE configuracoes_loja SET ${setClause} WHERE tenant_id = $${values.length}`;
                
                console.log('📝 SQL:', sql);
                console.log('📊 Valores:', values);
                
                await pool.query(sql, values);
                
                // Buscar dados atualizados
                const configAtualizada = await pool.query(
                    'SELECT * FROM configuracoes_loja WHERE tenant_id = $1',
                    [tenantId]
                );
                
                console.log('✅ Configurações atualizadas com sucesso!');
                
                res.json({ 
                    mensagem: 'Configurações salvas com sucesso!',
                    dados: configAtualizada.rows[0],
                    campos_atualizados: Object.keys(dadosEnviados)
                });
                
            } else {
                // INSERT DINÂMICO (Primeira vez)
                const campos = [];
                const placeholders = [];
                const values = [];
                let paramCount = 1;
                
                campos.push('tenant_id');
                placeholders.push(`$${paramCount}`);
                values.push(tenantId);
                paramCount++;
                
                for (let chave of colunasPermitidas) {
                    if (dadosEnviados[chave] !== undefined) {
                        campos.push(chave);
                        placeholders.push(`$${paramCount}`);
                        values.push(dadosEnviados[chave]);
                        paramCount++;
                    }
                }

                const sql = `INSERT INTO configuracoes_loja (${campos.join(', ')}) VALUES (${placeholders.join(', ')})`;
                
                console.log('📝 SQL INSERT:', sql);
                console.log('📊 Valores INSERT:', values);
                
                await pool.query(sql, values);
                
                res.json({ 
                    mensagem: 'Configurações iniciais salvas com sucesso!',
                    campos: Object.keys(dadosEnviados)
                });
            }

        } catch(e) { 
            console.error("❌ ERRO NO CONTROLLER:", e);
            res.status(500).json({ erro: e.message }); 
        }
    }
};

module.exports = configController;