const express = require('express');
const router = express.Router();

// Importar controllers
const produtoController = require('./controllers/produtoController');
const categoriaController = require('./controllers/categoriaController');
const complementoController = require('./controllers/complementoController');
const pedidoController = require('./controllers/pedidoController');
const horarioController = require('./controllers/horarioController');

// ==========================================
// ROTA DE TESTE
// ==========================================
router.get('/teste', (req, res) => {
    res.json({ 
        mensagem: '✅ API funcionando corretamente!', 
        timestamp: new Date().toISOString(),
        rotas: [
            '/api/status',
            '/api/produtos',
            '/api/categorias',
            '/api/complementos',
            '/api/pedidos',
            '/api/horarios'
        ]
    });
});

// ==========================================
// STATUS DA API
// ==========================================
router.get('/status', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString(),
        versao: '1.0.0'
    });
});

// ==========================================
// CATEGORIAS
// ==========================================
router.get('/categorias', categoriaController.listar);
router.post('/categorias', categoriaController.criar);
router.put('/categorias/:id', categoriaController.atualizar);
router.delete('/categorias/:id', categoriaController.excluir);

// ==========================================
// PRODUTOS
// ==========================================
router.get('/produtos', produtoController.listar);
router.post('/produtos', produtoController.criar);
router.put('/produtos/:id', produtoController.atualizar);
router.delete('/produtos/:id', produtoController.excluir);

// ==========================================
// COMPLEMENTOS
// ==========================================
router.get('/complementos', complementoController.listar);
router.post('/complementos', complementoController.criarItem);
router.put('/complementos/:id', complementoController.atualizarItem);
router.delete('/complementos/:id', complementoController.excluirItem);

// ==========================================
// GRUPOS DE COMPLEMENTOS
// ==========================================
router.get('/grupos/:id/itens', complementoController.listarItensDoGrupo);
router.post('/grupos/:grupoId/item/:itemId', complementoController.vincularItemAoGrupo);
router.delete('/grupos/:grupoId/item/:itemId', complementoController.removerItemDoGrupo);

// ==========================================
// PEDIDOS
// ==========================================
router.get('/pedidos', pedidoController.listar);
router.post('/pedidos', pedidoController.criar);
router.put('/pedidos/:id', pedidoController.atualizarStatus);

// ==========================================
// HORÁRIOS DA LOJA
// ==========================================
router.get('/horarios', horarioController.listar);
router.put('/horarios/:id', horarioController.atualizar);

// ==========================================
// ROTA NÃO ENCONTRADA (404)
// ==========================================
router.use('*', (req, res) => {
    res.status(404).json({ 
        erro: 'Rota não encontrada',
        rota: req.originalUrl,
        sugestao: 'Consulte /api/teste para ver as rotas disponíveis'
    });
});

module.exports = router;