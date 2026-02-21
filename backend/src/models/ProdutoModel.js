// backend/src/models/ProdutoModel.js
const BaseModel = require('./BaseModel');

class ProdutoModel extends BaseModel {
    constructor() {
        super('produtos');
    }

    async findByCategoria(categoriaId, tenantId) {
        const query = `SELECT * FROM produtos 
                      WHERE categoria_id = $1 AND tenant_id = $2 
                      ORDER BY nome`;
        const result = await this.pool.query(query, [categoriaId, tenantId]);
        return result.rows;
    }

    async findDisponiveis(tenantId) {
        const query = `SELECT p.*, c.nome as categoria_nome 
                      FROM produtos p
                      LEFT JOIN categorias c ON p.categoria_id = c.id
                      WHERE p.tenant_id = $1 AND p.disponivel = true
                      ORDER BY c.ordem, p.nome`;
        const result = await this.pool.query(query, [tenantId]);
        return result.rows;
    }
}

module.exports = ProdutoModel;