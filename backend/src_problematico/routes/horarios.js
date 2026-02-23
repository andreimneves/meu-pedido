// backend/src/routes/horarios.js
const express = require('express');
const horarioController = require('../controllers/horarioController');
const router = express.Router();

router.get('/horarios/:subdominio', horarioController.buscarHorarios);
router.put('/horarios/:subdominio', horarioController.atualizarHorarios);
router.get('/horarios/disponibilidade/:subdominio', horarioController.verificarDisponibilidade);

module.exports = router;