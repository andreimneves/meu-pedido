const pool = require('../config/database')

const complementoController = {

async listarGrupos(req,res){
try{

const result = await pool.query(
`SELECT *
FROM grupos_complementos
ORDER BY ordem,id`
)

res.json(result.rows)

}catch(error){
res.status(500).json({erro:error.message})
}
},

async criarGrupo(req,res){

try{

const {nome,obrigatorio,limite_selecao,minimo_selecao,ordem} = req.body

const result = await pool.query(
`INSERT INTO grupos_complementos
(nome,obrigatorio,limite_selecao,minimo_selecao,ordem)
VALUES($1,$2,$3,$4,$5)
RETURNING *`,
[
nome,
obrigatorio || false,
limite_selecao || 1,
minimo_selecao || 0,
ordem || 0
]
)

res.json(result.rows[0])

}catch(error){
res.status(500).json({erro:error.message})
}
},

async atualizarGrupo(req,res){

try{

const {id} = req.params
const {nome,obrigatorio,limite_selecao,minimo_selecao,ordem} = req.body

const result = await pool.query(
`UPDATE grupos_complementos
SET nome=$1,
obrigatorio=$2,
limite_selecao=$3,
minimo_selecao=$4,
ordem=$5
WHERE id=$6
RETURNING *`,
[
nome,
obrigatorio,
limite_selecao,
minimo_selecao,
ordem,
id
]
)

res.json(result.rows[0])

}catch(error){
res.status(500).json({erro:error.message})
}
},

async excluirGrupo(req,res){

try{

const {id} = req.params

await pool.query(
`DELETE FROM grupo_itens
WHERE grupo_id=$1`,
[id]
)

await pool.query(
`DELETE FROM vinculo_produto_grupo
WHERE grupo_id=$1`,
[id]
)

await pool.query(
`DELETE FROM grupos_complementos
WHERE id=$1`,
[id]
)

res.json({mensagem:"grupo removido"})

}catch(error){
res.status(500).json({erro:error.message})
}
},

async listarItens(req,res){

try{

const result = await pool.query(
`SELECT *
FROM complementos
ORDER BY nome`
)

res.json(result.rows)

}catch(error){
res.status(500).json({erro:error.message})
}
},

async criarItem(req,res){

try{

const {nome,preco,disponivel} = req.body

const result = await pool.query(
`INSERT INTO complementos
(nome,preco,disponivel)
VALUES($1,$2,$3)
RETURNING *`,
[
nome,
preco || 0,
disponivel !== false
]
)

res.json(result.rows[0])

}catch(error){
res.status(500).json({erro:error.message})
}
},

async atualizarItem(req,res){

try{

const {id} = req.params
const {nome,preco,disponivel} = req.body

const result = await pool.query(
`UPDATE complementos
SET nome=$1,
preco=$2,
disponivel=$3
WHERE id=$4
RETURNING *`,
[
nome,
preco,
disponivel,
id
]
)

res.json(result.rows[0])

}catch(error){
res.status(500).json({erro:error.message})
}
},

async excluirItem(req,res){

try{

const {id} = req.params

await pool.query(
`DELETE FROM grupo_itens
WHERE item_id=$1`,
[id]
)

await pool.query(
`DELETE FROM complementos
WHERE id=$1`,
[id]
)

res.json({mensagem:"item removido"})

}catch(error){
res.status(500).json({erro:error.message})
}
},

async listarItensDoGrupo(req,res){

try{

const {id} = req.params

const result = await pool.query(
`SELECT c.*
FROM complementos c
INNER JOIN grupo_itens gi
ON c.id = gi.item_id
WHERE gi.grupo_id=$1
ORDER BY c.nome`,
[id]
)

res.json(result.rows)

}catch(error){
res.status(500).json({erro:error.message})
}
},

async vincularItemAoGrupo(req,res){

try{

const {grupoId,itemId} = req.params

await pool.query(
`INSERT INTO grupo_itens
(grupo_id,item_id)
VALUES($1,$2)`,
[grupoId,itemId]
)

res.json({mensagem:"item vinculado"})

}catch(error){
res.status(500).json({erro:error.message})
}
},

async removerItemDoGrupo(req,res){

try{

const {grupoId,itemId} = req.params

await pool.query(
`DELETE FROM grupo_itens
WHERE grupo_id=$1
AND item_id=$2`,
[grupoId,itemId]
)

res.json({mensagem:"item removido do grupo"})

}catch(error){
res.status(500).json({erro:error.message})
}
},

async listarGruposDoProduto(req,res){

try{

const {produtoId} = req.params

const result = await pool.query(
`SELECT g.*
FROM grupos_complementos g
INNER JOIN vinculo_produto_grupo v
ON g.id = v.grupo_id
WHERE v.produto_id=$1`,
[produtoId]
)

res.json(result.rows)

}catch(error){
res.status(500).json({erro:error.message})
}
},

async vincularGruposProduto(req,res){

try{

const {produtoId} = req.params
const {grupos} = req.body

await pool.query(
`DELETE FROM vinculo_produto_grupo
WHERE produto_id=$1`,
[produtoId]
)

for(let i=0;i<grupos.length;i++){

await pool.query(
`INSERT INTO vinculo_produto_grupo
(produto_id,grupo_id,ordem)
VALUES($1,$2,$3)`,
[produtoId,grupos[i],i]
)

}

res.json({mensagem:"vinculo salvo"})

}catch(error){
res.status(500).json({erro:error.message})
}
}

}

module.exports = complementoController