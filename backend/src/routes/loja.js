// backend/src/routes/loja.js
const express = require('express');
const lojaController = require('../controllers/lojaController');
const router = express.Router();

// ===== ROTAS DA LOJA =====

// GET /api/loja/status/:subdominio - Verificar se loja está aberta
router.get('/loja/status/:subdominio', lojaController.verificarStatusLoja);

// GET /api/loja/horarios/:subdominio - Buscar horários de funcionamento
router.get('/loja/horarios/:subdominio', lojaController.buscarHorarios);

// PUT /api/loja/horarios/:subdominio - Atualizar horários
router.put('/loja/horarios/:subdominio', lojaController.atualizarHorarios);

// GET /api/loja/disponibilidade/:subdominio - Verificar disponibilidade para pedido
router.get('/loja/disponibilidade/:subdominio', lojaController.verificarDisponibilidade);

module.exports = router;