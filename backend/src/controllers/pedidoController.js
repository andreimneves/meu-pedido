// backend/src/controllers/pedidoController.js
const pool = require('../config/database');

const pedidoController = {
    // ... (manter todas as funções existentes)
    
    // Dashboard com resumo dos pedidos (GET /api/dashboard/:subdominio)
    async resumoDashboard(req, res) {
        try {
            const { subdominio } = req.params;
            
            console.log(`📊 Gerando dashboard para: ${subdominio}`);
            
            const tenantQuery = await pool.query(
                'SELECT id FROM tenants WHERE subdominio = $1',
                [subdominio]
            );
            
            if (tenantQuery.rows.length === 0) {
                return res.status(404).json({ erro: 'Estabelecimento não encontrado' });
            }
            
            const tenantId = tenantQuery.rows[0].id;
            const hoje = new Date().toISOString().split('T')[0];
            
            // Pedidos de hoje
            const pedidosHoje = await pool.query(
                `SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as faturamento
                FROM pedidos 
                WHERE tenant_id = $1 AND DATE(data_pedido) = $2`,
                [tenantId, hoje]
            );
            
            // Últimos 10 pedidos
            const ultimosPedidos = await pool.query(
                `SELECT id, cliente_nome, total, status, data_pedido
                FROM pedidos 
                WHERE tenant_id = $1
                ORDER BY data_pedido DESC
                LIMIT 10`,
                [tenantId]
            );
            
            // Contagem por status
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
                    pedidos: parseInt(pedidosHoje.rows[0].total),
                    faturamento: parseFloat(pedidosHoje.rows[0].faturamento)
                },
                ultimos_pedidos: ultimosPedidos.rows,
                status: statusCount.rows
            });
            
        } catch (error) {
            console.error('❌ Erro ao carregar dashboard:', error);
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = pedidoController;