const express = require('express');
const router = express.Router();

const produtoController = require('./controllers/produtoController');
const categoriaController = require('./controllers/categoriaController');
const complementoController = require('./controllers/complementoController');
const pedidoController = require('./controllers/pedidoController');
const horarioController = require('./controllers/horarioController');


/* ==============================
CATEGORIAS
============================== */

router.get('/categorias', categoriaController.listar);
router.post('/categorias', categoriaController.criar);
router.put('/categorias/:id', categoriaController.atualizar);
router.delete('/categorias/:id', categoriaController.excluir);


/* ==============================
PRODUTOS
============================== */

router.get('/produtos', produtoController.listar);
router.post('/produtos', produtoController.criar);
router.put('/produtos/:id', produtoController.atualizar);
router.delete('/produtos/:id', produtoController.excluir);


/* ==============================
COMPLEMENTOS
============================== */

router.get('/complementos', complementoController.listar);
router.post('/complementos', complementoController.criarItem);
router.put('/complementos/:id', complementoController.atualizarItem);
router.delete('/complementos/:id', complementoController.excluirItem);


/* ==============================
GRUPOS DE COMPLEMENTOS
============================== */

router.get('/grupos/:id/itens', complementoController.listarItensDoGrupo);
router.post('/grupos/:grupoId/item/:itemId', complementoController.vincularItemAoGrupo);
router.delete('/grupos/:grupoId/item/:itemId', complementoController.removerItemDoGrupo);


/* ==============================
PEDIDOS
============================== */

router.get('/pedidos', pedidoController.listar);
router.post('/pedidos', pedidoController.criar);
router.put('/pedidos/:id', pedidoController.atualizarStatus);


/* ==============================
HORÁRIOS DA LOJA
============================== */

router.get('/horarios', horarioController.listar);
router.put('/horarios/:id', horarioController.atualizar);


module.exports = router;