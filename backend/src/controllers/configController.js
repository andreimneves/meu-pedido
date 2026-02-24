// backend/src/controllers/configController.js
const pool = require('../config/database');

const configController = {
    // Buscar configurações
    async buscarConfiguracoes(req, res) {
        try {
            const { subdominio } = req.params;
            
            console.log('🔍 Buscando configurações para:', subdominio);
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            const configQuery = await pool.query(
                'SELECT * FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );
            
            if (configQuery.rows.length === 0) {
                return res.json({
                    tenant_id: tenantId,
                    nome_loja: 'DL Crepes e Lanches',
                    slogan: 'Seu refúgio de sabores no coração do Santa Marta',
                    horario_funcionamento: 'Seg a Dom: 18h às 23h',
                    endereco_completo: 'Bairro Santa Marta, Santa Maria - RS',
                    whatsapp: '5551999999999',
                    cep_loja: '97000000',
                    km_maximo_entrega: 30.00,
                    mensagem_km_excedido: 'Fora da área de entrega. Escolha retirada.',
                    cor_principal: '#C83232',
                    taxa_por_km: 2.00,
                    taxa_minima: 5.00,
                    frete_gratis_acima: 50.00,
                    mensagem_banner_ativo: false,
                    mensagem_banner: '',
                    mensagem_banner_cor: '#FFF3E0',
                    mensagem_banner_texto: '#E65100',
                    mensagem_banner_icone: '📢'
                });
            }
            
            res.json(configQuery.rows[0]);
            
        } catch (error) {
            console.error('❌ Erro ao buscar configurações:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Atualizar configurações
    async atualizarConfiguracoes(req, res) {
        try {
            const { subdominio } = req.params;
            const dados = req.body;
            
            console.log('📝 Atualizando configurações para:', subdominio);
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            const existe = await pool.query(
                'SELECT * FROM configuracoes_loja WHERE tenant_id = $1',
                [tenantId]
            );
            
            if (existe.rows.length > 0) {
                await pool.query(
                    `UPDATE configuracoes_loja SET
                        nome_loja = $1,
                        slogan = $2,
                        horario_funcionamento = $3,
                        endereco_completo = $4,
                        whatsapp = $5,
                        cep_loja = $6,
                        km_maximo_entrega = $7,
                        mensagem_km_excedido = $8,
                        cor_principal = $9,
                        taxa_por_km = $10,
                        taxa_minima = $11,
                        frete_gratis_acima = $12,
                        mensagem_banner_ativo = $13,
                        mensagem_banner = $14,
                        mensagem_banner_cor = $15,
                        mensagem_banner_texto = $16,
                        mensagem_banner_icone = $17
                    WHERE tenant_id = $18`,
                    [
                        dados.nome_loja,
                        dados.slogan,
                        dados.horario_funcionamento,
                        dados.endereco_completo,
                        dados.whatsapp,
                        dados.cep_loja,
                        dados.km_maximo_entrega,
                        dados.mensagem_km_excedido,
                        dados.cor_principal,
                        dados.taxa_por_km,
                        dados.taxa_minima,
                        dados.frete_gratis_acima,
                        dados.mensagem_banner_ativo || false,
                        dados.mensagem_banner || '',
                        dados.mensagem_banner_cor || '#FFF3E0',
                        dados.mensagem_banner_texto || '#E65100',
                        dados.mensagem_banner_icone || '📢',
                        tenantId
                    ]
                );
            } else {
                await pool.query(
                    `INSERT INTO configuracoes_loja (
                        tenant_id, nome_loja, slogan, horario_funcionamento,
                        endereco_completo, whatsapp, cep_loja, km_maximo_entrega,
                        mensagem_km_excedido, cor_principal, taxa_por_km,
                        taxa_minima, frete_gratis_acima, mensagem_banner_ativo,
                        mensagem_banner, mensagem_banner_cor, mensagem_banner_texto,
                        mensagem_banner_icone
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
                    [
                        tenantId,
                        dados.nome_loja,
                        dados.slogan,
                        dados.horario_funcionamento,
                        dados.endereco_completo,
                        dados.whatsapp,
                        dados.cep_loja,
                        dados.km_maximo_entrega,
                        dados.mensagem_km_excedido,
                        dados.cor_principal,
                        dados.taxa_por_km,
                        dados.taxa_minima,
                        dados.frete_gratis_acima,
                        dados.mensagem_banner_ativo || false,
                        dados.mensagem_banner || '',
                        dados.mensagem_banner_cor || '#FFF3E0',
                        dados.mensagem_banner_texto || '#E65100',
                        dados.mensagem_banner_icone || '📢'
                    ]
                );
            }
            
            res.json({ mensagem: 'Configurações salvas com sucesso!' });
            
        } catch (error) {
            console.error('❌ Erro ao salvar configurações:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = configController;