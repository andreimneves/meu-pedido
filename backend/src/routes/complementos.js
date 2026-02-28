// backend/src/routes/complementos.js
const express = require('express');
const complementoController = require('../controllers/complementoController');
const router = express.Router();

// GET /api/complementos - Listar todos os complementos
router.get('/complementos', complementoController.listar);

// GET /api/complementos/produto/:produtoId - Complementos por produto
router.get('/complementos/produto/:produtoId', complementoController.buscarPorProduto);

// GET /api/complementos/:id - Buscar complemento por ID
router.get('/complementos/:id', complementoController.buscarPorId);

// POST /api/complementos - Criar novo complemento
router.post('/complementos', complementoController.criar);

// PUT /api/complementos/:id - Atualizar complemento
router.put('/complementos/:id', complementoController.atualizar);

// DELETE /api/complementos/:id - Excluir complemento
router.delete('/complementos/:id', complementoController.excluir);

module.exports = router;