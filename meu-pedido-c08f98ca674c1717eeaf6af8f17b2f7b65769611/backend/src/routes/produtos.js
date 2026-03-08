// backend/src/routes/produtos.js
const express = require('express');
const produtoController = require('../controllers/produtoController');
const router = express.Router();

// Rotas principais
router.get('/produtos', produtoController.listarTodos);
router.get('/produtos/:id', produtoController.buscarPorId);
router.post('/produtos', produtoController.criar);
router.put('/produtos/:id', produtoController.atualizar);
router.delete('/produtos/:id', produtoController.excluir);
router.get('/cardapio/:subdominio', produtoController.cardapio);

module.exports = router;