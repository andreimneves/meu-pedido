// backend/src/controllers/configController.js
const pool = require('../config/database');

// Função tanque de guerra: Garante que as colunas existem antes de qualquer ação
async function garantirColunas() {
    const colunas = [
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255);",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS frete_gratis_ativo BOOLEAN DEFAULT true;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS frete_gratis_acima DECIMAL(10,2) DEFAULT 50.00;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_banner_ativo BOOLEAN DEFAULT false;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_banner TEXT;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_banner_cor VARCHAR(50) DEFAULT '#FFF3E0';",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_banner_texto VARCHAR(50) DEFAULT '#E65100';",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_banner_icone VARCHAR(20) DEFAULT '📢';",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS cor_principal VARCHAR(50) DEFAULT '#C83232';",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS taxa_por_km DECIMAL(10,2) DEFAULT 2.00;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS taxa_minima DECIMAL(10,2) DEFAULT 5.00;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS km_maximo_entrega DECIMAL(10,2) DEFAULT 30.00;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS mensagem_km_excedido TEXT;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS horarios TEXT;",
        "ALTER TABLE configuracoes_loja ADD COLUMN IF NOT EXISTS horarios_delivery TEXT;"
    ];
    for (let sql of colunas) {
        await pool.query(sql).catch(e => {}); // Se já existir, ignora em silêncio
    }
}

const configController = {
    async buscarConfiguracoes(req, res) {
        try {
            await garantirColunas();

            const { subdominio } = req.params;
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }

            const tenantId = tenantQuery.rows[0].id;
            const configQuery = await pool.query('SELECT * FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);

            if (configQuery.rows.length === 0) {
                return res.json({
                    tenant_id: tenantId, logo_url: '', nome_loja: 'DL Crepes e Lanches',
                    slogan: 'Seu refúgio de sabores no coração do Santa Marta',
                    horario_funcionamento: 'Seg a Dom: 18h às 23h',
                    endereco_completo: 'Bairro Santa Marta, Santa Maria - RS',
                    whatsapp: '5551999999999', cep_loja: '97000000',
                    km_maximo_entrega: 30.00, mensagem_km_excedido: 'Fora da área de entrega. Escolha retirada.',
                    cor_principal: '#C83232', taxa_por_km: 2.00, taxa_minima: 5.00,
                    frete_gratis_ativo: true, frete_gratis_acima: 50.00,
                    mensagem_banner_ativo: false, mensagem_banner: '',
                    mensagem_banner_cor: '#FFF3E0', mensagem_banner_texto: '#E65100', mensagem_banner_icone: '📢',
                    horarios: '', horarios_delivery: ''
                });
            }
            res.json(configQuery.rows[0]);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    async atualizarConfiguracoes(req, res) {
        try {
            await garantirColunas();

            const { subdominio } = req.params;
            const dados = req.body;
            
            const tenantQuery = await pool.query('SELECT id FROM tenants WHERE subdominio = $1', [subdominio]);
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            const existe = await pool.query('SELECT * FROM configuracoes_loja WHERE tenant_id = $1', [tenantId]);

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
                        horarios = $21, horarios_delivery = $22
                    WHERE tenant_id = $20`,
                    [
                        dados.nome_loja, // 1
                        dados.slogan, // 2
                        dados.horario_funcionamento, // 3
                        dados.endereco_completo, // 4
                        dados.whatsapp, // 5
                        dados.cep_loja, // 6
                        dados.km_maximo_entrega, // 7
                        dados.mensagem_km_excedido, // 8
                        dados.cor_principal, // 9
                        dados.taxa_por_km, // 10
                        dados.taxa_minima, // 11
                        dados.frete_gratis_ativo !== false, // 12
                        dados.frete_gratis_acima || 50, // 13
                        dados.mensagem_ativa || false, // 14 (Forçado a ler 'mensagem_ativa' do frontend)
                        dados.mensagem_texto || '', // 15 (Forçado a ler 'mensagem_texto' do frontend)
                        dados.mensagem_banner_cor || '#FFF3E0', // 16
                        dados.mensagem_banner_texto || '#E65100', // 17
                        dados.mensagem_banner_icone || '📢', // 18
                        dados.logo_url || '', // 19
                        tenantId, // 20
                        dados.horarios || '', // 21
                        dados.horarios_delivery || '' // 22
                    ]
                );
            } else {
                await pool.query(
                    `INSERT INTO configuracoes_loja (
                        tenant_id, nome_loja, slogan, horario_funcionamento,
                        endereco_completo, whatsapp, cep_loja, km_maximo_entrega,
                        mensagem_km_excedido, cor_principal, taxa_por_km,
                        taxa_minima, frete_gratis_ativo, frete_gratis_acima,
                        mensagem_banner_ativo, mensagem_banner, mensagem_banner_cor,
                        mensagem_banner_texto, mensagem_banner_icone, logo_url,
                        horarios, horarios_delivery
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
                    [
                        tenantId, // 1
                        dados.nome_loja, // 2
                        dados.slogan, // 3
                        dados.horario_funcionamento, // 4
                        dados.endereco_completo, // 5
                        dados.whatsapp, // 6
                        dados.cep_loja, // 7
                        dados.km_maximo_entrega, // 8
                        dados.mensagem_km_excedido, // 9
                        dados.cor_principal, // 10
                        dados.taxa_por_km, // 11
                        dados.taxa_minima, // 12
                        dados.frete_gratis_ativo !== false, // 13
                        dados.frete_gratis_acima || 50, // 14
                        dados.mensagem_ativa || false, // 15
                        dados.mensagem_texto || '', // 16
                        dados.mensagem_banner_cor || '#FFF3E0', // 17
                        dados.mensagem_banner_texto || '#E65100', // 18
                        dados.mensagem_banner_icone || '📢', // 19
                        dados.logo_url || '', // 20
                        dados.horarios || '', // 21
                        dados.horarios_delivery || '' // 22
                    ]
                );
            }
            res.json({ mensagem: 'Configurações guardadas com sucesso!' });
        } catch (error) {
            console.error("Erro no configController:", error);
            res.status(500).json({ erro: error.message });
        }
    }
};
module.exports = configController;