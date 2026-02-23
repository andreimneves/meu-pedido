const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoriaController');

router.get('/categorias', controller.listar);
router.post('/categorias', controller.criar);
router.put('/categorias/:id', controller.atualizar);
router.delete('/categorias/:id', controller.deletar);

module.exports = router;