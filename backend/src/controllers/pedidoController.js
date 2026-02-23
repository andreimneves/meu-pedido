// backend/src/controllers/pedidoController.js
const pool = require('../config/database');

const pedidoController = {
    // Criar pedido
    async criarPedido(req, res) {
        try {
            res.json({ mensagem: 'Função criarPedido - em desenvolvimento' });
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // Listar pedidos
    async listarPedidos(req, res) {
        try {
            res.json({ mensagem: 'Função listarPedidos - em desenvolvimento' });
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // Buscar pedido específico
    async buscarPedido(req, res) {
        try {
            res.json({ mensagem: 'Função buscarPedido - em desenvolvimento' });
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // ATUALIZAR STATUS - esta é a que estava causando o erro
    async atualizarStatus(req, res) {
        try {
            const { subdominio, id } = req.params;
            const { status } = req.body;
            
            console.log('📝 Atualizando status:', { subdominio, id, status });
            
            res.json({ 
                mensagem: 'Status atualizado com sucesso (modo desenvolvimento)',
                dados: { subdominio, id, status }
            });
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            res.status(500).json({ erro: error.message });
        }
    },

    // Excluir pedido
    async excluirPedido(req, res) {
        try {
            res.json({ mensagem: 'Função excluirPedido - em desenvolvimento' });
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // Dashboard
    async resumoDashboard(req, res) {
        try {
            res.json({ 
                hoje: { pedidos: 0, faturamento: 0 },
                ultimos_pedidos: [],
                status: []
            });
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = pedidoController;