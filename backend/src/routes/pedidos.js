// backend/src/routes/pedidos.js
const express = require('express');
const pedidoController = require('../controllers/pedidoController');
const router = express.Router();

// POST /api/pedidos - Criar novo pedido (usado pelo frontend)
router.post('/pedidos', pedidoController.criarPedido);

// GET /api/pedidos/:subdominio - Listar pedidos (usado pelo painel admin)
router.get('/pedidos/:subdominio', pedidoController.listarPedidos);

module.exports = router;