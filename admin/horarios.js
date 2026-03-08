const express = require('express')
const router = express.Router()

const pool = require('../config/db')


// LISTAR HORÁRIOS

router.get('/admin/horarios', async (req,res)=>{

try{

const result = await pool.query(
`
SELECT *
FROM horarios_funcionamento
WHERE tipo='loja'
ORDER BY dia_semana
`
)

res.json(result.rows)

}catch(err){

res.status(500).json({erro:err.message})

}

})




// ATUALIZAR HORÁRIO

router.put('/admin/horarios/:id', async (req,res)=>{

try{

const {id} = req.params

const {
aberto,
abre,
fecha,
delivery_aberto,
delivery_abre,
delivery_fecha
} = req.body

const result = await pool.query(
`
UPDATE horarios_funcionamento
SET

aberto=$1,
abre=$2,
fecha=$3,
delivery_aberto=$4,
delivery_abre=$5,
delivery_fecha=$6

WHERE id=$7

RETURNING *
`,
[
aberto,
abre,
fecha,
delivery_aberto,
delivery_abre,
delivery_fecha,
id
]
)

res.json(result.rows[0])

}catch(err){

res.status(500).json({erro:err.message})

}

})



// BOTÃO FECHAR LOJA

router.post('/admin/fechar-loja', async(req,res)=>{

try{

await pool.query(`
UPDATE horarios_funcionamento
SET aberto=false
WHERE tipo='loja'
`)

res.json({ok:true})

}catch(err){

res.status(500).json({erro:err.message})

}

})


module.exports = router