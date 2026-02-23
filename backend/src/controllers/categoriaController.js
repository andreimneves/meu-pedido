// backend/src/controllers/categoriaController.js
const categoriaController = {
    async listar(req, res) {
        res.json([
            { id: 1, nome: 'Categoria 1' },
            { id: 2, nome: 'Categoria 2' }
        ]);
    },
    async criar(req, res) {
        res.json({ mensagem: 'Categoria criada', dados: req.body });
    },
    async atualizar(req, res) {
        res.json({ mensagem: 'Categoria atualizada' });
    },
    async deletar(req, res) {
        res.json({ mensagem: 'Categoria deletada' });
    }
};

module.exports = categoriaController;