// backend/src/models/BaseModel.js
const pool = require('../config/database');

class BaseModel {
    constructor(tableName) {
        this.tableName = tableName;
        this.pool = pool;
    }

    async findAll(tenantId) {
        const query = `SELECT * FROM ${this.tableName} WHERE tenant_id = $1`;
        const result = await this.pool.query(query, [tenantId]);
        return result.rows;
    }

    async findById(id, tenantId) {
        const query = `SELECT * FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2`;
        const result = await this.pool.query(query, [id, tenantId]);
        return result.rows[0];
    }

    async create(data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) 
                      VALUES (${placeholders}) RETURNING *`;
        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    async update(id, tenantId, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        
        const query = `UPDATE ${this.tableName} 
                      SET ${setClause} 
                      WHERE id = $${keys.length + 1} AND tenant_id = $${keys.length + 2} 
                      RETURNING *`;
        const result = await this.pool.query(query, [...values, id, tenantId]);
        return result.rows[0];
    }

    async delete(id, tenantId) {
        const query = `DELETE FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2 RETURNING id`;
        const result = await this.pool.query(query, [id, tenantId]);
        return result.rowCount > 0;
    }
}

module.exports = BaseModel;