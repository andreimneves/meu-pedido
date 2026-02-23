const express = require('express');
const router = express.Router();
const controller = require('../controllers/configController');

router.get('/config/:subdominio', controller.buscarConfiguracoes);
router.put('/config/:subdominio', controller.atualizarConfiguracoes);

module.exports = router;