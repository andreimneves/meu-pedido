const express = require('express');
const router = express.Router();
const controller = require('../controllers/complementoController');

router.get('/complementos', controller.listar);

router.get('/complementos/categoria/:categoria', controller.buscarPorCategoria);

router.get('/complementos/grupo/:grupoId', controller.buscarPorGrupo);

router.get('/complementos/produto/:produtoId', controller.buscarParaProduto);

router.get('/complementos/produto/:produtoId/grupos', controller.buscarGruposPorProduto);

router.get('/complementos/:id', controller.buscarPorId);

router.post('/complementos', controller.criar);

router.put('/complementos/:id', controller.atualizar);

router.delete('/complementos/:id', controller.excluir);

router.put('/complementos/produto/:produtoId/vincular', controller.vincularAoProduto);

module.exports = router;