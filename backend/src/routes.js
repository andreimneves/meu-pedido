const express = require('express');
const router = express.Router();

// rotas
const complementosRoutes = require('./routes/complementos');

// registrar rotas
router.use(complementosRoutes);

// teste
router.get('/status', (req,res)=>{
    res.json({
        status:"ok",
        api:"rodando"
    })
})

module.exports = router;