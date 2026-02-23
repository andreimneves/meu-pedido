// backend/src/routes/config.js
const express = require('express');
const router = express.Router();

// Importar o controller
const configController = require('../controllers/configController');

// Rotas
router.get('/config/:subdominio', configController.buscarConfiguracoes);
router.put('/config/:subdominio', configController.atualizarConfiguracoes);

module.exports = router;