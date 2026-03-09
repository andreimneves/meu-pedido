const express = require('express');
const router = express.Router();

// ===============================
// IMPORTAR CONTROLLERS
// ===============================
const produtoController = require('../controllers/produtoController');
const categoriaController = require('../controllers/categoriaController');
const pedidoController = require('../controllers/pedidoController');
const complementoController = require('../controllers/complementoController');

// Upload protegido (não quebra se faltar)
try {
    const upload = require('../config/upload');
    const uploadController = require('../controllers/uploadController');

    router.post(
        '/upload',
        upload.single('imagem'),
        uploadController.uploadImagem
    );
} catch (e) {
    console.log('⚠ Upload não carregado');
}

// ==========================================
// CATEGORIAS
// ==========================================
router.get('/categorias', categoriaController.listar);
router.get('/categorias/:id', categoriaController.buscarPorId);
router.post('/categorias', categoriaController.criar);
router.put('/categorias/:id', categoriaController.atualizar);
router.delete('/categorias/:id', categoriaController.excluir);

// ==========================================
// PRODUTOS
// ==========================================
router.get('/produtos', produtoController.listarTodos);
router.get('/produtos/:id', produtoController.buscarPorId);
router.post('/produtos', produtoController.criar);
router.put('/produtos/:id', produtoController.atualizar);
router.delete('/produtos/:id', produtoController.excluir);

// Cardápio público
router.get('/cardapio/:subdominio', produtoController.cardapio);

// ==========================================
// PEDIDOS
// ==========================================
router.post('/pedidos', pedidoController.criarPedido);

router.get('/pedidos/:subdominio', pedidoController.listarPedidos);

router.get('/pedidos/:subdominio/:id', pedidoController.buscarPedido);

router.put(
    '/pedidos/:subdominio/:id/status',
    pedidoController.atualizarStatus
);

// Dashboard
router.get('/dashboard/:subdominio', pedidoController.dashboard);

// ==========================================
// COMPLEMENTOS
// ==========================================

// GRUPOS
router.get('/grupos-complementos', complementoController.listarGrupos);

router.post('/grupos-complementos', complementoController.criarGrupo);

router.put('/grupos-complementos/:id', complementoController.atualizarGrupo);

router.delete('/grupos-complementos/:id', complementoController.excluirGrupo);

// ITENS
router.get('/complementos', complementoController.listarItens);

router.post('/complementos', complementoController.criarItem);

router.put('/complementos/:id', complementoController.atualizarItem);

router.delete('/complementos/:id', complementoController.excluirItem);

// ==========================================
// ITENS DENTRO DO GRUPO
// ==========================================

router.get(
    '/grupo-complementos/:id/itens',
    complementoController.listarItensDoGrupo
);

router.post(
    '/grupos/:grupoId/itens/:itemId',
    complementoController.vincularItemAoGrupo
);

router.delete(
    '/grupos/:grupoId/itens/:itemId',
    complementoController.removerItemDoGrupo
);

// ==========================================
// GRUPOS DO PRODUTO
// ==========================================

router.get(
    '/produtos/:produtoId/grupos',
    complementoController.listarGruposDoProduto
);

router.post(
    '/produtos/:produtoId/grupos',
    complementoController.vincularGruposProduto
);

// compatibilidade com frontend antigo
router.get(
    '/complementos/produto/:produtoId',
    complementoController.listarGruposDoProduto
);

router.put(
    '/complementos/produto/:produtoId/vincular',
    complementoController.vincularGruposProduto
);

module.exports = router;