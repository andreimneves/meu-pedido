const pool = require('../config/database');

let dbInitPromise = null;

async function garantirTabelasComplementos() {

if (!dbInitPromise) {

dbInitPromise = (async () => {

await pool.query(`
CREATE TABLE IF NOT EXISTS produtos (
id SERIAL PRIMARY KEY,
tenant_id INTEGER DEFAULT 1,
nome VARCHAR(255) NOT NULL,
descricao TEXT,
preco NUMERIC(10,2) DEFAULT 0,
categoria_nome VARCHAR(255),
imagem_url TEXT,
ativo BOOLEAN DEFAULT true
);
`);

await pool.query(`
CREATE TABLE IF NOT EXISTS grupos_complementos (
id SERIAL PRIMARY KEY,
tenant_id INTEGER DEFAULT 1,
nome VARCHAR(255) NOT NULL,
obrigatorio BOOLEAN DEFAULT false,
limite_selecao INTEGER DEFAULT 1,
minimo_selecao INTEGER DEFAULT 0,
ordem INTEGER DEFAULT 0
);
`);

await pool.query(`
CREATE TABLE IF NOT EXISTS complementos (
id SERIAL PRIMARY KEY,
tenant_id INTEGER DEFAULT 1,
nome VARCHAR(255) NOT NULL,
preco NUMERIC(10,2) DEFAULT 0,
categoria_complemento VARCHAR(100) DEFAULT 'geral',
disponivel BOOLEAN DEFAULT true,
ordem INTEGER DEFAULT 0
);
`);

await pool.query(`
CREATE TABLE IF NOT EXISTS grupo_complemento_itens (
id SERIAL PRIMARY KEY,
grupo_id INTEGER,
complemento_id INTEGER,
ordem INTEGER DEFAULT 0
);
`);

await pool.query(`
CREATE TABLE IF NOT EXISTS vinculo_produto_grupo (
produto_id INTEGER,
grupo_id INTEGER,
ordem INTEGER DEFAULT 0
);
`);

})();

}

return dbInitPromise;
}

const complementoController = {


// LISTAR GRUPOS

async listarGrupos(req,res){

await garantirTabelasComplementos()

const result = await pool.query(`
SELECT * FROM grupos_complementos
ORDER BY ordem,id
`)

res.json(result.rows)

},

// CRIAR GRUPO

async criarGrupo(req,res){

await garantirTabelasComplementos()

const {tenant_id,nome,obrigatorio,limite_selecao,minimo_selecao,ordem} = req.body

const result = await pool.query(`
INSERT INTO grupos_complementos
(tenant_id,nome,obrigatorio,minimo_selecao,limite_selecao,ordem)
VALUES ($1,$2,$3,$4,$5,$6)
RETURNING *
`,
[
tenant_id||1,
nome,
obrigatorio||false,
minimo_selecao||0,
limite_selecao||1,
ordem||0
]
)

res.json(result.rows[0])

},

// ITENS

async listarItens(req,res){

await garantirTabelasComplementos()

const result = await pool.query(`
SELECT * FROM complementos
ORDER BY nome
`)

res.json(result.rows)

},

async criarItem(req,res){

await garantirTabelasComplementos()

const {tenant_id,nome,preco,disponivel} = req.body

const result = await pool.query(`
INSERT INTO complementos
(tenant_id,nome,preco,disponivel)
VALUES ($1,$2,$3,$4)
RETURNING *
`,
[
tenant_id||1,
nome,
preco||0,
disponivel!==false
]
)

res.json(result.rows[0])

},

// LISTAR ITENS DO GRUPO

async listarItensDoGrupo(req,res){

await garantirTabelasComplementos()

const {id} = req.params

const result = await pool.query(`
SELECT c.*
FROM complementos c
JOIN grupo_complemento_itens gci
ON gci.complemento_id = c.id
WHERE gci.grupo_id = $1
ORDER BY c.nome
`,[id])

res.json(result.rows)

},

// VINCULAR ITEM

async vincularItemAoGrupo(req,res){

await garantirTabelasComplementos()

const {grupoId,itemId} = req.params

const check = await pool.query(`
SELECT *
FROM grupo_complemento_itens
WHERE grupo_id=$1
AND complemento_id=$2
`,[grupoId,itemId])

if(check.rows.length>0){

return res.status(400).json({
erro:"Item já existe no grupo"
})

}

await pool.query(`
INSERT INTO grupo_complemento_itens
(grupo_id,complemento_id)
VALUES ($1,$2)
`,
[grupoId,itemId]
)

res.json({mensagem:"Item vinculado"})

},

// REMOVER ITEM

async removerItemDoGrupo(req,res){

await garantirTabelasComplementos()

const {grupoId,itemId} = req.params

await pool.query(`
DELETE FROM grupo_complemento_itens
WHERE grupo_id=$1
AND complemento_id=$2
`,
[grupoId,itemId]
)

res.json({mensagem:"Item removido"})

},

// GRUPOS DO PRODUTO

async listarGruposDoProduto(req,res){

await garantirTabelasComplementos()

const {produtoId} = req.params

const result = await pool.query(`
SELECT g.*,v.ordem
FROM grupos_complementos g
JOIN vinculo_produto_grupo v
ON g.id = v.grupo_id
WHERE v.produto_id=$1
ORDER BY v.ordem
`,[produtoId])

res.json(result.rows)

},

async vincularGruposProduto(req,res){

await garantirTabelasComplementos()

const {produtoId} = req.params
const {grupos} = req.body

await pool.query("BEGIN")

await pool.query(`
DELETE FROM vinculo_produto_grupo
WHERE produto_id=$1
`,[produtoId])

for(let i=0;i<grupos.length;i++){

await pool.query(`
INSERT INTO vinculo_produto_grupo
(produto_id,grupo_id,ordem)
VALUES ($1,$2,$3)
`,
[produtoId,grupos[i],i]
)

}

await pool.query("COMMIT")

res.json({mensagem:"Salvo"})

}

}

module.exports = complementoController