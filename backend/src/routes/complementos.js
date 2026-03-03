// backend/src/routes/complementos.js
const express = require('express');
const complementoController = require('../controllers/complementoController');
const router = express.Router();

// GET /api/complementos - Listar todos os complementos
router.get('/complementos', complementoController.listar);

// GET /api/complementos/categoria/:categoria - Complementos por categoria
router.get('/complementos/categoria/:categoria', complementoController.buscarPorCategoria);

// GET /api/complementos/grupo/:grupoId - Complementos por grupo
router.get('/complementos/grupo/:grupoId', complementoController.buscarPorGrupo);

// GET /api/complementos/produto/:produtoId - Complementos para produto (agrupado)
router.get('/complementos/produto/:produtoId', complementoController.buscarParaProduto);

// GET /api/complementos/produto/:produtoId/grupos - Grupos do produto
router.get('/complementos/produto/:produtoId/grupos', complementoController.buscarGruposPorProduto);

// GET /api/complementos/:id - Buscar complemento por ID
router.get('/complementos/:id', complementoController.buscarPorId);

// POST /api/complementos - Criar novo complemento
router.post('/complementos', complementoController.criar);

// PUT /api/complementos/:id - Atualizar complemento
router.put('/complementos/:id', complementoController.atualizar);

// DELETE /api/complementos/:id - Excluir complemento
router.delete('/complementos/:id', complementoController.excluir);

// PUT /api/complementos/produto/:produtoId/vincular - Vincular grupos ao produto
router.put('/complementos/produto/:produtoId/vincular', complementoController.vincularAoProduto);

module.exports = router;