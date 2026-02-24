// backend/src/models/BaseModel.js
// Classe base para todos os modelos (abstração de banco de dados)

const pool = require('../config/database');

class BaseModel {
    /**
     * Construtor da classe base
     * @param {string} tableName - Nome da tabela no banco de dados
     */
    constructor(tableName) {
        this.tableName = tableName;
        this.pool = pool;
    }

    /**
     * Buscar todos os registros de um tenant
     * @param {number} tenantId - ID do tenant (cliente)
     * @returns {Promise<Array>} - Lista de registros
     */
    async findAll(tenantId) {
        try {
            const query = `SELECT * FROM ${this.tableName} WHERE tenant_id = $1 ORDER BY id`;
            const result = await this.pool.query(query, [tenantId]);
            return result.rows;
        } catch (error) {
            console.error(`Erro ao buscar ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Buscar todos os registros sem filtro de tenant (para admin master)
     * @returns {Promise<Array>} - Lista de todos os registros
     */
    async findAllMaster() {
        try {
            const query = `SELECT * FROM ${this.tableName} ORDER BY id`;
            const result = await this.pool.query(query);
            return result.rows;
        } catch (error) {
            console.error(`Erro ao buscar ${this.tableName} (master):`, error);
            throw error;
        }
    }

    /**
     * Buscar um registro por ID
     * @param {number} id - ID do registro
     * @param {number} tenantId - ID do tenant (opcional para validação)
     * @returns {Promise<Object|null>} - Registro encontrado ou null
     */
    async findById(id, tenantId = null) {
        try {
            let query, params;
            
            if (tenantId) {
                query = `SELECT * FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2`;
                params = [id, tenantId];
            } else {
                query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
                params = [id];
            }
            
            const result = await this.pool.query(query, params);
            return result.rows[0] || null;
        } catch (error) {
            console.error(`Erro ao buscar ${this.tableName} por ID:`, error);
            throw error;
        }
    }

    /**
     * Buscar registros com filtro personalizado
     * @param {Object} filters - Objeto com filtros (ex: { campo: valor })
     * @param {number} tenantId - ID do tenant
     * @returns {Promise<Array>} - Lista de registros
     */
    async findBy(filters, tenantId) {
        try {
            const keys = Object.keys(filters);
            const conditions = keys.map((key, index) => `${key} = $${index + 2}`).join(' AND ');
            
            const query = `SELECT * FROM ${this.tableName} WHERE tenant_id = $1 AND ${conditions}`;
            const values = [tenantId, ...Object.values(filters)];
            
            const result = await this.pool.query(query, values);
            return result.rows;
        } catch (error) {
            console.error(`Erro ao buscar ${this.tableName} com filtros:`, error);
            throw error;
        }
    }

    /**
     * Criar um novo registro
     * @param {Object} data - Dados do registro
     * @returns {Promise<Object>} - Registro criado
     */
    async create(data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
            
            const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) 
                          VALUES (${placeholders}) RETURNING *`;
            
            const result = await this.pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error(`Erro ao criar ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Atualizar um registro
     * @param {number} id - ID do registro
     * @param {Object} data - Dados para atualizar
     * @param {number} tenantId - ID do tenant (para validação)
     * @returns {Promise<Object|null>} - Registro atualizado ou null
     */
    async update(id, tenantId, data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            
            // Construir SET clause: campo1 = $1, campo2 = $2, ...
            const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
            
            // Adicionar data de atualização automaticamente
            const query = `UPDATE ${this.tableName} 
                          SET ${setClause}, updated_at = NOW()
                          WHERE id = $${keys.length + 1} AND tenant_id = $${keys.length + 2} 
                          RETURNING *`;
            
            const result = await this.pool.query(query, [...values, id, tenantId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error(`Erro ao atualizar ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Deletar um registro
     * @param {number} id - ID do registro
     * @param {number} tenantId - ID do tenant (para validação)
     * @returns {Promise<boolean>} - true se deletado, false se não encontrado
     */
    async delete(id, tenantId) {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2 RETURNING id`;
            const result = await this.pool.query(query, [id, tenantId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error(`Erro ao deletar ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Contar registros
     * @param {number} tenantId - ID do tenant
     * @returns {Promise<number>} - Número de registros
     */
    async count(tenantId) {
        try {
            const query = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE tenant_id = $1`;
            const result = await this.pool.query(query, [tenantId]);
            return parseInt(result.rows[0].total);
        } catch (error) {
            console.error(`Erro ao contar ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Verificar se existe um registro
     * @param {Object} conditions - Condições para verificar
     * @param {number} tenantId - ID do tenant
     * @returns {Promise<boolean>} - true se existir
     */
    async exists(conditions, tenantId) {
        try {
            const keys = Object.keys(conditions);
            const whereClause = keys.map((key, index) => `${key} = $${index + 2}`).join(' AND ');
            
            const query = `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE tenant_id = $1 AND ${whereClause})`;
            const result = await this.pool.query(query, [tenantId, ...Object.values(conditions)]);
            
            return result.rows[0].exists;
        } catch (error) {
            console.error(`Erro ao verificar existência em ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Buscar com paginação
     * @param {number} tenantId - ID do tenant
     * @param {number} page - Número da página (começa em 1)
     * @param {number} limit - Itens por página
     * @returns {Promise<Object>} - { data: [], total, page, limit }
     */
    async paginate(tenantId, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            
            const countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE tenant_id = $1`;
            const countResult = await this.pool.query(countQuery, [tenantId]);
            const total = parseInt(countResult.rows[0].total);
            
            const dataQuery = `SELECT * FROM ${this.tableName} 
                              WHERE tenant_id = $1 
                              ORDER BY id 
                              LIMIT $2 OFFSET $3`;
            const dataResult = await this.pool.query(dataQuery, [tenantId, limit, offset]);
            
            return {
                data: dataResult.rows,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error(`Erro ao paginar ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Executar query personalizada (com segurança)
     * @param {string} query - Query SQL
     * @param {Array} params - Parâmetros da query
     * @returns {Promise<Array>} - Resultado da query
     */
    async rawQuery(query, params = []) {
        try {
            const result = await this.pool.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Erro na query personalizada:', error);
            throw error;
        }
    }

    /**
     * Iniciar transação
     * @returns {Promise<Object>} - Cliente para transação
     */
    async beginTransaction() {
        const client = await this.pool.connect();
        await client.query('BEGIN');
        return client;
    }

    /**
     * Commit transação
     * @param {Object} client - Cliente da transação
     */
    async commitTransaction(client) {
        await client.query('COMMIT');
        client.release();
    }

    /**
     * Rollback transação
     * @param {Object} client - Cliente da transação
     */
    async rollbackTransaction(client) {
        await client.query('ROLLBACK');
        client.release();
    }
}

module.exports = BaseModel;