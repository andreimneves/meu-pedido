const pool = require('../config/database');

const pedidoController = {
    // Criar novo pedido
    criarPedido: async (req, res) => {
        const client = await pool.connect();
        try {
            const { subdominio, pedido } = req.body;

            console.log('📦 Recebendo novo pedido para:', subdominio);
            console.log('📦 Dados do pedido:', pedido);

            if (!subdominio) {
                return res.status(400).json({ erro: 'subdominio é obrigatório' });
            }
            if (!pedido || !pedido.cliente_nome || !pedido.cliente_telefone || !pedido.itens) {
                return res.status(400).json({ erro: 'Dados do pedido incompletos' });
            }

            await client.query('BEGIN');

            const tenantQuery = await client.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );

            if (tenantQuery.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }

            const tenantId = tenantQuery.rows[0].id;

            const pedidoQuery = await client.query(
                `INSERT INTO pedidos (
                    tenant_id, cliente_nome, cliente_telefone,
                    cliente_endereco, cliente_bairro, tipo_entrega,
                    taxa_entrega, subtotal, total, observacoes, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id`,
                [
                    tenantId,
                    pedido.cliente_nome,
                    pedido.cliente_telefone,
                    pedido.cliente_endereco || '',
                    pedido.cliente_bairro || '',
                    pedido.tipo_entrega || 'delivery',
                    pedido.taxa_entrega || 0,
                    pedido.subtotal,
                    pedido.total,
                    pedido.observacoes || '',
                    'novo'
                ]
            );

            const pedidoId = pedidoQuery.rows[0].id;
            console.log(`📝 Pedido #${pedidoId} criado`);

            for (const item of pedido.itens) {
                await client.query(
                    `INSERT INTO itens_pedido (
                        pedido_id, produto_id, produto_nome,
                        quantidade, preco_unitario, subtotal
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        pedidoId,
                        item.produto_id || null,
                        item.produto_nome,
                        item.quantidade || 1,
                        item.preco_unitario,
                        item.subtotal || (item.preco_unitario * (item.quantidade || 1))
                    ]
                );
            }

            await client.query('COMMIT');
            console.log(`✅ Pedido #${pedidoId} criado com sucesso!`);

            res.status(201).json({
                mensagem: 'Pedido criado com sucesso!',
                pedido_id: pedidoId
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Erro ao criar pedido:', error);
            res.status(500).json({ erro: error.message });
        } finally {
            client.release();
        }
    },

    // Listar pedidos
    listarPedidos: async (req, res) => {
        try {
            const { subdominio } = req.params;

            console.log(`📋 Listando pedidos para: ${subdominio}`);

            if (!subdominio) {
                return res.status(400).json({ erro: 'subdominio é obrigatório' });
            }

            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );

            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }

            const tenantId = tenantQuery.rows[0].id;

            const pedidos = await pool.query(
                `SELECT p.*,
                    (SELECT COUNT(*) FROM itens_pedido WHERE pedido_id = p.id) as total_itens
                FROM pedidos p
                WHERE p.tenant_id = $1
                ORDER BY p.data_pedido DESC`,
                [tenantId]
            );

            console.log(`✅ ${pedidos.rows.length} pedidos encontrados`);
            res.json(pedidos.rows);
        } catch (error) {
            console.error('❌ Erro ao listar pedidos:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Buscar pedido específico
    buscarPedido: async (req, res) => {
        try {
            const { subdominio, id } = req.params;

            console.log(`🔍 Buscando pedido #${id} para: ${subdominio}`);

            if (!subdominio || !id) {
                return res.status(400).json({ erro: 'subdominio e id são obrigatórios' });
            }

            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );

            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }

            const tenantId = tenantQuery.rows[0].id;

            const pedidoQuery = await pool.query(
                'SELECT * FROM pedidos WHERE id = $1 AND tenant_id = $2',
                [id, tenantId]
            );

            if (pedidoQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Pedido não encontrado' });
            }

            const itensQuery = await pool.query(
                'SELECT * FROM itens_pedido WHERE pedido_id = $1',
                [id]
            );

            console.log(`✅ Pedido #${id} encontrado com ${itensQuery.rows.length} itens`);
            res.json({
                ...pedidoQuery.rows[0],
                itens: itensQuery.rows
            });
        } catch (error) {
            console.error('❌ Erro ao buscar pedido:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Atualizar status do pedido
    atualizarStatus: async (req, res) => {
        try {
            const { subdominio, id } = req.params;
            const { status } = req.body;

            console.log(`🔄 Atualizando pedido #${id} para status: ${status}`);

            if (!subdominio || !id) {
                return res.status(400).json({ erro: 'subdominio e id são obrigatórios' });
            }

            if (!status) {
                return res.status(400).json({ erro: 'status é obrigatório' });
            }

            const statusValidos = ['novo', 'preparando', 'pronto', 'entregue', 'cancelado'];
            if (!statusValidos.includes(status)) {
                return res.status(400).json({
                    erro: 'Status inválido',
                    statusValidos: statusValidos
                });
            }

            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );

            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }

            const tenantId = tenantQuery.rows[0].id;

            const result = await pool.query(
                `UPDATE pedidos
                 SET status = $1
                 WHERE id = $2 AND tenant_id = $3
                 RETURNING *`,
                [status, id, tenantId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ erro: 'Pedido não encontrado' });
            }

            console.log(`✅ Status do pedido #${id} atualizado para: ${status}`);
            res.json({
                mensagem: 'Status atualizado com sucesso',
                pedido: result.rows[0]
            });
        } catch (error) {
            console.error('❌ Erro ao atualizar status:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Resumo dashboard
    dashboard: async (req, res) => {
        try {
            const { subdominio } = req.params;

            console.log(`📊 Gerando dashboard para: ${subdominio}`);

            if (!subdominio) {
                return res.status(400).json({ erro: 'subdominio é obrigatório' });
            }

            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );

            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }

            const tenantId = tenantQuery.rows[0].id;
            const hoje = new Date().toISOString().split('T')[0];

            const pedidosHoje = await pool.query(
                `SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as faturamento
                FROM pedidos
                WHERE tenant_id = $1 AND DATE(data_pedido) = $2`,
                [tenantId, hoje]
            );

            const ultimosPedidos = await pool.query(
                `SELECT id, cliente_nome, total, status, data_pedido
                FROM pedidos
                WHERE tenant_id = $1
                ORDER BY data_pedido DESC
                LIMIT 10`,
                [tenantId]
            );

            const statusCount = await pool.query(
                `SELECT status, COUNT(*) as total
                FROM pedidos
                WHERE tenant_id = $1
                GROUP BY status`,
                [tenantId]
            );

            console.log('✅ Dashboard gerado com sucesso');
            res.json({
                hoje: {
                    pedidos: parseInt(pedidosHoje.rows[0].total) || 0,
                    faturamento: parseFloat(pedidosHoje.rows[0].faturamento) || 0
                },
                ultimos_pedidos: ultimosPedidos.rows || [],
                status: statusCount.rows || []
            });
        } catch (error) {
            console.error('❌ Erro ao carregar dashboard:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = pedidoController;