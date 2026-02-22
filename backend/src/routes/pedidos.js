// backend/src/routes/pedidos.js
const express = require('express');
const pedidoController = require('../controllers/pedidoController');
const router = express.Router();

// Rotas públicas (para clientes fazerem pedidos)
router.post('/pedidos', pedidoController.criarPedido);

// Rotas administrativas (para o painel admin)
router.get('/pedidos/:subdominio', pedidoController.listarPedidos);
router.get('/pedidos/:subdominio/:id', pedidoController.buscarPedido);
router.put('/pedidos/:subdominio/:id/status', pedidoController.atualizarStatus);
router.get('/dashboard/:subdominio', pedidoController.resumoDashboard);

module.exports = router;