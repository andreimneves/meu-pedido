const express = require('express');
const router = express.Router();

const produtoController = require('./controllers/produtoController');
const categoriaController = require('./controllers/categoriaController');
const pedidoController = require('./controllers/pedidoController');
const complementoController = require('./controllers/complementoController');
const configController = require('./controllers/configController');
const horarioController = require('./controllers/horarioController');

// Tenta carregar o upload, ignorando se não existir
try {
    const upload = require('./config/upload');
    const uploadController = require('./controllers/uploadController');
    router.post('/upload', upload.single('imagem'), uploadController.uploadImagem);
    router.delete('/upload/:filename', uploadController.excluirImagem);
} catch(e) {
    console.log('⚠️ Upload não configurado');
}

// Função segura para evitar erros de controller não implementado
const safe = (fn) => fn || ((req, res) => res.status(501).json({erro: "Função não implementada no controlador."}));

// ==========================================
// CONFIGURAÇÕES DA LOJA
// ==========================================
router.get('/config/:subdominio', safe(configController.buscarConfiguracoes));
router.put('/config/:subdominio', safe(configController.atualizarConfiguracoes));

// ==========================================
// HORÁRIOS (NOVO)
// ==========================================
router.get('/horarios/:subdominio', safe(horarioController.buscarHorarios));
router.put('/horarios/:subdominio', safe(horarioController.atualizarHorarios));
router.post('/horarios/verificar/:subdominio', safe(horarioController.verificarDisponibilidade));

// ==========================================
// CATEGORIAS
// ==========================================
router.get('/categorias', safe(categoriaController.listar));
router.get('/categorias/:id', safe(categoriaController.buscarPorId));
router.post('/categorias', safe(categoriaController.criar));
router.put('/categorias/:id', safe(categoriaController.atualizar));
router.delete('/categorias/:id', safe(categoriaController.excluir));

// ==========================================
// PRODUTOS E CARDÁPIO
// ==========================================
router.get('/produtos', safe(produtoController.listarTodos));
router.get('/produtos/:id', safe(produtoController.buscarPorId));
router.post('/produtos', safe(produtoController.criar));
router.put('/produtos/:id', safe(produtoController.atualizar));
router.delete('/produtos/:id', safe(produtoController.excluir));
router.get('/cardapio/:subdominio', safe(produtoController.cardapio));

// ==========================================
// PEDIDOS E DASHBOARD
// ==========================================
router.post('/pedidos', safe(pedidoController.criarPedido));
router.get('/pedidos/:subdominio', safe(pedidoController.listarPedidos));
router.get('/pedidos/:subdominio/:id', safe(pedidoController.buscarPedido));
router.put('/pedidos/:subdominio/:id/status', safe(pedidoController.atualizarStatus));
router.get('/dashboard/:subdominio', safe(pedidoController.dashboard));

// ==========================================
// COMPLEMENTOS (GRUPOS E ITENS)
// ==========================================
// Grupos
router.get('/grupos-complementos', safe(complementoController.listarGrupos));
router.post('/grupos-complementos', safe(complementoController.criarGrupo));
router.put('/grupos-complementos/:id', safe(complementoController.atualizarGrupo));
router.delete('/grupos-complementos/:id', safe(complementoController.excluirGrupo));

// Itens
router.get('/complementos', safe(complementoController.listarItens));
router.post('/complementos', safe(complementoController.criarItem));
router.put('/complementos/:id', safe(complementoController.atualizarItem));
router.delete('/complementos/:id', safe(complementoController.excluirItem));

// Vínculos Grupo-Item
router.get('/grupo-complementos/:id/itens', safe(complementoController.listarItensDoGrupo));
router.post('/grupos/:grupoId/itens/:itemId', safe(complementoController.vincularItemAoGrupo));
router.delete('/grupos/:grupoId/itens/:itemId', safe(complementoController.removerItemDoGrupo));

// Vínculos Produto-Grupo (dupla compatibilidade)
router.get('/produtos/:produtoId/grupos', safe(complementoController.listarGruposDoProduto));
router.post('/produtos/:produtoId/grupos', safe(complementoController.vincularGruposProduto));
router.get('/complementos/produto/:produtoId', safe(complementoController.listarGruposDoProduto));
router.put('/complementos/produto/:produtoId/vincular', safe(complementoController.vincularGruposProduto));

// ==========================================
// STATUS E VERIFICAÇÃO
// ==========================================
router.get('/status', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString(),
        versao: '2.0.0'
    });
});

module.exports = router;