// backend/src/controllers/configController.js
const configController = {
    async buscarConfiguracoes(req, res) {
        res.json({
            nome_loja: 'DL Crepes',
            slogan: 'Teste',
            horario_funcionamento: '18h às 23h'
        });
    },
    async atualizarConfiguracoes(req, res) {
        res.json({ mensagem: 'Configurações atualizadas' });
    }
};

module.exports = configController;