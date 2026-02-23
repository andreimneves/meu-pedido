// backend/src/config/database.js - VERSÃO MÍNIMA
console.log('⚠️ MODO MÍNIMO: Banco de dados desativado');

module.exports = {
    query: () => console.log('Banco não disponível'),
    connect: () => {}
};