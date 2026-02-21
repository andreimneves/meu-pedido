// backend/src/controllers/produtoController.js
const ProdutoModel = require('../models/ProdutoModel');
const produtoModel = new ProdutoModel();

const produtoController = {
    // Listar todos os produtos
    async listar(req, res) {
        try {
            const tenantId = 1; // Por enquanto fixo (DL Crepes)
            const produtos = await produtoModel.findDisponiveis(tenantId);
            res.json(produtos);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // Buscar um produto
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;
            const tenantId = 1;
            const produto = await produtoModel.findById(id, tenantId);
            
            if (!produto) {
                return res.status(404).json({ erro: 'Produto não encontrado' });
            }
            
            res.json(produto);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // Criar novo produto
    async criar(req, res) {
        try {
            const tenantId = 1;
            const produto = {
                ...req.body,
                tenant_id: tenantId
            };
            
            const novoProduto = await produtoModel.create(produto);
            res.status(201).json(novoProduto);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // Atualizar produto
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const tenantId = 1;
            
            const produtoAtualizado = await produtoModel.update(id, tenantId, req.body);
            
            if (!produtoAtualizado) {
                return res.status(404).json({ erro: 'Produto não encontrado' });
            }
            
            res.json(produtoAtualizado);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // Deletar produto
    async deletar(req, res) {
        try {
            const { id } = req.params;
            const tenantId = 1;
            
            const deletado = await produtoModel.delete(id, tenantId);
            
            if (!deletado) {
                return res.status(404).json({ erro: 'Produto não encontrado' });
            }
            
            res.json({ mensagem: 'Produto deletado com sucesso' });
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = produtoController;