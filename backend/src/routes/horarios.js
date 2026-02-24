// backend/src/routes/horarios.js
const express = require('express');
const horarioController = require('../controllers/horarioController');
const router = express.Router();

// ===== ROTAS DE HORÁRIOS =====

// GET /api/horarios/:subdominio - Buscar horários de funcionamento
router.get('/horarios/:subdominio', horarioController.buscarHorarios);

// PUT /api/horarios/:subdominio - Atualizar horários
router.put('/horarios/:subdominio', horarioController.atualizarHorarios);

// GET /api/horarios/disponibilidade/:subdominio - Verificar disponibilidade atual
router.get('/horarios/disponibilidade/:subdominio', horarioController.verificarDisponibilidade);

module.exports = router;