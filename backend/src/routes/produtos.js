// backend/src/routes/produtos.js
const express = require('express');
const produtoController = require('../controllers/produtoController');
const router = express.Router();

// Rotas públicas (cardápio)
router.get('/cardapio/:subdominio', produtoController.listar);

// Rotas administrativas (CRUD completo)
router.get('/produtos', produtoController.listar);
router.get('/produtos/:id', produtoController.buscarPorId);
router.post('/produtos', produtoController.criar);
router.put('/produtos/:id', produtoController.atualizar);
router.delete('/produtos/:id', produtoController.deletar);

module.exports = router;