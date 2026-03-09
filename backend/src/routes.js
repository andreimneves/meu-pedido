const express = require('express');
const router = express.Router();

// ===============================
// IMPORTAR CONTROLLERS
// ===============================
const produtoController = require('./controllers/produtoController');
const categoriaController = require('./controllers/categoriaController');
const pedidoController = require('./controllers/pedidoController');
const complementoController = require('./controllers/complementoController');
const configController = require('./controllers/configController');

// ===== UPLOAD DE IMAGENS =====
try {
    const upload = require('./config/upload');
    const uploadController = require('./controllers/uploadController');
    router.post('/upload', upload.single('imagem'), uploadController.uploadImagem);
} catch(e) {
    console.log('⚠️ Upload não configurado');
}

// ===== FUNÇÃO SEGURA =====
const safe = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({ erro: error.message });
    }
};

// ===== STATUS =====
router.get('/status', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// ==========================================
// CONFIGURAÇÕES
// ==========================================
router.get('/config/:subdominio', safe(configController.buscarConfiguracoes));
router.put('/config/:subdominio', safe(configController.atualizarConfiguracoes));

// ==========================================
// CATEGORIAS
// ==========================================
router.get('/categorias', safe(categoriaController.listar));
router.get('/categorias/:id', safe(categoriaController.buscarPorId));
router.post('/categorias', safe(categoriaController.criar));
router.put('/categorias/:id', safe(categoriaController.atualizar));
router.delete('/categorias/:id', safe(categoriaController.excluir));

// ==========================================
// PRODUTOS
// ==========================================
router.get('/produtos', safe(produtoController.listarTodos));
router.get('/produtos/:id', safe(produtoController.buscarPorId));
router.post('/produtos', safe(produtoController.criar));
router.put('/produtos/:id', safe(produtoController.atualizar));
router.delete('/produtos/:id', safe(produtoController.excluir));
router.get('/cardapio/:subdominio', safe(produtoController.cardapio));

// ==========================================
// PEDIDOS
// ==========================================
router.post('/pedidos', safe(pedidoController.criarPedido));
router.get('/pedidos/:subdominio', safe(pedidoController.listarPedidos));
router.get('/pedidos/:subdominio/:id', safe(pedidoController.buscarPedido));
router.put('/pedidos/:subdominio/:id/status', safe(pedidoController.atualizarStatus));
router.get('/dashboard/:subdominio', safe(pedidoController.dashboard));

// ==========================================
// COMPLEMENTOS - GRUPOS
// ==========================================
router.get('/grupos-complementos', safe(complementoController.listarGrupos));
router.post('/grupos-complementos', safe(complementoController.criarGrupo));
router.put('/grupos-complementos/:id', safe(complementoController.atualizarGrupo));
router.delete('/grupos-complementos/:id', safe(complementoController.excluirGrupo));

// ==========================================
// COMPLEMENTOS - ITENS
// ==========================================
router.get('/complementos', safe(complementoController.listarItens));
router.post('/complementos', safe(complementoController.criarItem));
router.put('/complementos/:id', safe(complementoController.atualizarItem));
router.delete('/complementos/:id', safe(complementoController.excluirItem));

// ==========================================
// VÍNCULOS GRUPO-ITEM
// ==========================================
router.get('/grupo-complementos/:id/itens', safe(complementoController.listarItensDoGrupo));
router.post('/grupos/:grupoId/itens/:itemId', safe(complementoController.vincularItemAoGrupo));
router.delete('/grupos/:grupoId/itens/:itemId', safe(complementoController.removerItemDoGrupo));

// ==========================================
// VÍNCULOS PRODUTO-GRUPO
// ==========================================
router.get('/produtos/:produtoId/grupos', safe(complementoController.listarGruposDoProduto));
router.post('/produtos/:produtoId/grupos', safe(complementoController.vincularGruposProduto));
router.get('/complementos/produto/:produtoId', safe(complementoController.listarGruposDoProduto));
router.put('/complementos/produto/:produtoId/vincular', safe(complementoController.vincularGruposProduto));

module.exports = router;