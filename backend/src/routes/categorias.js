// backend/src/routes/categorias.js
const express = require('express');
const categoriaController = require('../controllers/categoriaController');
const router = express.Router();

// ===== ROTAS DE CATEGORIAS =====

// GET /api/categorias - Listar todas as categorias
router.get('/categorias', categoriaController.listar);

// GET /api/categorias/:id - Buscar categoria por ID
router.get('/categorias/:id', categoriaController.buscarPorId);

// POST /api/categorias - Criar nova categoria
router.post('/categorias', categoriaController.criar);

// PUT /api/categorias/:id - Atualizar categoria
router.put('/categorias/:id', categoriaController.atualizar);

// DELETE /api/categorias/:id - Excluir categoria
router.delete('/categorias/:id', categoriaController.excluir);

module.exports = router;