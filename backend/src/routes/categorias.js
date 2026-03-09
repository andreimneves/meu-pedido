// backend/src/routes/categorias.js
const express = require('express');
const categoriaController = require('../controllers/categoriaController');
const router = express.Router();

router.get('/categorias', categoriaController.listar);
router.get('/categorias/:id', categoriaController.buscarPorId);
router.post('/categorias', categoriaController.criar);
router.put('/categorias/:id', categoriaController.atualizar);
router.delete('/categorias/:id', categoriaController.excluir);

module.exports = router;