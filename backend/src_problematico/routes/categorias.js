// backend/src/routes/categorias.js
const express = require('express');
const categoriaController = require('../controllers/categoriaController');
const router = express.Router();

router.get('/categorias', categoriaController.listar);
router.post('/categorias', categoriaController.criar);
router.put('/categorias/:id', categoriaController.atualizar);
router.delete('/categorias/:id', categoriaController.deletar);

module.exports = router;