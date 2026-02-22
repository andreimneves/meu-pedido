// backend/src/controllers/pedidoController.js
const pool = require('../config/database');

const pedidoController = {
    // Criar um novo pedido (POST /api/pedidos)
    async criarPedido(req, res) {
        const client = await pool.connect();
        try {
            const { subdominio, pedido } = req.body;
            
            console.log('📦 Recebendo novo pedido:', { subdominio, pedido });
            
            await client.query('BEGIN');
            
            // Buscar tenant_id pelo subdomínio
            const tenantQuery = await client.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            
            // Inserir o pedido
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
                    pedido.tipo_entrega,
                    pedido.taxa_entrega || 0,
                    pedido.subtotal,
                    pedido.total,
                    pedido.observacoes || '',
                    'novo'
                ]
            );
            
            const pedidoId = pedidoQuery.rows[0].id;
            
            // Inserir os itens do pedido
            for (const item of pedido.itens) {
                await client.query(
                    `INSERT INTO itens_pedido (
                        pedido_id, produto_id, produto_nome,
                        quantidade, preco_unitario, subtotal
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        pedidoId,
                        item.produto_id,
                        item.produto_nome,
                        item.quantidade,
                        item.preco_unitario,
                        item.subtotal
                    ]
                );
            }
            
            await client.query('COMMIT');
            
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
    
    // Listar pedidos (GET /api/pedidos/:subdominio)
    async listarPedidos(req, res) {
        try {
            const { subdominio } = req.params;
            
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
            
            res.json(pedidos.rows);
            
        } catch (error) {
            console.error('❌ Erro ao listar pedidos:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = pedidoController;