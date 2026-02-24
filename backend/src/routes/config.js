// backend/src/routes/config.js
const express = require('express');
const configController = require('../controllers/configController');
const router = express.Router();

// ===== ROTAS DE CONFIGURAÇÕES =====

// GET /api/config/:subdominio - Buscar configurações da loja
router.get('/config/:subdominio', configController.buscarConfiguracoes);

// PUT /api/config/:subdominio - Atualizar configurações da loja
router.put('/config/:subdominio', configController.atualizarConfiguracoes);

module.exports = router;