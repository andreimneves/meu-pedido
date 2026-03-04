const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:10000/api' : 'https://meu-pedido-backend.onrender.com/api';
const SUBDOMINIO = 'dlcrepes';

let produtos = [], gruposComplementosGlobal = [], itensComplementosGlobal = [], categorias = [], categoriaAtiva = 'Todos';
let carrinho = [], configuracoesLoja = {}, taxaFrete = 0, dentroAreaEntrega = false;
let produtoDetalheAtual = null, quantidadeDetalhe = 1, complementosSelecionados = {};
let coordsLoja = { lat: null, lng: null };
let modoAgendamento = false;

function parseJSONSeguro(texto) {
    if (!texto) return {};
    if (typeof texto === 'object') return texto;
    try { return JSON.parse(texto) || {}; } catch (e) { return {}; }
}

window.onload = async () => {
    await carregarConfiguracoes();
    await carregarTudoDoBanco(); 
};

async function carregarConfiguracoes() {
    try {
        const res = await fetch(`${API_URL}/config/${SUBDOMINIO}`);
        configuracoesLoja = await res.json();
        
        document.getElementById('nomeLoja').textContent = configuracoesLoja.nome_loja || 'Nossa Loja';
        document.getElementById('slogan').textContent = configuracoesLoja.slogan || '';
        document.getElementById('endereco').innerHTML = `📍 ${configuracoesLoja.endereco_completo || ''}`;
        document.getElementById('horario').innerHTML = `🕒 ${configuracoesLoja.horario_funcionamento || 'Consulte os horários'}`;
        
        if (configuracoesLoja.logo_url) { document.getElementById('logoImagem').src = configuracoesLoja.logo_url; document.getElementById('logoImagem').style.display = 'block'; document.getElementById('logoPlaceholder').style.display = 'none'; }

        const isMsgAtiva = String(configuracoesLoja.mensagem_banner_ativo) === 'true';
        const textoMsg = configuracoesLoja.mensagem_banner;
        
        if (isMsgAtiva && textoMsg && textoMsg.trim() !== '') { 
            const msgDiv = document.getElementById('mensagemPersonalizada');
            if(msgDiv) {
                msgDiv.style.backgroundColor = configuracoesLoja.mensagem_banner_cor || '#FFF3E0';
                msgDiv.style.color = configuracoesLoja.mensagem_banner_texto || '#E65100';
                msgDiv.style.borderLeftColor = configuracoesLoja.mensagem_banner_texto || '#E65100';
                msgDiv.innerHTML = `<span style="font-size:16px;">${configuracoesLoja.mensagem_banner_icone || '📢'}</span> <span>${textoMsg}</span>`; 
                msgDiv.style.display = 'flex'; 
            }
        }

        if (configuracoesLoja.cep_loja) {
            fetch(`https://cep.awesomeapi.com.br/json/${configuracoesLoja.cep_loja.replace(/\D/g, '')}`)
            .then(r => r.json()).then(d => { if(d.lat) coordsLoja = {lat: parseFloat(d.lat), lng: parseFloat(d.lng)}; }).catch(e=>{});
        }
    } catch (e) { console.error('Erro configs', e); }
}

function obterStatusHorariosEmTempoReal() {
    let hLoja = parseJSONSeguro(configuracoesLoja.horarios);
    let hDel = parseJSONSeguro(configuracoesLoja.horarios_delivery);
    return { loja: analisarHorarios(hLoja), delivery: analisarHorarios(hDel) };
}

function analisarHorarios(mapaHorarios) {
    if (!mapaHorarios || Object.keys(mapaHorarios).length === 0) return { abertaAgora: true }; 
    const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const agora = new Date();
    const diaAtual = diasSemana[agora.getDay()];
    const diaOntem = diasSemana[(agora.getDay() + 6) % 7];
    const horaAtualFloat = agora.getHours() + (agora.getMinutes() / 60);

    let abertaAgora = false;
    let configHoje = mapaHorarios[diaAtual];
    let configOntem = mapaHorarios[diaOntem];

    if (configOntem && (String(configOntem.ativo) === 'true' || configOntem.ativo === true)) {
        let [abreH] = configOntem.abertura.split(':').map(Number);
        let [fechaH, fechaM] = configOntem.fechamento.split(':').map(Number);
        if (fechaH < abreH && horaAtualFloat <= (fechaH + fechaM/60)) abertaAgora = true;
    }

    if (!abertaAgora && configHoje && (String(configHoje.ativo) === 'true' || configHoje.ativo === true)) {
        let [abreH, abreM] = configHoje.abertura.split(':').map(Number);
        let [fechaH, fechaM] = configHoje.fechamento.split(':').map(Number);
        let aF = abreH + abreM/60; let fF = fechaH + fechaM/60;
        
        if (fF < aF) { if (horaAtualFloat >= aF) abertaAgora = true; } 
        else { if (horaAtualFloat >= aF && horaAtualFloat <= fF) abertaAgora = true; }
    }
    return { abertaAgora };
}

window.mostrarAgendamento = function() {
    document.getElementById('avisoDelivery').style.display = 'none';
    document.getElementById('agendamentoFields').style.display = 'block';
    modoAgendamento = true;
    
    const hoje = new Date();
    const dataMin = hoje.toISOString().split('T')[0];
    document.getElementById('dataAgendamento').min = dataMin;
    document.getElementById('dataAgendamento').value = '';
    document.getElementById('horarioAgendamento').innerHTML = '<option value="">Selecione uma data primeiro</option>';
}

window.carregarHorariosPorData = function() {
    const dataSelecionada = document.getElementById('dataAgendamento').value;
    const select = document.getElementById('horarioAgendamento');

    if (!dataSelecionada) {
        select.innerHTML = '<option value="">Selecione uma data primeiro</option>';
        return;
    }

    const data = new Date(dataSelecionada + 'T12:00:00');
    const diasSemanaMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const diaNomeDB = diasSemanaMap[data.getDay()];

    const isDelivery = document.getElementById('deliveryOption').checked;
    const jsonStr = isDelivery ? configuracoesLoja.horarios_delivery : configuracoesLoja.horarios;
    const mapaHorarios = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : (jsonStr || {});
    
    const horarioDia = mapaHorarios[diaNomeDB];

    if (!horarioDia || (String(horarioDia.ativo) !== 'true' && horarioDia.ativo !== true)) {
        select.innerHTML = '<option value="">❌ Fechado neste dia</option>';
        return;
    }

    const [horaAbertura, minAbertura] = (horarioDia.abertura || '18:00').split(':').map(Number);
    let [horaFechamento, minFechamento] = (horarioDia.fechamento || '23:59').split(':').map(Number);
    if (horaFechamento < horaAbertura) horaFechamento += 24; 

    let aberturaTotal = horaAbertura * 60 + (minAbertura || 0);
    const fechamentoTotal = horaFechamento * 60 + (minFechamento || 0);

    const hoje = new Date();
    if (data.toDateString() === hoje.toDateString()) {
        const minutosAgora = hoje.getHours() * 60 + hoje.getMinutes();
        if (minutosAgora > aberturaTotal) aberturaTotal = Math.ceil(minutosAgora / 60) * 60;
    }

    const periodos = [];
    for (let minutos = aberturaTotal; minutos < fechamentoTotal; minutos += 60) {
        const horaInicio = Math.floor(minutos / 60) % 24;
        const minInicio = minutos % 60;
        const horaFim = Math.floor((minutos + 60) / 60) % 24;
        const minFim = (minutos + 60) % 60;

        const inicioFormatado = `${horaInicio.toString().padStart(2, '0')}:${minInicio.toString().padStart(2, '0')}`;
        const fimFormatado = `${horaFim.toString().padStart(2, '0')}:${minFim.toString().padStart(2, '0')}`;

        periodos.push({ inicio: inicioFormatado, fim: fimFormatado, label: `${inicioFormatado} - ${fimFormatado}` });
    }

    if (periodos.length === 0) {
        select.innerHTML = '<option value="">❌ Horários encerrados para hoje</option>';
        return;
    }

    select.innerHTML = '<option value="">Selecione um horário</option>';
    const nomesExibicao = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const nomeDia = nomesExibicao[data.getDay()];
    const dataFormatada = data.toLocaleDateString('pt-BR');

    periodos.forEach(periodo => {
        const option = document.createElement('option');
        option.value = `${dataSelecionada}|${periodo.inicio}|${periodo.fim}`;
        option.textContent = `${nomeDia}, ${dataFormatada}, entre ${periodo.label}`;
        select.appendChild(option);
    });
}

function calcularDistanciaGeo(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

window.mascaraCEP = function(i) { let v = i.value.replace(/\D/g, ''); if (v.length > 5) v = v.substring(0,5) + '-' + v.substring(5,8); i.value = v; }

window.calcularFretePorCEP = async function() {
    const cepInput = document.getElementById('cepInput').value;
    const cepCliente = cepInput.replace(/\D/g, '');
    if(cepCliente.length !== 8) { document.getElementById('cepInfo').innerHTML = '❌ CEP Inválido'; return; }
    
    document.getElementById('cepInfo').innerHTML = '🔄 Calculando...';
    try {
        const resCli = await fetch(`https://viacep.com.br/ws/${cepCliente}/json/`);
        const dadosCli = await resCli.json();
        
        if(dadosCli.erro) throw new Error('CEP não encontrado');

        document.getElementById('clienteEndereco').value = dadosCli.logradouro || '';
        document.getElementById('clienteBairro').value = dadosCli.bairro || '';

        if (!coordsLoja.lat && configuracoesLoja.cep_loja) {
            const resLoja = await fetch(`https://cep.awesomeapi.com.br/json/${configuracoesLoja.cep_loja.replace(/\D/g, '')}`);
            const dadosLoja = await resLoja.json();
            if(dadosLoja.lat) coordsLoja = {lat: parseFloat(dadosLoja.lat), lng: parseFloat(dadosLoja.lng)};
        }

        const resCliCoords = await fetch(`https://cep.awesomeapi.com.br/json/${cepCliente}`);
        const dadosCliCoords = await resCliCoords.json();

        if (coordsLoja.lat && coordsLoja.lng && dadosCliCoords.lat) {
            const kmReal = calcularDistanciaGeo(coordsLoja.lat, coordsLoja.lng, parseFloat(dadosCliCoords.lat), parseFloat(dadosCliCoords.lng));
            const kmMax = parseFloat(configuracoesLoja.km_maximo_entrega) || 15;

            if (kmReal > kmMax) {
                document.getElementById('cepInfo').innerHTML = `📍 Distância: ${kmReal.toFixed(1)} km`;
                document.getElementById('freteInfo').innerHTML = `Fora da área de entrega (Máx: ${kmMax}km). Escolha Retirada.`;
                document.getElementById('freteInfo').className = 'frete-info erro';
                dentroAreaEntrega = false; taxaFrete = 0; calcularSubtotalGeral();
                return;
            }
            
            document.getElementById('cepInfo').innerHTML = `✅ Aprovado (${kmReal.toFixed(1)} km)`;
            let tMin = parseFloat(configuracoesLoja.taxa_minima) || 0;
            let tKm = parseFloat(configuracoesLoja.taxa_por_km) || 0;
            taxaFrete = tMin + (kmReal * tKm);
            if (taxaFrete < tMin) taxaFrete = tMin; 
        } else {
            document.getElementById('cepInfo').innerHTML = `✅ Endereço Encontrado`;
            taxaFrete = parseFloat(configuracoesLoja.taxa_minima) || 0;
        }

        dentroAreaEntrega = true;
        const sub = carrinho.reduce((s, i) => s + i.precoTotalLinha, 0);
        const freeAtivo = String(configuracoesLoja.frete_gratis_ativo) === 'true' || configuracoesLoja.frete_gratis_ativo === true;
        const freeAcima = parseFloat(configuracoesLoja.frete_gratis_acima) || 0;

        if (freeAtivo && freeAcima > 0 && sub >= freeAcima) {
            taxaFrete = 0; 
            document.getElementById('freteInfo').innerHTML = '🎉 Parabéns! O Frete é Grátis!';
            document.getElementById('freteInfo').className = 'frete-info';
            document.getElementById('freteInfo').style.background = '#4CAF50'; document.getElementById('freteInfo').style.color = 'white';
        } else {
            document.getElementById('freteInfo').innerHTML = `🚚 Taxa de Entrega: R$ ${taxaFrete.toFixed(2)}`;
            document.getElementById('freteInfo').className = 'frete-info';
            document.getElementById('freteInfo').style.background = '#e8f5e9'; document.getElementById('freteInfo').style.color = '#333';
        }
        calcularSubtotalGeral();
    } catch(e) { document.getElementById('cepInfo').innerHTML = '❌ Erro de busca.'; }
}

async function carregarTudoDoBanco() {
    try {
        const [resProd, resGrupos, resItens] = await Promise.all([ fetch(`${API_URL}/cardapio/${SUBDOMINIO}`), fetch(`${API_URL}/grupos-complementos?tenant_id=1`), fetch(`${API_URL}/complementos?tenant_id=1`) ]);
        produtos = await resProd.json(); gruposComplementosGlobal = resGrupos.ok ? await resGrupos.json() : []; itensComplementosGlobal = resItens.ok ? await resItens.json() : [];
        categorias = ['Todos', ...new Set(produtos.map(p => p.categoria_nome).filter(Boolean))]; renderizarCategorias(); renderizarProdutos();
    } catch (e) { document.getElementById('produtos').innerHTML = `<div style="text-align:center; color:red;">Erro ao carregar cardápio.</div>`; }
}

window.abrirWhatsappSuporte = function() { let n = configuracoesLoja.whatsapp || '5551999999999'; n = n.replace(/\D/g, ''); if(!n.startsWith('55')) n='55'+n; window.open(`https://wa.me/${n}?text=Ol%C3%A1`, '_blank'); };
function renderizarCategorias() { document.getElementById('categorias').innerHTML = categorias.map(c => `<button class="categoria-btn ${c === categoriaAtiva ? 'ativa' : ''}" onclick="filtrarCategoria('${c}')">${c}</button>`).join(''); }
window.filtrarCategoria = function(cat) { categoriaAtiva = cat; renderizarCategorias(); renderizarProdutos(); }
window.filtrarProdutos = function() { renderizarProdutos(); }
function renderizarProdutos() {
    const b = document.getElementById('searchInput').value.toLowerCase();
    const f = produtos.filter(p => (categoriaAtiva === 'Todos' || p.categoria_nome === categoriaAtiva) && p.nome.toLowerCase().includes(b));
    const div = document.getElementById('produtos');
    if (f.length === 0) return div.innerHTML = '<div style="text-align:center; color:#999; padding:30px;">Nenhum produto.</div>';
    div.innerHTML = f.map(p => `<div class="produto-card" onclick="abrirDetalheProduto(${p.id})"><div class="produto-info"><h3>${p.nome}</h3><div class="produto-desc">${p.descricao || ''}</div><div class="produto-preco">R$ ${parseFloat(p.preco).toFixed(2)}</div></div>${p.imagem_url ? `<img src="${p.imagem_url}" class="produto-imagem">` : `<div class="produto-imagem-placeholder">🍽️</div>`}</div>`).join('');
}

window.abrirDetalheProduto = async function(id) {
    produtoDetalheAtual = produtos.find(p => p.id == id); quantidadeDetalhe = 1; complementosSelecionados = {}; 
    document.getElementById('detalheNome').textContent = produtoDetalheAtual.nome; document.getElementById('detalheDescricao').textContent = produtoDetalheAtual.descricao || ''; document.getElementById('detalhePrecoBase').textContent = parseFloat(produtoDetalheAtual.preco).toFixed(2); document.getElementById('detalheQuantidade').textContent = quantidadeDetalhe; document.getElementById('detalheObservacao').value = '';
    const imgCont = document.getElementById('detalheImagemContainer'); if(produtoDetalheAtual.imagem_url) { document.getElementById('detalheImagem').src = produtoDetalheAtual.imagem_url; imgCont.style.display = 'block'; } else { imgCont.style.display = 'none'; }
    document.getElementById('detalheComplementos').innerHTML = '<div class="loading">Buscando opções...</div>'; document.getElementById('produtoDetalheModal').style.display = 'block'; document.body.style.overflow = 'hidden';
    try { const res = await fetch(`${API_URL}/complementos/produto/${id}`); renderizarGruposComplementos(res.ok ? await res.json() : []); } catch (e) { document.getElementById('detalheComplementos').innerHTML = ''; atualizarTotalDetalhe(); }
}
window.fecharDetalheProduto = function() { document.getElementById('produtoDetalheModal').style.display = 'none'; document.body.style.overflow = 'auto'; }

async function renderizarGruposComplementos(gruposVinculados) {
    const c = document.getElementById('detalheComplementos'); if(!Array.isArray(gruposVinculados) || gruposVinculados.length === 0) { c.innerHTML = ''; atualizarTotalDetalhe(); return; }
    let html = '';
    for (let v of gruposVinculados) {
        const g = gruposComplementosGlobal.find(x => x.id == v.id); if(!g) continue;
        complementosSelecionados[g.id] = []; let itens = [];
        try { const r = await fetch(`${API_URL}/grupo-complementos/${g.id}/itens`); if(r.ok) itens = await r.json(); } catch(e){}
        if(itens.length === 0) continue;
        let rTxt = g.obrigatorio ? 'OBRIGATÓRIO' : 'OPCIONAL'; let rCls = g.obrigatorio ? 'badge-obrig' : 'badge-opc'; let lTxt = g.limite_selecao > 1 ? `Escolha até ${g.limite_selecao} opções` : `Escolha 1 opção`;
        html += `<div class="grupo-comp" id="grupo_${g.id}"><div class="grupo-comp-header"><div><div class="grupo-comp-titulo">${g.nome}</div><div class="grupo-comp-desc">${lTxt}</div></div><span class="${rCls}" id="badge_${g.id}">${rTxt}</span></div>`;
        itens.forEach(i => {
            if(i.disponivel===false) return;
            let pf = parseFloat(i.preco)>0 ? `+ R$ ${parseFloat(i.preco).toFixed(2)}` : ''; let rad = g.limite_selecao===1?'radio-mark':'';
            html += `<label class="item-comp checkbox-container"><div class="item-comp-info"><div class="item-comp-nome">${i.nome}</div><div class="item-comp-preco">${pf}</div></div><input type="checkbox" class="cb-item" data-grupo="${g.id}" data-item-id="${i.id}" data-item-nome="${i.nome}" data-item-preco="${i.preco}" onchange="toggleComplemento(${g.id}, this)"><span class="checkmark ${rad}"></span></label>`;
        }); html += `</div>`;
    } c.innerHTML = html; atualizarTotalDetalhe();
}

window.toggleComplemento = function(gId, cb) {
    const gInfo = gruposComplementosGlobal.find(g => g.id == gId); let sel = complementosSelecionados[gId];
    if (cb.checked) {
        if(sel.length >= gInfo.limite_selecao) { if(gInfo.limite_selecao===1) { let idVelho = sel[0].id; document.querySelector(`input[data-item-id="${idVelho}"][data-grupo="${gId}"]`).checked = false; sel=[]; } else { cb.checked = false; alert(`Limite de ${gInfo.limite_selecao}`); return; } }
        sel.push({ id: cb.getAttribute('data-item-id'), nome: cb.getAttribute('data-item-nome'), preco: parseFloat(cb.getAttribute('data-item-preco')) });
    } else { sel = sel.filter(i => i.id !== cb.getAttribute('data-item-id')); }
    complementosSelecionados[gId] = sel;
    if (gInfo.obrigatorio) { const bdg = document.getElementById(`badge_${gId}`); if(sel.length>0){ bdg.className='badge-opc'; bdg.textContent='OK'; bdg.style.background='#4CAF50';}else{bdg.className='badge-obrig'; bdg.textContent='OBRIGATÓRIO'; bdg.style.background='#333';} }
    atualizarTotalDetalhe();
}
window.alterarQuantidadeDetalhe = function(d) { quantidadeDetalhe+=d; if(quantidadeDetalhe<1) quantidadeDetalhe=1; document.getElementById('detalheQuantidade').textContent=quantidadeDetalhe; atualizarTotalDetalhe(); }
function atualizarTotalDetalhe() {
    let sub = parseFloat(produtoDetalheAtual.preco); for(let g in complementosSelecionados) complementosSelecionados[g].forEach(i => sub += i.preco);
    document.getElementById('detalhePrecoTotal').textContent = (sub*quantidadeDetalhe).toFixed(2);
    let tudoCerto = true; for(let g in complementosSelecionados) { let gI = gruposComplementosGlobal.find(x=>x.id==g); if(gI && gI.obrigatorio && complementosSelecionados[g].length===0) tudoCerto=false; }
    const btn = document.querySelector('.btn-adicionar-final'); btn.disabled = !tudoCerto; btn.style.opacity = tudoCerto ? '1' : '0.5';
}

window.adicionarProdutoPersonalizadoAoCarrinho = function() {
    let lComps = []; let pComps = 0; for (let g in complementosSelecionados) complementosSelecionados[g].forEach(i => { lComps.push({nome:i.nome, preco:i.preco}); pComps+=i.preco; });
    const obs = document.getElementById('detalheObservacao').value.trim(); const pUnit = parseFloat(produtoDetalheAtual.preco) + pComps;
    const idx = carrinho.findIndex(i => i.idProduto === produtoDetalheAtual.id && i.observacao === obs && JSON.stringify(i.complementos) === JSON.stringify(lComps));
    if (idx !== -1) { carrinho[idx].quantidade += quantidadeDetalhe; carrinho[idx].precoTotalLinha = carrinho[idx].quantidade * carrinho[idx].precoUnitario; } 
    else { carrinho.push({ idProduto: produtoDetalheAtual.id, nome: produtoDetalheAtual.nome, quantidade: quantidadeDetalhe, precoUnitario: pUnit, precoTotalLinha: pUnit*quantidadeDetalhe, complementos: lComps, observacao: obs }); }
    fecharDetalheProduto(); atualizarRodapeCarrinho(); alert('✅ Adicionado ao carrinho!');
}

function atualizarRodapeCarrinho() {
    const rodape = document.getElementById('rodapeCarrinho');
    if (carrinho.length > 0) {
        document.getElementById('rodapeQtd').textContent = carrinho.reduce((s,i)=>s+i.quantidade,0);
        document.getElementById('rodapeTotal').textContent = carrinho.reduce((s,i)=>s+i.precoTotalLinha,0).toFixed(2);
        document.getElementById('cartCount').textContent = carrinho.reduce((s,i)=>s+i.quantidade,0);
        rodape.style.display = 'flex';
    } else { rodape.style.display = 'none'; document.getElementById('cartCount').textContent = '0'; fecharCarrinho(); }
}

window.abrirCarrinho = function() {
    if(carrinho.length === 0) return alert('Carrinho vazio!');
    try {
        document.getElementById('cartItems').innerHTML = carrinho.map((i, idx) => `<div class="cart-item"><div class="cart-item-info"><h4>${i.quantidade}x ${i.nome}</h4>${i.complementos.map(c=>`+ ${c.nome}`).join('<br>')}${i.observacao?`<br><em style="color:#C83232">Obs: ${i.observacao}</em>`:''}<div class="cart-item-price">R$ ${i.precoTotalLinha.toFixed(2)}</div></div><button class="cart-item-remove" onclick="removerDoCarrinho(${idx})">Remover</button></div>`).join('');
        
        const isDeliveryChecked = document.getElementById('deliveryOption').checked;
        window.toggleDelivery(isDeliveryChecked);
    } catch (e) { console.error("Erro no carrinho", e); }
    document.getElementById('cartModal').style.display = 'block'; document.body.style.overflow = 'hidden';
}

window.toggleDelivery = function(isDelivery) {
    if (isDelivery === undefined) isDelivery = document.getElementById('deliveryOption').checked;

    document.getElementById('deliveryFields').style.display = isDelivery ? 'block' : 'none';
    document.getElementById('pickupFields').style.display = isDelivery ? 'none' : 'block';
    
    document.getElementById('agendamentoFields').style.display = 'none';
    modoAgendamento = false;
    
    const statusTempoReal = obterStatusHorariosEmTempoReal();
    let avisoDiv = document.getElementById('avisoDelivery');
    let btn = document.querySelector('.whatsapp-btn');
    
    if(avisoDiv) avisoDiv.style.display = 'none';
    btn.disabled = false; btn.style.background = '#25D366'; btn.innerHTML = '📲 Enviar Pedido via WhatsApp';

    if (isDelivery) {
        document.getElementById('freteInfo').innerHTML = '👆 Informe seu CEP para verificação de distância.'; 
        document.getElementById('freteInfo').className = 'frete-info'; taxaFrete = 0; dentroAreaEntrega = false; document.getElementById('cepInfo').innerHTML=''; 
        
        if (!statusTempoReal.delivery.abertaAgora) {
            if(avisoDiv) {
                avisoDiv.innerHTML = `
                    <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; border-radius: 6px;">
                        <p style="font-weight: bold; color: #0d47a1; margin-bottom: 10px;">🚫 Delivery fechado no momento.</p>
                        <button style="background: #2196F3; color: white; border: none; padding: 10px; border-radius: 6px; width: 100%; font-weight: bold; cursor: pointer;" onclick="mostrarAgendamento()">📅 Quero agendar entrega</button>
                    </div>
                `;
                avisoDiv.style.display = 'block';
            }
            btn.innerHTML = '⚠️ Requer Agendamento';
        }
    } else { 
        taxaFrete = 0; dentroAreaEntrega = false; document.getElementById('cepInfo').innerHTML=''; 
        
        if (!statusTempoReal.loja.abertaAgora) {
            if(avisoDiv) {
                avisoDiv.innerHTML = `
                    <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; border-radius: 6px;">
                        <p style="font-weight: bold; color: #e65100; margin-bottom: 10px;">🏪 Nossa loja está fechada no momento.</p>
                        <button style="background: #ff9800; color: white; border: none; padding: 10px; border-radius: 6px; width: 100%; font-weight: bold; cursor: pointer;" onclick="mostrarAgendamento()">📅 Quero agendar retirada</button>
                    </div>
                `;
                avisoDiv.style.display = 'block';
            }
            btn.innerHTML = '⚠️ Requer Agendamento';
        }
    }
    calcularSubtotalGeral();
}

window.fecharCarrinho = function() { document.getElementById('cartModal').style.display = 'none'; document.body.style.overflow = 'auto'; }
window.removerDoCarrinho = function(idx) { carrinho.splice(idx, 1); atualizarRodapeCarrinho(); if(carrinho.length>0) abrirCarrinho(); }
function calcularSubtotalGeral() {
    const sub = carrinho.reduce((s, i) => s + i.precoTotalLinha, 0); document.getElementById('cartSubtotal').textContent = sub.toFixed(2);
    document.getElementById('cartTotalFinal').textContent = (sub + (document.getElementById('deliveryOption').checked ? taxaFrete : 0)).toFixed(2);
}

window.finalizarPedido = async function() {
    const tipo = document.querySelector('input[name="deliveryType"]:checked').value;
    let nome, tel;
    const statusTempoReal = obterStatusHorariosEmTempoReal();
    let strAgendamento = "";
    
    if (modoAgendamento || (tipo === 'delivery' && !statusTempoReal.delivery.abertaAgora) || (tipo === 'pickup' && !statusTempoReal.loja.abertaAgora)) {
        const dataAgendamento = document.getElementById('dataAgendamento')?.value;
        const horarioAgendamento = document.getElementById('horarioAgendamento')?.value;

        if (!dataAgendamento || !horarioAgendamento) {
            alert('⚠️ Selecione a Data e o Horário para o agendamento!');
            return;
        }

        const [dataStr, horaInicio, horaFim] = horarioAgendamento.split('|');
        const dataFormatada = new Date(dataStr + 'T12:00:00').toLocaleDateString('pt-BR');
        strAgendamento = `📅 Agendado para: ${dataFormatada}, entre ${horaInicio} e ${horaFim}`;
    }
    
    if(tipo === 'delivery') {
        nome = document.getElementById('clienteNome').value.trim(); tel = document.getElementById('clienteTelefone').value.trim();
        if(!nome || !tel || !document.getElementById('clienteEndereco').value || !document.getElementById('clienteNumero').value) return alert('Preencha todos os dados de entrega!');
        if(!dentroAreaEntrega) return alert('Desculpe, este endereço está fora da área de entrega calculada.');
    } else {
        nome = document.getElementById('pickupNome').value.trim(); tel = document.getElementById('pickupTelefone').value.trim();
        if(!nome || !tel) return alert('Preencha seu nome e WhatsApp!');
    }

    const btn = document.querySelector('.whatsapp-btn'); btn.innerHTML = '⏳ Processando...'; btn.disabled = true;
    const sub = carrinho.reduce((s, i) => s + i.precoTotalLinha, 0); const totalFinal = sub + (tipo === 'delivery' ? taxaFrete : 0);

    let dadosPedido = {
        cliente_nome: nome, cliente_telefone: tel, tipo_entrega: tipo, taxa_entrega: tipo === 'delivery' ? taxaFrete : 0, subtotal: sub, total: totalFinal, 
        observacoes: strAgendamento ? `[AGENDADO] ${strAgendamento}` : '',
        itens: carrinho.map(i => {
            let n = i.nome; if(i.complementos.length>0) n += ' (+ ' + i.complementos.map(c=>c.nome).join(', ') + ')';
            if(i.observacao) n += ` [Obs: ${i.observacao}]`;
            return { produto_id: i.idProduto, produto_nome: n, quantidade: i.quantidade, preco_unitario: i.precoUnitario, subtotal: i.precoTotalLinha };
        })
    };

    if (tipo === 'delivery') {
        const comp = document.getElementById('clienteComplemento').value;
        dadosPedido.cliente_endereco = `${document.getElementById('clienteEndereco').value}, ${document.getElementById('clienteNumero').value}${comp ? ' - ' + comp : ''}`;
        dadosPedido.cliente_bairro = document.getElementById('clienteBairro').value; dadosPedido.cliente_cep = document.getElementById('cepInput').value;
    }

    let idPedidoReal = '';
    try {
        const res = await fetch(`${API_URL}/pedidos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subdominio: SUBDOMINIO, pedido: dadosPedido }) });
        const dbData = await res.json(); if(dbData && dbData.id) idPedidoReal = ` #${dbData.id}`; 
    } catch(e) {}

    let msg = `🍽️ *NOVO PEDIDO${idPedidoReal}*\n━━━━━━━━━━━━━━━━\n`;
    if(strAgendamento) msg += `*${strAgendamento}*\n━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Cliente:* ${nome}\n📱 *Tel:* ${tel}\n\n🛍️ *RESUMO:*\n\n`;
    carrinho.forEach(i => {
        msg += `*${i.quantidade}x ${i.nome}* (R$ ${i.precoTotalLinha.toFixed(2)})\n`;
        i.complementos.forEach(c => { msg += `  ▫️ ${c.nome}${parseFloat(c.preco)>0 ? ` (+R$ ${parseFloat(c.preco).toFixed(2)})`:''}\n`; });
        if(i.observacao) msg += `  💬 *Obs:* ${i.observacao}\n`; msg += `\n`;
    });

    msg += `━━━━━━━━━━━━━━━━\n💵 Subtotal: R$ ${sub.toFixed(2)}\n`;
    if(tipo === 'delivery') { msg += `🚚 Frete: ${taxaFrete > 0 ? 'R$ '+taxaFrete.toFixed(2) : '*GRÁTIS*'}\n📍 *ENTREGA EM:*\n${dadosPedido.cliente_endereco}\n${dadosPedido.cliente_bairro} - CEP: ${dadosPedido.cliente_cep}\n`; } 
    else { msg += `🏠 *RETIRADA NA LOJA*\n`; }
    msg += `\n💰 *TOTAL A PAGAR: R$ ${totalFinal.toFixed(2)}*`;

    carrinho = []; atualizarRodapeCarrinho(); btn.innerHTML = '📲 Enviar Pedido via WhatsApp'; btn.disabled = false;
    let nw = configuracoesLoja.whatsapp || '5551999999999'; nw = nw.replace(/\D/g, ''); if(!nw.startsWith('55')) nw = '55' + nw;
    window.open(`https://wa.me/${nw}?text=${encodeURIComponent(msg)}`, '_blank');
}