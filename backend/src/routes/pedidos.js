// backend/src/routes/pedidos.js
const express = require('express');
const pedidoController = require('../controllers/pedidoController');
const router = express.Router();

// ===== ROTAS DE PEDIDOS =====

// POST /api/pedidos - Criar novo pedido (público)
router.post('/pedidos', pedidoController.criarPedido);

// GET /api/pedidos/:subdominio - Listar pedidos (admin)
router.get('/pedidos/:subdominio', pedidoController.listarPedidos);

// GET /api/pedidos/:subdominio/:id - Buscar pedido específico (admin)
router.get('/pedidos/:subdominio/:id', pedidoController.buscarPedido);

// PUT /api/pedidos/:subdominio/:id/status - Atualizar status do pedido (admin)
router.put('/pedidos/:subdominio/:id/status', pedidoController.atualizarStatus);

// GET /api/dashboard/:subdominio - Resumo do dashboard (admin)
router.get('/dashboard/:subdominio', pedidoController.resumoDashboard);

module.exports = router;