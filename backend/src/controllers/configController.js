const pool = require('../config/database');

const configController = {
    // Buscar configurações
    buscarConfiguracoes: async (req, res) => {
        try {
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

    // Atualizar configurações
    atualizarConfiguracoes: async (req, res) => {
        try {
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

            const colunasPermitidas = [
                'nome_loja', 'slogan', 'horario_funcionamento', 'endereco_completo',
                'whatsapp', 'cep_loja', 'km_maximo_entrega', 'mensagem_km_excedido',
                'cor_principal', 'taxa_por_km', 'taxa_minima', 'frete_gratis_ativo',
                'frete_gratis_acima', 'mensagem_banner_ativo', 'mensagem_banner',
                'mensagem_banner_cor', 'mensagem_banner_texto', 'mensagem_banner_icone',
                'logo_url', 'horarios', 'horarios_delivery'
            ];

            const existe = await pool.query(
                'SELECT * FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );

            if (existe.rows.length > 0) {
                const dadosAtuais = existe.rows[0];
                const dadosCompletos = { ...dadosAtuais };

                for (let chave of colunasPermitidas) {
                    if (dadosEnviados[chave] !== undefined) {
                        dadosCompletos[chave] = dadosEnviados[chave];
                    }
                }

                delete dadosCompletos.id;
                delete dadosCompletos.tenant_id;

                const chaves = Object.keys(dadosCompletos);
                const setClause = chaves.map((chave, index) => `${chave} = $${index + 1}`).join(', ');
                const values = chaves.map(chave => dadosCompletos[chave]);
                values.push(tenantId);

                const sql = `UPDATE configuracoes_loja SET ${setClause} WHERE tenant_id = $${values.length}`;

                console.log('📝 SQL:', sql);
                console.log('📊 Valores:', values);

                await pool.query(sql, values);

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