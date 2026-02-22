// backend/src/routes/pedidos.js
const express = require('express');
const pedidoController = require('../controllers/pedidoController');

// CRÍTICO: mergeParams: true permite que este router veja os parâmetros da rota pai
const router = express.Router({ mergeParams: true });

// ===== ROTAS ESPECÍFICAS PRIMEIRO (MAIOR PRIORIDADE) =====
// PUT e DELETE específicos vêm ANTES das rotas com parâmetros simples
router.put('/:id/status', pedidoController.atualizarStatus);
router.delete('/:id', pedidoController.excluirPedido);

// ===== ROTAS COM PARÂMETRO ID =====
router.get('/:id', pedidoController.buscarPedido);

// ===== ROTAS SEM PARÂMETROS (MAIS GENÉRICAS POR ÚLTIMO) =====
router.get('/', pedidoController.listarPedidos);
router.post('/', pedidoController.criarPedido);

// ===== ROTA PARA DEBUG =====
router.get('/debug/teste', (req, res) => {
    res.json({ 
        mensagem: 'Rota de pedidos funcionando',
        params: req.params,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl
    });
});

module.exports = router;