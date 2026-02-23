// backend/src/routes/pedidos.js
const express = require('express');
const pedidoController = require('../controllers/pedidoController');
const router = express.Router({ mergeParams: true });

// Rotas específicas primeiro
router.put('/:id/status', pedidoController.atualizarStatus);
router.delete('/:id', pedidoController.excluirPedido);
router.get('/:id', pedidoController.buscarPedido);
router.get('/', pedidoController.listarPedidos);
router.post('/', pedidoController.criarPedido);

module.exports = router;