const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') ? 'http://localhost:10000/api' : 'https://meu-pedido-backend.onrender.com/api';
const SUBDOMINIO = 'dlcrepes';

let produtos = [], gruposComplementosGlobal = [], itensComplementosGlobal = [], categorias = [], categoriaAtiva = 'Todos';
let carrinho = [], configuracoesLoja = {}, taxaFrete = 0, dentroAreaEntrega = false;
let produtoDetalheAtual = null, quantidadeDetalhe = 1, complementosSelecionados = {};
let coordsLoja = { lat: null, lng: null };

window.onload = async () => {
    await carregarConfiguracoes();
    await carregarTudoDoBanco(); 
};

function parseJSONSeguro(texto) {
    if (!texto) return {};
    if (typeof texto === 'object') return texto;
    try { return JSON.parse(texto) || {}; } catch (e) { return {}; }
}

async function carregarConfiguracoes() {
    try {
        const res = await fetch(`${API_URL}/config/${SUBDOMINIO}`);
        configuracoesLoja = await res.json();
        
        document.getElementById('nomeLoja').textContent = configuracoesLoja.nome_loja || 'Nossa Loja';
        document.getElementById('slogan').textContent = configuracoesLoja.slogan || '';
        document.getElementById('endereco').innerHTML = `📍 ${configuracoesLoja.endereco_completo || ''}`;
        document.getElementById('horario').innerHTML = `🕒 ${configuracoesLoja.horario_funcionamento || 'Consulte os horários'}`;
        
        if (configuracoesLoja.logo_url) { 
            document.getElementById('logoImagem').src = configuracoesLoja.logo_url; 
            document.getElementById('logoImagem').style.display = 'block'; 
            document.getElementById('logoPlaceholder').style.display = 'none'; 
        }

        const isMsgAtiva = String(configuracoesLoja.mensagem_banner_ativo) === 'true';
        const textoMsg = configuracoesLoja.mensagem_banner;
        
        if (isMsgAtiva && textoMsg && textoMsg.trim() !== '') { 
            const msgDiv = document.getElementById('mensagemPersonalizada');
            if(msgDiv) {
                msgDiv.style.backgroundColor = configuracoesLoja.mensagem_banner_cor || '#FFF3E0';
                msgDiv.style.color = configuracoesLoja.mensagem_banner_texto || '#E65100';
                msgDiv.style.borderBottom = `1px solid ${configuracoesLoja.mensagem_banner_texto || '#E65100'}`;
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

async function carregarTudoDoBanco() {
    try {
        const [resProd, resGrupos, resItens] = await Promise.all([ fetch(`${API_URL}/cardapio/${SUBDOMINIO}`), fetch(`${API_URL}/grupos-complementos?tenant_id=1`), fetch(`${API_URL}/complementos?tenant_id=1`) ]);
        produtos = await resProd.json(); gruposComplementosGlobal = resGrupos.ok ? await resGrupos.json() : []; itensComplementosGlobal = resItens.ok ? await resItens.json() : [];
        categorias = ['Todos', ...new Set(produtos.map(p => p.categoria_nome).filter(Boolean))]; renderizarCategorias(); renderizarProdutos();
    } catch (e) { document.getElementById('produtos').innerHTML = `<div style="text-align:center; color:red;">Erro ao carregar cardápio.</div>`; }
}

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
    document.getElementById('detalheComplementos').innerHTML = '<div style="text-align:center; padding:20px; color:#999;">Buscando opções...</div>'; document.getElementById('produtoDetalheModal').style.display = 'block'; document.body.style.overflow = 'hidden';
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
    fecharDetalheProduto(); atualizarRodapeCarrinho();
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
    if(carrinho.length === 0) return alert('Seu carrinho está vazio.');
    try {
        document.getElementById('cartItems').innerHTML = carrinho.map((i, idx) => `<div class="cart-item"><div class="cart-item-info"><h4>${i.quantidade}x ${i.nome}</h4>${i.complementos.length > 0 ? `<div class="cart-item-comps">+ ${i.complementos.map(c=>c.nome).join(', ')}</div>` : ''}${i.observacao?`<div class="cart-item-comps" style="color:#C83232">Obs: ${i.observacao}</div>`:''}<div class="cart-item-price">R$ ${i.precoTotalLinha.toFixed(2)}</div></div><button class="cart-item-remove" onclick="removerDoCarrinho(${idx})">Remover</button></div>`).join('');
        window.toggleDelivery();
    } catch (e) { console.error("Erro no carrinho", e); }
    document.getElementById('cartModal').style.display = 'block'; document.body.style.overflow = 'hidden';
}

window.fecharCarrinho = function() { document.getElementById('cartModal').style.display = 'none'; document.body.style.overflow = 'auto'; }
window.removerDoCarrinho = function(idx) { carrinho.splice(idx, 1); atualizarRodapeCarrinho(); if(carrinho.length>0) abrirCarrinho(); }

window.toggleAgendamento = function() {
    const isAgendado = document.getElementById('tempoAgendado').checked;
    document.getElementById('agendamentoFields').style.display = isAgendado ? 'block' : 'none';
}

window.toggleDelivery = function() {
    const isDelivery = document.getElementById('deliveryOption').checked;
    document.getElementById('deliveryFields').style.display = isDelivery ? 'block' : 'none';
    if (!isDelivery) {
        taxaFrete = 0;
        document.getElementById('freteInfo').innerHTML = 'Retirada na Loja';
        document.getElementById('freteInfo').style.background = '#f0f0f0';
        document.getElementById('freteInfo').style.color = '#333';
        dentroAreaEntrega = true;
    } else {
        calcularFretePorCEP();
    }
    calcularSubtotalGeral();
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
                document.getElementById('freteInfo').innerHTML = `Fora da área de entrega (Máx: ${kmMax}km).`;
                document.getElementById('freteInfo').style.background = '#ffebee'; document.getElementById('freteInfo').style.color = '#c62828';
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
            document.getElementById('freteInfo').style.background = '#4CAF50'; document.getElementById('freteInfo').style.color = 'white';
        } else {
            document.getElementById('freteInfo').innerHTML = `🚚 Taxa: R$ ${taxaFrete.toFixed(2)}`;
            document.getElementById('freteInfo').style.background = '#e8f5e9'; document.getElementById('freteInfo').style.color = '#333';
        }
        calcularSubtotalGeral();
    } catch(e) { document.getElementById('cepInfo').innerHTML = '❌ Erro de busca. Preencha manualmente.'; dentroAreaEntrega = true; taxaFrete = parseFloat(configuracoesLoja.taxa_minima) || 0; calcularSubtotalGeral(); }
}

window.calcularSubtotalGeral = function() {
    const sub = carrinho.reduce((s, i) => s + i.precoTotalLinha, 0); 
    document.getElementById('cartSubtotal').textContent = sub.toFixed(2);
    document.getElementById('cartTotalFinal').textContent = (sub + taxaFrete).toFixed(2);
}