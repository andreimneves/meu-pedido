// backend/src/models/ProdutoModel.js
// Modelo específico para produtos, herdando de BaseModel

const BaseModel = require('./BaseModel');

class ProdutoModel extends BaseModel {
    constructor() {
        super('produtos'); // Nome da tabela no banco
    }

    /**
     * Buscar produtos por categoria
     * @param {number} categoriaId - ID da categoria
     * @param {number} tenantId - ID do tenant
     * @returns {Promise<Array>} - Lista de produtos da categoria
     */
    async findByCategoria(categoriaId, tenantId) {
        try {
            const query = `SELECT p.*, c.nome as categoria_nome 
                          FROM produtos p
                          LEFT JOIN categorias c ON p.categoria_id = c.id
                          WHERE p.categoria_id = $1 AND p.tenant_id = $2
                          ORDER BY p.nome`;
            const result = await this.pool.query(query, [categoriaId, tenantId]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar produtos por categoria:', error);
            throw error;
        }
    }

    /**
     * Buscar produtos em destaque
     * @param {number} tenantId - ID do tenant
     * @returns {Promise<Array>} - Lista de produtos em destaque
     */
    async findDestaques(tenantId) {
        try {
            const query = `SELECT p.*, c.nome as categoria_nome 
                          FROM produtos p
                          LEFT JOIN categorias c ON p.categoria_id = c.id
                          WHERE p.destaque = true AND p.tenant_id = $1 AND p.disponivel = true
                          ORDER BY p.nome`;
            const result = await this.pool.query(query, [tenantId]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar produtos em destaque:', error);
            throw error;
        }
    }

    /**
     * Buscar produtos disponíveis (para o cardápio)
     * @param {number} tenantId - ID do tenant
     * @returns {Promise<Array>} - Lista de produtos disponíveis
     */
    async findDisponiveis(tenantId) {
        try {
            const query = `SELECT p.*, c.nome as categoria_nome, c.ordem as categoria_ordem
                          FROM produtos p
                          LEFT JOIN categorias c ON p.categoria_id = c.id
                          WHERE p.tenant_id = $1 AND p.disponivel = true
                          ORDER BY c.ordem, p.nome`;
            const result = await this.pool.query(query, [tenantId]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar produtos disponíveis:', error);
            throw error;
        }
    }

    /**
     * Buscar produto com suas variações
     * @param {number} produtoId - ID do produto
     * @param {number} tenantId - ID do tenant
     * @returns {Promise<Object|null>} - Produto com array de variações
     */
    async findWithVariacoes(produtoId, tenantId) {
        try {
            // Buscar produto
            const produtoQuery = `SELECT p.*, c.nome as categoria_nome 
                                FROM produtos p
                                LEFT JOIN categorias c ON p.categoria_id = c.id
                                WHERE p.id = $1 AND p.tenant_id = $2`;
            const produto = await this.pool.query(produtoQuery, [produtoId, tenantId]);
            
            if (produto.rows.length === 0) {
                return null;
            }

            // Buscar variações (se a tabela existir)
            let variacoes = [];
            try {
                const variacoesQuery = `SELECT * FROM variacoes WHERE produto_id = $1 AND disponivel = true`;
                const variacoesResult = await this.pool.query(variacoesQuery, [produtoId]);
                variacoes = variacoesResult.rows;
            } catch (err) {
                // Tabela de variações pode não existir
                console.log('Tabela variacoes não encontrada');
            }

            return {
                ...produto.rows[0],
                variacoes
            };
        } catch (error) {
            console.error('Erro ao buscar produto com variações:', error);
            throw error;
        }
    }

    /**
     * Buscar produtos por faixa de preço
     * @param {number} tenantId - ID do tenant
     * @param {number} precoMin - Preço mínimo
     * @param {number} precoMax - Preço máximo
     * @returns {Promise<Array>} - Lista de produtos na faixa de preço
     */
    async findByPrecoRange(tenantId, precoMin, precoMax) {
        try {
            const query = `SELECT p.*, c.nome as categoria_nome 
                          FROM produtos p
                          LEFT JOIN categorias c ON p.categoria_id = c.id
                          WHERE p.tenant_id = $1 
                          AND p.preco BETWEEN $2 AND $3
                          AND p.disponivel = true
                          ORDER BY p.preco`;
            const result = await this.pool.query(query, [tenantId, precoMin, precoMax]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar produtos por faixa de preço:', error);
            throw error;
        }
    }

    /**
     * Buscar produtos por nome (busca parcial)
     * @param {number} tenantId - ID do tenant
     * @param {string} termo - Termo de busca
     * @returns {Promise<Array>} - Lista de produtos que contêm o termo no nome
     */
    async searchByNome(tenantId, termo) {
        try {
            const query = `SELECT p.*, c.nome as categoria_nome 
                          FROM produtos p
                          LEFT JOIN categorias c ON p.categoria_id = c.id
                          WHERE p.tenant_id = $1 
                          AND p.nome ILIKE $2
                          AND p.disponivel = true
                          ORDER BY p.nome`;
            const result = await this.pool.query(query, [tenantId, `%${termo}%`]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar produtos por nome:', error);
            throw error;
        }
    }

    /**
     * Atualizar disponibilidade em lote
     * @param {Array} produtoIds - Array de IDs de produtos
     * @param {boolean} disponivel - Status de disponibilidade
     * @param {number} tenantId - ID do tenant
     * @returns {Promise<number>} - Número de produtos atualizados
     */
    async updateDisponibilidadeLote(produtoIds, disponivel, tenantId) {
        try {
            const query = `UPDATE produtos 
                          SET disponivel = $1, updated_at = NOW()
                          WHERE id = ANY($2::int[]) AND tenant_id = $3
                          RETURNING id`;
            const result = await this.pool.query(query, [disponivel, produtoIds, tenantId]);
            return result.rowCount;
        } catch (error) {
            console.error('Erro ao atualizar disponibilidade em lote:', error);
            throw error;
        }
    }

    /**
     * Buscar produtos mais vendidos (requer tabela de pedidos)
     * @param {number} tenantId - ID do tenant
     * @param {number} limite - Número máximo de produtos
     * @returns {Promise<Array>} - Lista dos produtos mais vendidos
     */
    async findMaisVendidos(tenantId, limite = 10) {
        try {
            // Esta query assume que existe a tabela itens_pedido
            const query = `
                SELECT p.id, p.nome, p.preco, 
                       COUNT(ip.id) as total_vendas,
                       SUM(ip.quantidade) as quantidade_total
                FROM produtos p
                LEFT JOIN itens_pedido ip ON p.id = ip.produto_id
                WHERE p.tenant_id = $1
                GROUP BY p.id
                ORDER BY quantidade_total DESC NULLS LAST
                LIMIT $2
            `;
            
            const result = await this.pool.query(query, [tenantId, limite]);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar produtos mais vendidos:', error);
            // Se a tabela não existir, retorna array vazio
            return [];
        }
    }

    /**
     * Atualizar preço em lote com percentual
     * @param {number} tenantId - ID do tenant
     * @param {number} percentual - Percentual de aumento (positivo) ou desconto (negativo)
     * @param {number|null} categoriaId - Filtrar por categoria (opcional)
     * @returns {Promise<number>} - Número de produtos atualizados
     */
    async atualizarPrecoPercentual(tenantId, percentual, categoriaId = null) {
        try {
            let query, params;
            
            if (categoriaId) {
                query = `UPDATE produtos 
                        SET preco = preco * (1 + $1::decimal / 100),
                            updated_at = NOW()
                        WHERE tenant_id = $2 AND categoria_id = $3
                        RETURNING id`;
                params = [percentual, tenantId, categoriaId];
            } else {
                query = `UPDATE produtos 
                        SET preco = preco * (1 + $1::decimal / 100),
                            updated_at = NOW()
                        WHERE tenant_id = $2
                        RETURNING id`;
                params = [percentual, tenantId];
            }
            
            const result = await this.pool.query(query, params);
            return result.rowCount;
        } catch (error) {
            console.error('Erro ao atualizar preço em lote:', error);
            throw error;
        }
    }

    /**
     * Clonar produto (para criar produtos similares)
     * @param {number} produtoId - ID do produto a ser clonado
     * @param {number} tenantId - ID do tenant
     * @param {string} novoNome - Nome do novo produto (opcional)
     * @returns {Promise<Object>} - Novo produto criado
     */
    async cloneProduto(produtoId, tenantId, novoNome = null) {
        const client = await this.beginTransaction();
        
        try {
            // Buscar produto original
            const original = await this.findById(produtoId, tenantId);
            if (!original) {
                throw new Error('Produto original não encontrado');
            }
            
            // Criar novo produto com dados do original
            const novoProduto = {
                tenant_id: tenantId,
                categoria_id: original.categoria_id,
                nome: novoNome || `${original.nome} (cópia)`,
                descricao: original.descricao,
                preco: original.preco,
                destaque: false,
                disponivel: true
            };
            
            const result = await this.create(novoProduto);
            
            await this.commitTransaction(client);
            return result;
            
        } catch (error) {
            await this.rollbackTransaction(client);
            console.error('Erro ao clonar produto:', error);
            throw error;
        }
    }

    /**
     * Estatísticas de produtos
     * @param {number} tenantId - ID do tenant
     * @returns {Promise<Object>} - Estatísticas
     */
    async getStats(tenantId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN disponivel THEN 1 END) as disponiveis,
                    COUNT(CASE WHEN destaque THEN 1 END) as destaques,
                    MIN(preco) as preco_min,
                    MAX(preco) as preco_max,
                    AVG(preco) as preco_medio,
                    COUNT(DISTINCT categoria_id) as total_categorias
                FROM produtos
                WHERE tenant_id = $1
            `;
            
            const result = await this.pool.query(query, [tenantId]);
            
            return {
                total: parseInt(result.rows[0].total),
                disponiveis: parseInt(result.rows[0].disponiveis),
                destaques: parseInt(result.rows[0].destaques),
                preco_min: parseFloat(result.rows[0].preco_min || 0),
                preco_max: parseFloat(result.rows[0].preco_max || 0),
                preco_medio: parseFloat(result.rows[0].preco_medio || 0),
                total_categorias: parseInt(result.rows[0].total_categorias || 0)
            };
        } catch (error) {
            console.error('Erro ao buscar estatísticas de produtos:', error);
            throw error;
        }
    }
}

module.exports = ProdutoModel;