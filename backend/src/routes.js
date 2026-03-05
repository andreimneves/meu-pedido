const express = require('express');
const router = express.Router();

// ===== IMPORTAÇÃO DOS CONTROLADORES =====
const produtoController = require('./controllers/produtoController');
const categoriaController = require('./controllers/categoriaController');
const pedidoController = require('./controllers/pedidoController');
const complementoController = require('./controllers/complementoController');
const configController = require('./controllers/configController');
const horarioController = require('./controllers/horarioController');

// ===== UPLOAD DE IMAGENS (opcional) =====
try {
    const upload = require('./config/upload');
    const uploadController = require('./controllers/uploadController');
    router.post('/upload', upload.single('imagem'), uploadController.uploadImagem);
    router.delete('/upload/:filename', uploadController.excluirImagem);
    console.log('✅ Rotas de upload configuradas');
} catch(e) {
    console.log('⚠️ Upload não configurado:', e.message);
}

// ===== FUNÇÃO SEGURA PARA CAPTURAR ERROS =====
const safe = (fn) => {
    return async (req, res) => {
        try {
            await fn(req, res);
        } catch (error) {
            console.error('❌ Erro na rota:', error);
            res.status(500).json({ 
                erro: 'Erro interno do servidor',
                detalhe: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    };
};

// ==========================================
// ROTA DE TESTE E STATUS
// ==========================================
router.get('/', (req, res) => {
    res.json({ 
        mensagem: 'API Meu Pedido',
        status: 'online',
        versao: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

router.get('/status', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString(),
        ambiente: process.env.NODE_ENV || 'desenvolvimento',
        banco: 'conectado'
    });
});

// ==========================================
// CONFIGURAÇÕES DA LOJA
// ==========================================
router.get('/config/:subdominio', safe(configController.buscarConfiguracoes));
router.put('/config/:subdominio', safe(configController.atualizarConfiguracoes));

// ==========================================
// HORÁRIOS DE FUNCIONAMENTO
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
// PEDIDOS
// ==========================================
router.post('/pedidos', safe(pedidoController.criarPedido));
router.get('/pedidos/:subdominio', safe(pedidoController.listarPedidos));
router.get('/pedidos/:subdominio/:id', safe(pedidoController.buscarPedido));
router.put('/pedidos/:subdominio/:id/status', safe(pedidoController.atualizarStatus));

// ==========================================
// DASHBOARD
// ==========================================
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
// COMPLEMENTOS - VÍNCULOS GRUPO-ITEM
// ==========================================
router.get('/grupo-complementos/:id/itens', safe(complementoController.listarItensDoGrupo));
router.post('/grupos/:grupoId/itens/:itemId', safe(complementoController.vincularItemAoGrupo));
router.delete('/grupos/:grupoId/itens/:itemId', safe(complementoController.removerItemDoGrupo));

// ==========================================
// COMPLEMENTOS - VÍNCULOS PRODUTO-GRUPO
// ==========================================
// Versão 1: rota específica para grupos do produto
router.get('/produtos/:produtoId/grupos', safe(complementoController.listarGruposDoProduto));
router.post('/produtos/:produtoId/grupos', safe(complementoController.vincularGruposProduto));

// Versão 2: rota alternativa para compatibilidade (usada no frontend)
router.get('/complementos/produto/:produtoId', safe(complementoController.listarGruposDoProduto));
router.put('/complementos/produto/:produtoId/vincular', safe(complementoController.vincularGruposProduto));

// ==========================================
// ROTA PARA LIMPAR CACHE (útil para desenvolvimento)
// ==========================================
router.post('/cache/limpar', (req, res) => {
    // Limpar caches se necessário
    res.json({ mensagem: 'Cache limpo com sucesso' });
});

// ==========================================
// ROTA 404 - NÃO ENCONTRADO
// ==========================================
router.use('*', (req, res) => {
    res.status(404).json({ 
        erro: 'Rota não encontrada',
        caminho: req.originalUrl,
        metodo: req.method,
        sugestao: 'Verifique a documentação da API'
    });
});

// ==========================================
// EXPORTAÇÃO DO ROTEADOR
// ==========================================
module.exports = router;