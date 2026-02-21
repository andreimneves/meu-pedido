// backend/src/controllers/configController.js
const pool = require('../config/database');

const configController = {
    // --- Buscar configurações ---
    buscarConfiguracoes: async (req, res) => {
        try {
            const { subdominio } = req.params;
            console.log('🔍 Buscando config para:', subdominio);

            // Buscar tenant
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            const tenantId = tenantQuery.rows[0].id;

            // Buscar configurações da loja
            const configQuery = await pool.query(
                'SELECT * FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );

            // Buscar bairros com restrição
            const restricoesQuery = await pool.query(
                'SELECT bairro, motivo FROM restricoes_bairro WHERE tenant_id = $1 AND ativo = true ORDER BY bairro',
                [tenantId]
            );

            let configData = {};
            if (configQuery.rows.length === 0) {
                // Valores padrão se não existir
                configData = {
                    tenant_id: tenantId,
                    nome_loja: 'DL Crepes e Lanches',
                    slogan: 'Seu refúgio de sabores no coração do Santa Marta',
                    horario_funcionamento: 'Seg a Dom: 18h às 23h',
                    endereco_completo: 'Bairro Santa Marta, Santa Maria - RS',
                    whatsapp: '5551999999999',
                    cep_loja: '97000-000',
                    km_maximo_entrega: 10.00,
                    mensagem_km_excedido: 'Sua localização está fora da nossa área de entrega. Você pode escolher a opção "Retirada" para buscar o pedido.',
                    cor_principal: '#C83232',
                    taxa_por_km: 2.00,
                    taxa_minima: 5.00,
                    frete_gratis_acima: 50.00
                };
            } else {
                configData = configQuery.rows[0];
            }

            // Adicionar a lista de bairros com restrição à resposta
            configData.bairros_restritos = restricoesQuery.rows;

            res.json(configData);

        } catch (error) {
            console.error('❌ Erro ao buscar:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // --- Atualizar configurações ---
    atualizarConfiguracoes: async (req, res) => {
        const client = await pool.connect(); // Usar cliente para transação
        try {
            const { subdominio } = req.params;
            const dados = req.body; // Agora dados pode incluir um array 'bairros_restritos'
            console.log('📝 Atualizando config para:', subdominio);

            await client.query('BEGIN'); // Iniciar transação

            // Buscar tenant
            const tenantQuery = await client.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            if (tenantQuery.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            const tenantId = tenantQuery.rows[0].id;

            // 1. Atualizar ou Inserir configurações da loja
            const existe = await client.query(
                'SELECT * FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );

            const configLoja = {
                nome_loja: dados.nome_loja,
                slogan: dados.slogan,
                horario_funcionamento: dados.horario_funcionamento,
                endereco_completo: dados.endereco_completo,
                whatsapp: dados.whatsapp,
                cep_loja: dados.cep_loja,
                km_maximo_entrega: dados.km_maximo_entrega,
                mensagem_km_excedido: dados.mensagem_km_excedido,
                cor_principal: dados.cor_principal,
                taxa_por_km: dados.taxa_por_km,
                taxa_minima: dados.taxa_minima,
                frete_gratis_acima: dados.frete_gratis_acima
            };

            if (existe.rows.length > 0) {
                // Atualizar
                await client.query(
                    `UPDATE configuracoes_loja SET
                        nome_loja = $1, slogan = $2, horario_funcionamento = $3,
                        endereco_completo = $4, whatsapp = $5, cep_loja = $6,
                        km_maximo_entrega = $7, mensagem_km_excedido = $8, cor_principal = $9,
                        taxa_por_km = $10, taxa_minima = $11, frete_gratis_acima = $12
                    WHERE tenant_id = $13`,
                    [
                        configLoja.nome_loja, configLoja.slogan, configLoja.horario_funcionamento,
                        configLoja.endereco_completo, configLoja.whatsapp, configLoja.cep_loja,
                        configLoja.km_maximo_entrega, configLoja.mensagem_km_excedido, configLoja.cor_principal,
                        configLoja.taxa_por_km, configLoja.taxa_minima, configLoja.frete_gratis_acima,
                        tenantId
                    ]
                );
                console.log('✅ Configurações da loja atualizadas');
            } else {
                // Inserir
                await client.query(
                    `INSERT INTO configuracoes_loja (
                        tenant_id, nome_loja, slogan, horario_funcionamento, endereco_completo,
                        whatsapp, cep_loja, km_maximo_entrega, mensagem_km_excedido, cor_principal,
                        taxa_por_km, taxa_minima, frete_gratis_acima
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                    [
                        tenantId, configLoja.nome_loja, configLoja.slogan, configLoja.horario_funcionamento,
                        configLoja.endereco_completo, configLoja.whatsapp, configLoja.cep_loja,
                        configLoja.km_maximo_entrega, configLoja.mensagem_km_excedido, configLoja.cor_principal,
                        configLoja.taxa_por_km, configLoja.taxa_minima, configLoja.frete_gratis_acima
                    ]
                );
                console.log('✅ Novas configurações da loja inseridas');
            }

            // 2. Processar a lista de bairros restritos (se enviada)
            if (dados.bairros_restritos && Array.isArray(dados.bairros_restritos)) {
                // Primeiro, desativa todos os registros antigos para este tenant (ou deleta, como preferir)
                // Opção: Deletar e recriar é mais simples para o exemplo.
                await client.query('DELETE FROM restricoes_bairro WHERE tenant_id = $1', [tenantId]);

                // Inserir os novos bairros da lista
                for (let b of dados.bairros_restritos) {
                    if (b.bairro && b.bairro.trim() !== '') {
                        await client.query(
                            'INSERT INTO restricoes_bairro (tenant_id, bairro, motivo, ativo) VALUES ($1, $2, $3, $4)',
                            [tenantId, b.bairro.trim(), b.motivo || 'Restrição manual', true]
                        );
                    }
                }
                console.log(`✅ ${dados.bairros_restritos.length} bairros restritos atualizados.`);
            }

            await client.query('COMMIT'); // Finalizar transação
            res.json({ mensagem: 'Configurações e restrições salvas com sucesso!' });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro ao salvar:', error);
            res.status(500).json({ erro: error.message });
        } finally {
            client.release(); // Liberar conexão
        }
    }
};

module.exports = configController;