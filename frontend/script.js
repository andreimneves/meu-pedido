const API_URL = 'https://meu-pedido-backend.onrender.com/api';
const SUBDOMINIO = 'dlcrepes';

let produtos = [], gruposComplementosGlobal = [], itensComplementosGlobal = [], categorias = [], categoriaAtiva = 'Todos';
let carrinho = [], configuracoesLoja = {}, taxaFrete = 0, dentroAreaEntrega = false;
let produtoDetalheAtual = null, quantidadeDetalhe = 1, complementosSelecionados = {};
let coordsLoja = { lat: null, lng: null };
let modoAgendamento = false;

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

async function verificarDisponibilidade(tipo) {
    try {
        const response = await fetch(`${API_URL}/horarios/verificar/${SUBDOMINIO}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo })
        });
        return await response.json();
    } catch (error) {
        console.error('Erro:', error);
        return { disponivel: true, pode_agendar: true };
    }
}

async function carregarTudoDoBanco() {
    try {
        const [resProd, resGrupos, resItens] = await Promise.all([
            fetch(`${API_URL}/cardapio/${SUBDOMINIO}`),
            fetch(`${API_URL}/grupos-complementos?tenant_id=1`),
            fetch(`${API_URL}/complementos?tenant_id=1`)
        ]);
        produtos = await resProd.json();
        gruposComplementosGlobal = resGrupos.ok ? await resGrupos.json() : [];
        itensComplementosGlobal = resItens.ok ? await resItens.json() : [];
        categorias = ['Todos', ...new Set(produtos.map(p => p.categoria_nome).filter(Boolean))];
        renderizarCategorias();
        renderizarProdutos();
    } catch (e) {
        document.getElementById('produtos').innerHTML = `<div style="text-align:center; color:red;">Erro ao carregar cardápio.</div>`;
    }
}

window.abrirWhatsappSuporte = function() {
    let n = configuracoesLoja.whatsapp || '5551999999999';
    n = n.replace(/\D/g, '');
    if(!n.startsWith('55')) n='55'+n;
    window.open(`https://wa.me/${n}?text=Ol%C3%A1`, '_blank');
};

function renderizarCategorias() {
    document.getElementById('categorias').innerHTML = categorias.map(c =>
        `<button class="categoria-btn ${c === categoriaAtiva ? 'ativa' : ''}" onclick="filtrarCategoria('${c}')">${c}</button>`
    ).join('');
}

window.filtrarCategoria = function(cat) {
    categoriaAtiva = cat;
    renderizarCategorias();
    renderizarProdutos();
}

window.filtrarProdutos = function() {
    renderizarProdutos();
}

function renderizarProdutos() {
    const b = document.getElementById('searchInput').value.toLowerCase();
    const f = produtos.filter(p => (categoriaAtiva === 'Todos' || p.categoria_nome === categoriaAtiva) && p.nome.toLowerCase().includes(b));
    const div = document.getElementById('produtos');
    
    if (f.length === 0) return div.innerHTML = '<div style="text-align:center; color:#999; padding:30px;">Nenhum produto.</div>';
    
    div.innerHTML = f.map(p => `
        <div class="produto-card" onclick="abrirDetalheProduto(${p.id})">
            <div class="produto-info">
                <h3>${p.nome}</h3>
                <div class="produto-desc">${p.descricao || ''}</div>
                <div class="produto-preco">R$ ${parseFloat(p.preco).toFixed(2)}</div>
            </div>
            ${p.imagem_url ?
                `<img src="${p.imagem_url}" class="produto-imagem">` :
                `<div class="produto-imagem-placeholder">🍽️</div>`}
        </div>
    `).join('');
}

window.abrirDetalheProduto = async function(id) {
    produtoDetalheAtual = produtos.find(p => p.id == id);
    quantidadeDetalhe = 1;
    complementosSelecionados = {};
    
    document.getElementById('detalheNome').textContent = produtoDetalheAtual.nome;
    document.getElementById('detalheDescricao').textContent = produtoDetalheAtual.descricao || '';
    document.getElementById('detalhePrecoBase').textContent = parseFloat(produtoDetalheAtual.preco).toFixed(2);
    document.getElementById('detalheQuantidade').textContent = quantidadeDetalhe;
    document.getElementById('detalheObservacao').value = '';
    
    const imgCont = document.getElementById('detalheImagemContainer');
    if(produtoDetalheAtual.imagem_url) {
        document.getElementById('detalheImagem').src = produtoDetalheAtual.imagem_url;
        imgCont.style.display = 'block';
    } else {
        imgCont.style.display = 'none';
    }
    
    document.getElementById('detalheComplementos').innerHTML = '<div style="text-align:center; padding:20px; color:#999;">Buscando opções...</div>';
    document.getElementById('produtoDetalheModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    try {
        const res = await fetch(`${API_URL}/complementos/produto/${id}`);
        renderizarGruposComplementos(res.ok ? await res.json() : []);
    } catch (e) {
        document.getElementById('detalheComplementos').innerHTML = '';
        atualizarTotalDetalhe();
    }
}

window.fecharDetalheProduto = function() {
    document.getElementById('produtoDetalheModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function renderizarGruposComplementos(gruposVinculados) {
    const c = document.getElementById('detalheComplementos');
    if(!Array.isArray(gruposVinculados) || gruposVinculados.length === 0) {
        c.innerHTML = '';
        atualizarTotalDetalhe();
        return;
    }
    
    let html = '';
    
    for (let v of gruposVinculados) {
        const g = gruposComplementosGlobal.find(x => x.id == v.id);
        if(!g) continue;
        
        complementosSelecionados[g.id] = [];
        let itens = [];
        
        try {
            const r = await fetch(`${API_URL}/grupo-complementos/${g.id}/itens`);
            if(r.ok) itens = await r.json();
        } catch(e){}
        
        if(itens.length === 0) continue;
        
        let rTxt = g.obrigatorio ? 'OBRIGATÓRIO' : 'OPCIONAL';
        let rCls = g.obrigatorio ? 'badge-obrig' : 'badge-opc';
        let lTxt = g.limite_selecao > 1 ? `Escolha até ${g.limite_selecao} opções` : `Escolha 1 opção`;
        
        html += `<div class="grupo-comp" id="grupo_${g.id}">
            <div class="grupo-comp-header">
                <div>
                    <div class="grupo-comp-titulo">${g.nome}</div>
                    <div class="grupo-comp-desc">${lTxt}</div>
                </div>
                <span class="${rCls}" id="badge_${g.id}">${rTxt}</span>
            </div>`;
        
        itens.forEach(i => {
            if(i.disponivel===false) return;
            
            let pf = parseFloat(i.preco)>0 ? `+ R$ ${parseFloat(i.preco).toFixed(2)}` : '';
            let rad = g.limite_selecao===1 ? 'radio-mark' : '';
            
            html += `<label class="item-comp checkbox-container">
                <div class="item-comp-info">
                    <div class="item-comp-nome">${i.nome}</div>
                    <div class="item-comp-preco">${pf}</div>
                </div>
                <input type="checkbox" class="cb-item" data-grupo="${g.id}" data-item-id="${i.id}" data-item-nome="${i.nome}" data-item-preco="${i.preco}" onchange="toggleComplemento(${g.id}, this)">
                <span class="checkmark ${rad}"></span>
            </label>`;
        });
        
        html += `</div>`;
    }
    
    c.innerHTML = html;
    atualizarTotalDetalhe();
}

window.toggleComplemento = function(gId, cb) {
    const gInfo = gruposComplementosGlobal.find(g => g.id == gId);
    let sel = complementosSelecionados[gId];
    
    if (cb.checked) {
        if(sel.length >= gInfo.limite_selecao) {
            if(gInfo.limite_selecao===1) {
                let idVelho = sel[0].id;
                document.querySelector(`input[data-item-id="${idVelho}"][data-grupo="${gId}"]`).checked = false;
                sel = [];
            } else {
                cb.checked = false;
                alert(`Limite de ${gInfo.limite_selecao}`);
                return;
            }
        }
        
        sel.push({
            id: cb.getAttribute('data-item-id'),
            nome: cb.getAttribute('data-item-nome'),
            preco: parseFloat(cb.getAttribute('data-item-preco'))
        });
    } else {
        sel = sel.filter(i => i.id !== cb.getAttribute('data-item-id'));
    }
    
    complementosSelecionados[gId] = sel;
    
    if (gInfo.obrigatorio) {
        const bdg = document.getElementById(`badge_${gId}`);
        if(sel.length>0){
            bdg.className='badge-opc';
            bdg.textContent='OK';
            bdg.style.background='#4CAF50';
        } else {
            bdg.className='badge-obrig';
            bdg.textContent='OBRIGATÓRIO';
            bdg.style.background='#333';
        }
    }
    
    atualizarTotalDetalhe();
}

window.alterarQuantidadeDetalhe = function(d) {
    quantidadeDetalhe += d;
    if(quantidadeDetalhe < 1) quantidadeDetalhe = 1;
    document.getElementById('detalheQuantidade').textContent = quantidadeDetalhe;
    atualizarTotalDetalhe();
}

function atualizarTotalDetalhe() {
    let sub = parseFloat(produtoDetalheAtual.preco);
    for(let g in complementosSelecionados) {
        complementosSelecionados[g].forEach(i => sub += i.preco);
    }
    
    document.getElementById('detalhePrecoTotal').textContent = (sub * quantidadeDetalhe).toFixed(2);
    
    let tudoCerto = true;
    for(let g in complementosSelecionados) {
        let gI = gruposComplementosGlobal.find(x => x.id == g);
        if(gI && gI.obrigatorio && complementosSelecionados[g].length === 0) tudoCerto = false;
    }
    
    const btn = document.querySelector('.btn-adicionar-final');
    btn.disabled = !tudoCerto;
    btn.style.opacity = tudoCerto ? '1' : '0.5';
}

window.adicionarProdutoPersonalizadoAoCarrinho = function() {
    let lComps = [];
    let pComps = 0;
    for (let g in complementosSelecionados) {
        complementosSelecionados[g].forEach(i => {
            lComps.push({nome:i.nome, preco:i.preco});
            pComps += i.preco;
        });
    }
    
    const obs = document.getElementById('detalheObservacao').value.trim();
    const pUnit = parseFloat(produtoDetalheAtual.preco) + pComps;
    
    const idx = carrinho.findIndex(i =>
        i.idProduto === produtoDetalheAtual.id &&
        i.observacao === obs &&
        JSON.stringify(i.complementos) === JSON.stringify(lComps)
    );
    
    if (idx !== -1) {
        carrinho[idx].quantidade += quantidadeDetalhe;
        carrinho[idx].precoTotalLinha = carrinho[idx].quantidade * carrinho[idx].precoUnitario;
    } else {
        carrinho.push({
            idProduto: produtoDetalheAtual.id,
            nome: produtoDetalheAtual.nome,
            quantidade: quantidadeDetalhe,
            precoUnitario: pUnit,
            precoTotalLinha: pUnit * quantidadeDetalhe,
            complementos: lComps,
            observacao: obs
        });
    }
    
    fecharDetalheProduto();
    atualizarRodapeCarrinho();
}

function atualizarRodapeCarrinho() {
    const rodape = document.getElementById('rodapeCarrinho');
    if (carrinho.length > 0) {
        document.getElementById('rodapeQtd').textContent = carrinho.reduce((s,i) => s + i.quantidade, 0);
        document.getElementById('rodapeTotal').textContent = carrinho.reduce((s,i) => s + i.precoTotalLinha, 0).toFixed(2);
        document.getElementById('cartCount').textContent = carrinho.reduce((s,i) => s + i.quantidade, 0);
        rodape.style.display = 'flex';
    } else {
        rodape.style.display = 'none';
        document.getElementById('cartCount').textContent = '0';
        fecharCarrinho();
    }
}

window.abrirCarrinho = function() {
    if(carrinho.length === 0) return alert('Seu carrinho está vazio.');
    
    document.getElementById('cartItems').innerHTML = carrinho.map((i, idx) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${i.quantidade}x ${i.nome}</h4>
                ${i.complementos.length > 0 ? `<div class="cart-item-comps">+ ${i.complementos.map(c => c.nome).join(', ')}</div>` : ''}
                ${i.observacao ? `<div class="cart-item-comps" style="color:#C83232">Obs: ${i.observacao}</div>` : ''}
                <div class="cart-item-price">R$ ${i.precoTotalLinha.toFixed(2)}</div>
            </div>
            <button class="cart-item-remove" onclick="removerDoCarrinho(${idx})">Remover</button>
        </div>
    `).join('');
    
    const isDeliveryChecked = document.getElementById('deliveryOption').checked;
    window.toggleDelivery(isDeliveryChecked);
    
    document.getElementById('cartModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

window.fecharCarrinho = function() {
    document.getElementById('cartModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

window.removerDoCarrinho = function(idx) {
    carrinho.splice(idx, 1);
    atualizarRodapeCarrinho();
    if(carrinho.length > 0) abrirCarrinho();
}

function calcularDistanciaGeo(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

window.mascaraCEP = function(i) {
    let v = i.value.replace(/\D/g, '');
    if (v.length > 5) v = v.substring(0,5) + '-' + v.substring(5,8);
    i.value = v;
}

window.calcularFretePorCEP = async function() {
    const cepInput = document.getElementById('cepInput').value;
    const cepCliente = cepInput.replace(/\D/g, '');
    
    if(cepCliente.length !== 8) {
        document.getElementById('cepInfo').innerHTML = '❌ CEP Inválido';
        return;
    }
    
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
            const kmReal = calcularDistanciaGeo(
                coordsLoja.lat, coordsLoja.lng,
                parseFloat(dadosCliCoords.lat), parseFloat(dadosCliCoords.lng)
            );
            
            const kmMax = parseFloat(configuracoesLoja.km_maximo_entrega) || 15;
            
            if (kmReal > kmMax) {
                document.getElementById('cepInfo').innerHTML = `📍 Distância: ${kmReal.toFixed(1)} km`;
                document.getElementById('freteInfo').innerHTML = `Fora da área de entrega (Máx: ${kmMax}km). Escolha Retirada.`;
                document.getElementById('freteInfo').className = 'frete-info erro';
                dentroAreaEntrega = false;
                taxaFrete = 0;
                calcularSubtotalGeral();
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
            document.getElementById('freteInfo').style.background = '#4CAF50';
            document.getElementById('freteInfo').style.color = 'white';
        } else {
            document.getElementById('freteInfo').innerHTML = `🚚 Taxa de Entrega: R$ ${taxaFrete.toFixed(2)}`;
            document.getElementById('freteInfo').className = 'frete-info';
            document.getElementById('freteInfo').style.background = '#e8f5e9';
            document.getElementById('freteInfo').style.color = '#333';
        }
        
        calcularSubtotalGeral();
        
    } catch(e) {
        document.getElementById('cepInfo').innerHTML = '❌ Erro de busca. Preencha manualmente.';
        dentroAreaEntrega = true;
        taxaFrete = parseFloat(configuracoesLoja.taxa_minima) || 0;
        calcularSubtotalGeral();
    }
}

function calcularSubtotalGeral() {
    const sub = carrinho.reduce((s, i) => s + i.precoTotalLinha, 0);
    document.getElementById('cartSubtotal').textContent = sub.toFixed(2);
    document.getElementById('cartTotalFinal').textContent = (sub + (document.getElementById('deliveryOption').checked ? taxaFrete : 0)).toFixed(2);
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

window.carregarHorariosPorData = async function() {
    const dataSelecionada = document.getElementById('dataAgendamento').value;
    const select = document.getElementById('horarioAgendamento');
    const tipo = document.querySelector('input[name="deliveryType"]:checked').value;
    
    if (!dataSelecionada) {
        select.innerHTML = '<option value="">Selecione uma data primeiro</option>';
        return;
    }
    
    select.innerHTML = '<option value="">🔄 Carregando...</option>';
    
    try {
        const response = await fetch(`${API_URL}/horarios/verificar/${SUBDOMINIO}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipo: tipo,
                data: dataSelecionada
            })
        });
        
        if (!response.ok) {
            throw new Error('Erro na resposta');
        }
        
        const data = await response.json();
        console.log('📅 Horários para data:', data);
        
        if (!data.disponivel) {
            select.innerHTML = '<option value="">❌ Fechado neste dia</option>';
            return;
        }
        
        if (!data.opcoes_horario || data.opcoes_horario.length === 0) {
            select.innerHTML = '<option value="">❌ Sem horários disponíveis</option>';
            return;
        }
        
        select.innerHTML = '<option value="">Selecione o horário</option>' +
            data.opcoes_horario.map(h =>
                `<option value="${dataSelecionada}|${h.valor}">${h.texto}</option>`
            ).join('');
            
    } catch (error) {
        console.error('Erro:', error);
        const opcoesPadrao = [];
        for (let h = 18; h < 23; h++) {
            opcoesPadrao.push({
                valor: `${String(h).padStart(2, '0')}:00`,
                texto: `${String(h).padStart(2, '0')}:00 às ${String(h+1).padStart(2, '0')}:00`
            });
        }
        
        select.innerHTML = '<option value="">Selecione o horário (padrão)</option>' +
            opcoesPadrao.map(h =>
                `<option value="${dataSelecionada}|${h.valor}">${h.texto}</option>`
            ).join('');
    }
}

window.toggleDelivery = async function(isDelivery) {
    if (isDelivery === undefined) isDelivery = document.getElementById('deliveryOption').checked;
    
    document.getElementById('deliveryFields').style.display = isDelivery ? 'block' : 'none';
    document.getElementById('pickupFields').style.display = isDelivery ? 'none' : 'block';
    
    document.getElementById('agendamentoFields').style.display = 'none';
    let avisoDiv = document.getElementById('avisoDelivery');
    if(avisoDiv) avisoDiv.style.display = 'none';
    
    modoAgendamento = false;
    
    const status = await verificarDisponibilidade(isDelivery ? 'delivery' : 'loja');
    let btn = document.querySelector('.whatsapp-btn');
    btn.disabled = false;
    btn.innerHTML = '📲 Enviar Pedido via WhatsApp';
    
    if (!status.disponivel) {
        let mensagem = isDelivery ? '🚫 Delivery Fechado' : '🏪 Loja Fechada';
        let corBotao = isDelivery ? '#2196F3' : '#ff9800';
        
        avisoDiv.innerHTML = `
            <p style="margin-bottom: 8px; font-weight: bold;">${mensagem}</p>
            <p style="font-size: 13px; margin-bottom: 12px;">${status.mensagem || 'Fora do horário de funcionamento'}</p>
            <button style="background:${corBotao}; color:white; border:none; padding:12px; border-radius:5px; width:100%; font-weight:bold; cursor:pointer; margin-bottom:8px;" onclick="mostrarAgendamento()">
                📅 Agendar ${isDelivery ? 'Entrega' : 'Retirada'}
            </button>
            ${isDelivery ? `
                <button style="background:#4CAF50; color:white; border:none; padding:12px; border-radius:5px; width:100%; font-weight:bold; cursor:pointer;" onclick="toggleDelivery(false)">
                    🏪 Retirar na Loja
                </button>
            ` : ''}
        `;
        avisoDiv.style.display = 'block';
        btn.innerHTML = '⚠️ Requer Agendamento';
    }
    
    if (isDelivery) {
        document.getElementById('freteInfo').innerHTML = '👆 Informe seu CEP.';
        document.getElementById('freteInfo').className = 'frete-info';
        taxaFrete = 0;
        dentroAreaEntrega = false;
    } else {
        taxaFrete = 0;
        dentroAreaEntrega = false;
        document.getElementById('cepInfo').innerHTML = '';
    }
    
    calcularSubtotalGeral();
}

window.finalizarPedido = async function() {
    const tipo = document.querySelector('input[name="deliveryType"]:checked').value;
    let nome, tel;
    let strAgendamento = "";
    
    if (modoAgendamento) {
        const dataAgendamento = document.getElementById('dataAgendamento')?.value;
        const horarioAgendamento = document.getElementById('horarioAgendamento')?.value;
        
        if (!dataAgendamento || !horarioAgendamento) {
            alert('⚠️ Selecione a Data e o Horário para o agendamento!');
            return;
        }
        
        const [dataStr, horaStr] = horarioAgendamento.split('|');
        const dataFormatada = new Date(dataStr + 'T12:00:00').toLocaleDateString('pt-BR');
        strAgendamento = `📅 Agendado para: ${dataFormatada} às ${horaStr}`;
    }
    
    if(tipo === 'delivery') {
        nome = document.getElementById('clienteNome').value.trim();
        tel = document.getElementById('clienteTelefone').value.trim();
        
        if(!nome || !tel || !document.getElementById('clienteEndereco').value || !document.getElementById('clienteNumero').value) {
            return alert('Preencha todos os dados de entrega!');
        }
        
        if(!dentroAreaEntrega) {
            return alert('Desculpe, este endereço está fora da área de entrega calculada.');
        }
    } else {
        nome = document.getElementById('pickupNome').value.trim();
        tel = document.getElementById('pickupTelefone').value.trim();
        
        if(!nome || !tel) {
            return alert('Preencha seu nome e WhatsApp!');
        }
    }
    
    const btn = document.querySelector('.whatsapp-btn');
    btn.innerHTML = '⏳ Processando...';
    btn.disabled = true;
    
    const sub = carrinho.reduce((s, i) => s + i.precoTotalLinha, 0);
    const totalFinal = sub + (tipo === 'delivery' ? taxaFrete : 0);
    
    let dadosPedido = {
        cliente_nome: nome,
        cliente_telefone: tel,
        tipo_entrega: tipo,
        taxa_entrega: tipo === 'delivery' ? taxaFrete : 0,
        subtotal: sub,
        total: totalFinal,
        observacoes: strAgendamento ? `[AGENDADO] ${strAgendamento}` : '',
        itens: carrinho.map(i => {
            let n = i.nome;
            if(i.complementos.length > 0) n += ' (+ ' + i.complementos.map(c => c.nome).join(', ') + ')';
            if(i.observacao) n += ` [Obs: ${i.observacao}]`;
            
            return {
                produto_id: i.idProduto,
                produto_nome: n,
                quantidade: i.quantidade,
                preco_unitario: i.precoUnitario,
                subtotal: i.precoTotalLinha
            };
        })
    };
    
    if (tipo === 'delivery') {
        const comp = document.getElementById('clienteComplemento').value;
        dadosPedido.cliente_endereco = `${document.getElementById('clienteEndereco').value}, ${document.getElementById('clienteNumero').value}${comp ? ' - ' + comp : ''}`;
        dadosPedido.cliente_bairro = document.getElementById('clienteBairro').value;
        dadosPedido.cliente_cep = document.getElementById('cepInput').value;
    }
    
    let idPedidoReal = '';
    
    try {
        const res = await fetch(`${API_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subdominio: SUBDOMINIO, pedido: dadosPedido })
        });
        
        const dbData = await res.json();
        if(dbData && dbData.pedido_id) idPedidoReal = ` #${dbData.pedido_id}`;
        
    } catch(e) {}
    
    let msg = `🍽️ *NOVO PEDIDO${idPedidoReal}*\n━━━━━━━━━━━━━━━━\n`;
    if(strAgendamento) msg += `*${strAgendamento}*\n━━━━━━━━━━━━━━━━\n`;
    
    msg += `👤 *Cliente:* ${nome}\n📱 *Tel:* ${tel}\n\n🛍️ *RESUMO:*\n\n`;
    
    carrinho.forEach(i => {
        msg += `*${i.quantidade}x ${i.nome}* (R$ ${i.precoTotalLinha.toFixed(2)})\n`;
        i.complementos.forEach(c => {
            msg += `  ▫️ ${c.nome}${parseFloat(c.preco)>0 ? ` (+R$ ${parseFloat(c.preco).toFixed(2)})` : ''}\n`;
        });
        if(i.observacao) msg += `  💬 *Obs:* ${i.observacao}\n`;
        msg += `\n`;
    });
    
    msg += `━━━━━━━━━━━━━━━━\n💵 Subtotal: R$ ${sub.toFixed(2)}\n`;
    
    if(tipo === 'delivery') {
        msg += `🚚 Frete: ${taxaFrete > 0 ? 'R$ '+taxaFrete.toFixed(2) : '*GRÁTIS*'}\n`;
        msg += `📍 *ENTREGA EM:*\n${dadosPedido.cliente_endereco}\n${dadosPedido.cliente_bairro} - CEP: ${dadosPedido.cliente_cep}\n`;
    } else {
        msg += `🏠 *RETIRADA NA LOJA*\n`;
    }
    
    msg += `\n💰 *TOTAL A PAGAR: R$ ${totalFinal.toFixed(2)}*`;
    
    carrinho = [];
    atualizarRodapeCarrinho();
    
    btn.innerHTML = '📲 Enviar Pedido via WhatsApp';
    btn.disabled = false;
    fecharCarrinho();
    
    let nw = configuracoesLoja.whatsapp || '5551999999999';
    nw = nw.replace(/\D/g, '');
    if(!nw.startsWith('55')) nw = '55' + nw;
    
    window.open(`https://wa.me/${nw}?text=${encodeURIComponent(msg)}`, '_blank');
}