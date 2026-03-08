const API = "/api";

const dias = [
"Domingo",
"Segunda",
"Terça",
"Quarta",
"Quinta",
"Sexta",
"Sábado"
];

async function carregar(){

const res = await fetch(API+"/horarios");

const dados = await res.json();

const tabela = document.getElementById("horariosTable");

tabela.innerHTML="";

dados.forEach(h=>{

tabela.innerHTML+=`

<tr>

<td>${dias[h.dia_semana]}</td>

<td>
<input type="checkbox" id="aberto${h.id}" ${h.aberto?"checked":""}>
</td>

<td>
<input type="time" id="abre${h.id}" value="${h.abre}">
</td>

<td>
<input type="time" id="fecha${h.id}" value="${h.fecha}">
</td>

<td>
<input type="time" id="dabre${h.id}" value="${h.delivery_abre}">
</td>

<td>
<input type="time" id="dfecha${h.id}" value="${h.delivery_fecha}">
</td>

<td>
<button onclick="salvar(${h.id})">Salvar</button>
</td>

</tr>

`;

});

}

async function salvar(id){

const aberto=document.getElementById("aberto"+id).checked;
const abre=document.getElementById("abre"+id).value;
const fecha=document.getElementById("fecha"+id).value;
const dabre=document.getElementById("dabre"+id).value;
const dfecha=document.getElementById("dfecha"+id).value;

await fetch(API+"/horarios/"+id,{
method:"PUT",
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
aberto,
abre,
fecha,
delivery_abre:dabre,
delivery_fecha:dfecha
})
});

alert("Salvo!");

}

carregar();