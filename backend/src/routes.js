const express = require('express');
const router = express.Router();

// rotas de complementos
const complementosRoutes = require('./routes/complementos');

// registrar rotas
router.use(complementosRoutes);

// rota de teste
router.get('/status', (req, res) => {
    res.json({
        status: 'ok',
        mensagem: 'API funcionando'
    });
});

module.exports = router;