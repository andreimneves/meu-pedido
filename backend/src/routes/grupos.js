// backend/src/routes/grupos.js
const express = require('express');
const grupoComplementoController = require('../controllers/grupoComplementoController');
const router = express.Router();

// GET /api/grupos-complementos - Listar todos os grupos
router.get('/grupos-complementos', grupoComplementoController.listar);

// GET /api/grupos-complementos/:id - Buscar grupo por ID
router.get('/grupos-complementos/:id', grupoComplementoController.buscarPorId);

// POST /api/grupos-complementos - Criar novo grupo
router.post('/grupos-complementos', grupoComplementoController.criar);

// PUT /api/grupos-complementos/:id - Atualizar grupo
router.put('/grupos-complementos/:id', grupoComplementoController.atualizar);

// DELETE /api/grupos-complementos/:id - Excluir grupo
router.delete('/grupos-complementos/:id', grupoComplementoController.excluir);

// GET /api/grupo-complementos/:grupoId/itens - Listar itens do grupo
router.get('/grupo-complementos/:grupoId/itens', grupoComplementoController.listarItens);

// POST /api/grupos/:grupoId/itens/:complementoId - Adicionar item ao grupo
router.post('/grupos/:grupoId/itens/:complementoId', grupoComplementoController.adicionarItem);

// DELETE /api/grupos/:grupoId/itens/:complementoId - Remover item do grupo
router.delete('/grupos/:grupoId/itens/:complementoId', grupoComplementoController.removerItem);

// PUT /api/grupos/:grupoId/itens/ordem - Atualizar ordem dos itens
router.put('/grupos/:grupoId/itens/ordem', grupoComplementoController.atualizarOrdemItens);

module.exports = router;