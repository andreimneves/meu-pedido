// backend/src/controllers/categoriaController.js
const BaseModel = require('../models/BaseModel');
const categoriaModel = new BaseModel('categorias');

const categoriaController = {
    // Listar todas as categorias
    async listar(req, res) {
        try {
            const tenantId = 1;
            const categorias = await categoriaModel.findAll(tenantId);
            res.json(categorias);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // Criar nova categoria
    async criar(req, res) {
        try {
            const tenantId = 1;
            const categoria = {
                ...req.body,
                tenant_id: tenantId
            };
            
            const novaCategoria = await categoriaModel.create(categoria);
            res.status(201).json(novaCategoria);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // Atualizar categoria
    async atualizar(req, res) {
        try {
            const { id } = req.params;
            const tenantId = 1;
            
            const categoriaAtualizada = await categoriaModel.update(id, tenantId, req.body);
            
            if (!categoriaAtualizada) {
                return res.status(404).json({ erro: 'Categoria não encontrada' });
            }
            
            res.json(categoriaAtualizada);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    },

    // Deletar categoria
    async deletar(req, res) {
        try {
            const { id } = req.params;
            const tenantId = 1;
            
            const deletado = await categoriaModel.delete(id, tenantId);
            
            if (!deletado) {
                return res.status(404).json({ erro: 'Categoria não encontrada' });
            }
            
            res.json({ mensagem: 'Categoria deletada com sucesso' });
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    }
};

module.exports = categoriaController;