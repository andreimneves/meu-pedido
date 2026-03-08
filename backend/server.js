const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()

app.use(cors())
app.use(express.json())

// SERVIR FRONTEND
app.use(express.static(path.join(__dirname,'public')))

// ROTAS
const adminHorarios = require('./routes/adminHorarios')

app.use(adminHorarios)


// STATUS DA LOJA (USADO PELO SITE)

const pool = require('./config/db')

app.get('/status-loja', async (req,res)=>{

try{

const agora = new Date()

const dia = agora.getDay()

const hora = agora.toTimeString().slice(0,5)

const result = await pool.query(
`
SELECT *
FROM horarios_funcionamento
WHERE dia_semana=$1
AND tipo='loja'
`,[dia]
)

if(result.rows.length==0){

return res.json({
loja_aberta:false,
mensagem:'Fechado hoje'
})

}

const h = result.rows[0]


if(!h.aberto){

return res.json({
loja_aberta:false,
mensagem:'Loja fechada'
})

}


if(hora < h.abre){

return res.json({
loja_aberta:false,
mensagem:`Abre às ${h.abre}`
})

}


if(hora > h.fecha){

return res.json({
loja_aberta:false,
mensagem:'Encerrado hoje'
})

}


res.json({
loja_aberta:true,
delivery_aberto:h.delivery_aberto,
mensagem:'Loja aberta'
})

}catch(err){

res.status(500).json({erro:err.message})

}

})


// PORTA

const PORT = 3000

app.listen(PORT,()=>{

console.log(`Servidor rodando na porta ${PORT}`)

})