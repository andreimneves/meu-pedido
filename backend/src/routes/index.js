const express = require('express');
const router = express.Router();

// Importar os controladores com o caminho correto
const produtoController = require('../controllers/produtoController');
const categoriaController = require('../controllers/categoriaController');
const pedidoController = require('../controllers/pedidoController');
const complementoController = require('../controllers/complementoController');

// Tenta carregar o upload, ignorando se não existir para não travar o servidor
try {
    const upload = require('../config/upload');
    const uploadController = require('../controllers/uploadController');
    router.post('/upload', upload.single('imagem'), uploadController.uploadImagem);
} catch(e) {}

// ==========================================
// CATEGORIAS
// ==========================================
router.get('/categorias', categoriaController.listar);
router.get('/categorias/:id', categoriaController.buscarPorId);
router.post('/categorias', categoriaController.criar);
router.put('/categorias/:id', categoriaController.atualizar);
router.delete('/categorias/:id', categoriaController.excluir);

// ==========================================
// PRODUTOS E CARDÁPIO
// ==========================================
router.get('/produtos', produtoController.listarTodos);
router.get('/produtos/:id', produtoController.buscarPorId);
router.post('/produtos', produtoController.criar);
router.put('/produtos/:id', produtoController.atualizar);
router.delete('/produtos/:id', produtoController.excluir);
router.get('/cardapio/:subdominio', produtoController.cardapio);

// ==========================================
// PEDIDOS E DASHBOARD
// ==========================================
router.post('/pedidos', pedidoController.criarPedido);
router.get('/pedidos/:subdominio', pedidoController.listarPedidos);
router.get('/pedidos/:subdominio/:id', pedidoController.buscarPedido);
router.put('/pedidos/:subdominio/:id/status', pedidoController.atualizarStatus);
router.get('/dashboard/:subdominio', pedidoController.dashboard);

// ==========================================
// COMPLEMENTOS (BLINDADOS)
// ==========================================
router.get('/grupos-complementos', complementoController.listarGrupos);
router.post('/grupos-complementos', complementoController.criarGrupo);
router.put('/grupos-complementos/:id', complementoController.atualizarGrupo);
router.delete('/grupos-complementos/:id', complementoController.excluirGrupo);

router.get('/complementos', complementoController.listarItens);
router.post('/complementos', complementoController.criarItem);
router.put('/complementos/:id', complementoController.atualizarItem);
router.delete('/complementos/:id', complementoController.excluirItem);

// Ligar/Desligar Item dentro do Grupo
router.get('/grupo-complementos/:id/itens', complementoController.listarItensDoGrupo);
router.post('/grupos/:grupoId/itens/:itemId', complementoController.vincularItemAoGrupo);
router.delete('/grupos/:grupoId/itens/:itemId', complementoController.removerItemDoGrupo);

// Dupla compatibilidade para a gravação no Produto
router.get('/produtos/:produtoId/grupos', complementoController.listarGruposDoProduto);
router.post('/produtos/:produtoId/grupos', complementoController.vincularGruposProduto);
router.get('/complementos/produto/:produtoId', complementoController.listarGruposDoProduto);
router.put('/complementos/produto/:produtoId/vincular', complementoController.vincularGruposProduto);

module.exports = router;