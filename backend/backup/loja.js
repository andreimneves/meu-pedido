// backend/src/routes/loja.js
const express = require('express');
const lojaController = require('../controllers/lojaController');
const router = express.Router();

router.get('/loja/status/:subdominio', lojaController.verificarStatusLoja);

module.exports = router;