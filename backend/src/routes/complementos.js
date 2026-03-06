const express = require('express');
const controller = require('../controllers/complementoController');

const router = express.Router();

// GRUPOS
router.get('/grupos', controller.listarGrupos);
router.post('/grupos', controller.criarGrupo);
router.put('/grupos/:id', controller.atualizarGrupo);
router.delete('/grupos/:id', controller.excluirGrupo);

// ITENS
router.get('/itens', controller.listarItens);
router.post('/itens', controller.criarItem);
router.put('/itens/:id', controller.atualizarItem);
router.delete('/itens/:id', controller.excluirItem);

// ITENS DO GRUPO
router.get('/grupos/:id/itens', controller.listarItensDoGrupo);
router.post('/grupos/:grupoId/itens/:itemId', controller.vincularItemAoGrupo);
router.delete('/grupos/:grupoId/itens/:itemId', controller.removerItemDoGrupo);

// PRODUTO
router.get('/produtos/:produtoId/grupos', controller.listarGruposDoProduto);
router.put('/produtos/:produtoId/grupos', controller.vincularGruposProduto);

module.exports = router;