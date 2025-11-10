
// FLOW v9.5 FULL – app.js
(function(){
  const $=s=>document.querySelector(s);
  const $$=s=>document.querySelectorAll(s);
  const LSKEY='flow-data-v95';
  const now=new Date();
  const pad=n=>String(n).padStart(2,'0');
  const ymd=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const ym=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
  const fmt=v=> (isNaN(v)?0:v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const num=v=>{ if (typeof v==='number') return v; v=(v||'').toString().replace(/\./g,'').replace(',','.'); return parseFloat(v)||0; };
  const el=(tag,attrs={},children=[])=>{const e=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>{
    if(k==='class') e.className=v; else if(k==='html') e.innerHTML=v; else e.setAttribute(k,v);
  }); children.forEach(c=>e.append(c)); return e};

  // Estado
  let S = load() || seed();

  function seed(){
    return {
      month: ym(),
      entries: [],        // {id, owner, cliente, forma, data, total, entrada, dizimo, liquido}
      expenses: [],       // {id, data, categoria, tipo, valor, venc, obs, pago:false}
      parcels: [],        // {id, nome, valor, total, pagas, vencDia}
      goals: [            // com base nos seus dados
        {id:id(), nome:'Serasa — Thiago (Claro)', alvo:325.52, acum:0},
        {id:id(), nome:'Serasa — Thiago (Shopee)', alvo:173.59, acum:0},
        {id:id(), nome:'Serasa — Adriele', alvo:3000, acum:0},
        {id:id(), nome:'Acordo Andrey', alvo:3000, acum:0},
        {id:id(), nome:'Acordo Gabriel', alvo:2000, acum:0},
        {id:id(), nome:'Manutenção preventiva carro', alvo:2300, acum:0},
        {id:id(), nome:'DPVAT + Multa', alvo:232.50, acum:0},
        {id:id(), nome:'13º Thiago', alvo:5000, acum:0},
        {id:id(), nome:'Viagem fim de ano', alvo:2500, acum:0},
        {id:id(), nome:'Reserva emergencial', alvo:3000, acum:0},
      ],
      alloc:{auto:false, map:{}}, // {goalId: percent}
      // exemplos de despesas fixas/variáveis
      defaultsLoaded:false
    };
  }

  function load(){ try{return JSON.parse(localStorage.getItem(LSKEY)||'');}catch(e){return null;} }
  function save(){ localStorage.setItem(LSKEY, JSON.stringify(S)); }
  function id(){ return Math.random().toString(36).slice(2,10); }

  // Helpers mês
  const filterMonth = $('#filterMonth');
  if (filterMonth){ filterMonth.value = S.month; filterMonth.addEventListener('change',()=>{ S.month = filterMonth.value; save(); renderAll(); }); }

  // PDF
  const btnPDF = $('#btnPDF'), goPDF = $('#goPDF');
  [btnPDF, goPDF].forEach(b=> b && b.addEventListener('click', ()=> window.print()));

  // Menu lateral (drawer)
  const btnMenu = $('#btnMenu'), drawer = $('#drawer'), overlay=$('#drawerOverlay');
  function openDrawer(show){ if(!drawer||!overlay) return; drawer.classList.toggle('show', show); overlay.classList.toggle('show', show); if(btnMenu) btnMenu.setAttribute('aria-expanded', show?'true':'false'); }
  btnMenu && btnMenu.addEventListener('click', ()=>openDrawer(true));
  overlay && overlay.addEventListener('click', ()=>openDrawer(false));
  $$('#drawer [data-go]').forEach(a=>a.addEventListener('click', (e)=>{e.preventDefault(); openDrawer(false); const id=a.getAttribute('data-go'); const sec=$(`#tab-${id}`); sec && sec.scrollIntoView({behavior:'smooth', block:'start'});}));

  // ------- Entradas
  const qOwner=$('#qOwner'), qCliente=$('#qCliente'), qForma=$('#qForma'), qDate=$('#qDate'), qTotal=$('#qTotal'), qEntrada=$('#qEntrada');
  const formQuick=$('#formQuick'), kpis=$('#kpis'), listaEntradas=$('#listaEntradas');
  qDate && (qDate.value = ymd());
  formQuick && formQuick.addEventListener('submit', (e)=>{
    e.preventDefault();
    const total=num(qTotal.value), ent=num(qEntrada.value);
    const diz= +(ent*0.10).toFixed(2);
    const liq= +(ent-diz).toFixed(2);
    const item={ id:id(), owner:qOwner.value, cliente:qCliente.value.trim(), forma:qForma.value.trim(), data:qDate.value, total:total, entrada:ent, dizimo:diz, liquido:liq, ym: qDate.value.slice(0,7) };
    S.entries.push(item);
    // Autoalocação
    if (S.alloc.auto){
      const map=S.alloc.map||{};
      const keys=Object.keys(map).filter(k=>map[k]>0);
      const somaPct = keys.reduce((a,k)=>a+num(map[k]),0) || 0;
      keys.forEach(goalId=>{
        const g=findGoal(goalId);
        if(!g) return;
        const pct = num(map[goalId])/(somaPct||100);
        const val = +(liq * pct).toFixed(2);
        g.acum = +(num(g.acum)+val).toFixed(2);
      });
    }
    save();
    formQuick.reset();
    qOwner.value='Thiago'; qDate.value=ymd();
    renderResumo(); renderEntradas(); renderMetas(); // atualiza
  });

  function entradasMes(){
    return S.entries.filter(x=> (x.ym||x.data.slice(0,7)) === S.month );
  }

  function renderEntradas(){
    if(!listaEntradas) return;
    listaEntradas.innerHTML='';
    const it=entradasMes();
    it.sort((a,b)=>a.data.localeCompare(b.data));
    it.forEach(x=>{
      const row=el('div',{class:'item'},[
        el('div',{class:'top'},[
          el('div',{class:'meta'},[
            el('span',{class:'badge',html:`${x.owner}`}), 
            el('span',{class:'badge',html:`${x.forma}`}), 
            el('span',{class:'badge',html:`${x.data}`})
          ]),
          el('button',{class:'badge',onclick:()=>{ S.entries=S.entries.filter(e=>e.id!==x.id); save(); renderAll(); }},['Excluir'])
        ]),
        el('div',{class:'meta'},[
          el('span',{html:`Cliente: <b>${x.cliente||'-'}</b>`}),
          el('span',{html:`Total serviço: <b>${fmt(x.total)}</b>`}),
          el('span',{html:`Entrada: <b>${fmt(x.entrada)}</b>`}),
          el('span',{html:`Dízimo: <b>${fmt(x.dizimo)}</b>`}),
          el('span',{html:`Líquido: <b>${fmt(x.liquido)}</b>`}),
        ])
      ]);
      listaEntradas.append(row);
    });
    // KPIs
    const bruto = it.reduce((a,x)=>a+num(x.entrada),0);
    const diz = it.reduce((a,x)=>a+num(x.dizimo),0);
    const liq = it.reduce((a,x)=>a+num(x.liquido),0);
    kpis && (kpis.innerHTML = `Bruto: <b>${fmt(bruto)}</b> • Dízimo: <b>${fmt(diz)}</b> • Líquido: <b>${fmt(liq)}</b>`);
  }

  // ------- Despesas
  const formDesp=$('#formDesp'), dDate=$('#dDate'), dCategoria=$('#dCategoria'), dKind=$('#dKind'), dValor=$('#dValor'), dVenc=$('#dVenc'), dObs=$('#dObs');
  const listaDespesas=$('#listaDespesas');
  dDate && (dDate.value=ymd());
  formDesp && formDesp.addEventListener('submit', e=>{
    e.preventDefault();
    const it={ id:id(), data:dDate.value, categoria:dCategoria.value.trim(), tipo:dKind.value, valor:num(dValor.value), venc:dVenc.value||'', obs:dObs.value||'', pago:false, ym:(dDate.value||ymd()).slice(0,7)};
    S.expenses.push(it); save(); formDesp.reset(); dDate.value=ymd(); renderDespesas(); renderResumo();
  });

  function despesasMes(){ return S.expenses.filter(x=> (x.ym||x.data.slice(0,7))===S.month ); }

  function renderDespesas(){
    if(!listaDespesas) return;
    listaDespesas.innerHTML='';
    const it=despesasMes().sort((a,b)=> (a.pago===b.pago? 0 : a.pago?1:-1) || (a.venc||'').localeCompare(b.venc||''));
    it.forEach(x=>{
      const paid= x.pago ? 'style="background:#f1fff1;border-color:#b6e4b6"' : '';
      const row=el('div',{class:'item',html:`
        <div class="top">
          <div class="meta">
            <span class="badge">${x.tipo==='fixa'?'Fixa':'Variável'}</span>
            ${x.venc? `<span class="badge">Venc.: ${x.venc}</span>`:''}
            <span class="badge">${fmt(x.valor)}</span>
          </div>
          <div>
            <button class="badge" onclick="FLOW.togglePago('${x.id}')">${x.pago?'Desfazer pago':'Marcar pago'}</button>
            <button class="badge" onclick="FLOW.delDesp('${x.id}')">Excluir</button>
          </div>
        </div>
        <div class="meta">
          <span>Categoria: <b>${x.categoria}</b></span>
          ${x.obs? `<span>Obs: <b>${x.obs}</b></span>`:''}
          <span>Data: ${x.data}</span>
        </div>
      `});
      if(x.pago) row.setAttribute('style','background:#f7fff7;border-color:#cdeccc');
      listaDespesas.append(row);
    });
  }

  // ------- Parcelamentos
  const formParc=$('#formParc'), pNome=$('#pNome'), pParcela=$('#pParcela'), pTotal=$('#pTotal'), pPagas=$('#pPagas'), pVencDia=$('#pVencDia');
  const listaParcelas=$('#listaParcelas');
  formParc && formParc.addEventListener('submit',(e)=>{
    e.preventDefault();
    const it={ id:id(), nome:pNome.value.trim(), valor:num(pParcela.value), total:parseInt(pTotal.value||1), pagas:parseInt(pPagas.value||0), vencDia:parseInt(pVencDia.value||1)};
    S.parcels.push(it); save(); formParc.reset(); renderParcelas(); renderResumo();
  });

  function renderParcelas(){
    if(!listaParcelas) return;
    listaParcelas.innerHTML='';
    S.parcels.forEach(x=>{
      const perc = Math.min(100, Math.round(((x.pagas||0)/x.total)*100));
      const row=el('div',{class:'item'},[
        el('div',{class:'top'},[ el('strong',{html:x.nome}), el('span',{class:'badge',html:`${x.pagas||0}/${x.total}`}) ]),
        el('div',{class:'meta'},[ el('span',{html:`Parcela: <b>${fmt(x.valor)}</b>`}), el('span',{html:`Venc. dia: ${x.vencDia||'-'}`}) ]),
        el('div',{class:'progress'},[el('div',{class:'bar',style:`width:${perc}%`})]),
        el('div',{class:'top'},[
          el('button',{class:'badge',onclick:()=>{x.pagas=Math.min(x.total,(x.pagas||0)+1); save(); renderParcelas();}},['+1']),
          el('button',{class:'badge',onclick:()=>{x.pagas=Math.max(0,(x.pagas||0)-1); save(); renderParcelas();}},['-1']),
          el('button',{class:'badge',onclick:()=>{S.parcels=S.parcels.filter(p=>p.id!==x.id); save(); renderParcelas();}},['Excluir'])
        ])
      ]);
      listaParcelas.append(row);
    });
  }

  // ------- Metas & Autoalocação
  const metasWrap=$('#metas'), formMeta=$('#formMeta'), mNome=$('#mNome'), mAlvo=$('#mAlvo'), mPrazo=$('#mPrazo');
  const alWrap=$('#alocacoes'), autoApply=$('#autoApply'), saveAlloc=$('#saveAlloc'), simValor=$('#simValor'), alPrev=$('#alocPrev');
  const saldoDisp=$('#saldoDisp'), pctMes=$('#pctMes'), distSug=$('#distSug'), btnAplicarDist=$('#btnAplicarDist');

  formMeta && formMeta.addEventListener('submit', e=>{
    e.preventDefault();
    S.goals.push({id:id(), nome:mNome.value.trim(), alvo:num(mAlvo.value), acum:0, prazo:mPrazo.value||''});
    save(); formMeta.reset(); renderMetas();
  });

  function findGoal(gid){ return S.goals.find(g=>g.id===gid); }

  function renderMetas(){
    if(!metasWrap) return;
    metasWrap.innerHTML='';
    S.goals.forEach(g=>{
      const perc=Math.min(100, Math.round((num(g.acum)/Math.max(1,num(g.alvo)))*100));
      const card=el('div',{class:'item'},[
        el('div',{class:'top'},[ el('strong',{html:g.nome}), el('span',{class:'badge',html:`Alvo: ${fmt(g.alvo)} • Acum.: ${fmt(g.acum)} (${perc}%)`}) ]),
        el('div',{class:'progress'},[ el('div',{class:'bar',style:`width:${perc}%`}) ]),
        el('div',{class:'top'},[
          el('button',{class:'badge',onclick:()=>{const v=prompt('Depositar na meta (R$):','100'); if(v!==null){ g.acum=+(num(g.acum)+num(v)).toFixed(2); save(); renderMetas(); renderResumo(); } }},['Depositar']),
          el('button',{class:'badge',onclick:()=>{const v=prompt('Retirar da meta (R$):','50'); if(v!==null){ g.acum=Math.max(0, +(num(g.acum)-num(v)).toFixed(2)); save(); renderMetas(); renderResumo(); } }},['Retirar']),
          el('button',{class:'badge',onclick:()=>{ if(confirm('Excluir meta?')){ S.goals=S.goals.filter(x=>x.id!==g.id); save(); renderMetas(); renderResumo(); } }},['Excluir'])
        ])
      ]);
      metasWrap.append(card);
    });

    // Alocação
    if(alWrap){
      alWrap.innerHTML='';
      autoApply && (autoApply.checked = !!S.alloc.auto);
    const totalPct = Object.values(S.alloc.map||{}).reduce((a,b)=>a+num(b),0);
      S.goals.forEach(g=>{
        const pct = (S.alloc.map||{})[g.id] ?? 0;
        const line=el('div',{class:'top'},[
          el('span',{html:`${g.nome}`}), 
          el('span',{html:`<input type="number" step="1" min="0" max="100" style="width:80px" value="${pct}" data-goal="${g.id}"> %`})
        ]);
        alWrap.append(line);
      });
      // preview
      if(alPrev){
        const sim=num(simValor?.value||1000);
        const map={};
        (S.alloc.map||{}); alPrev.innerHTML='';
        const keys=S.goals.map(g=>g.id).filter(id=>num((S.alloc.map||{})[id])>0);
        const somaPct=keys.reduce((a,k)=>a+num(S.alloc.map[k]),0) || 0;
        keys.forEach(k=>{
          const g=findGoal(k); if(!g) return;
          const pct = num(S.alloc.map[k])/(somaPct||100);
          const val = +(sim*pct).toFixed(2);
          alPrev.append(el('div',{class:'badge',html:`${g.nome}: <b>${fmt(val)}</b>`}));
        });
      }
    }
  }

  saveAlloc && saveAlloc.addEventListener('click', (e)=>{
    e.preventDefault();
    S.alloc.auto = !!autoApply?.checked;
    S.alloc.map = {};
    alWrap && alWrap.querySelectorAll('input[data-goal]').forEach(inp=>{
      const gid=inp.getAttribute('data-goal'); S.alloc.map[gid]=num(inp.value);
    });
    save(); renderMetas(); alert('Alocação salva.');
  });
  simValor && simValor.addEventListener('input', ()=>renderMetas());

  // Distribuição do saldo disponível (manual por % do líquido do mês)
  btnAplicarDist && btnAplicarDist.addEventListener('click', (e)=>{
    e.preventDefault();
    const liq = entradasMes().reduce((a,x)=>a+num(x.liquido),0);
    const pct = num(pctMes?.value||0)/100;
    let montante = +(liq*pct).toFixed(2);
    const keys=S.goals.map(g=>g.id).filter(id=> num((S.alloc.map||{})[id])>0 );
    const somaPct=keys.reduce((a,k)=>a+num(S.alloc.map[k]),0)||0;
    keys.forEach(k=>{
      const g=findGoal(k); if(!g) return;
      const val= +(montante * (num(S.alloc.map[k])/(somaPct||100))).toFixed(2);
      g.acum= +(num(g.acum)+val).toFixed(2);
    });
    save(); renderMetas(); renderResumo(); alert('Distribuição aplicada.');
  });

  // ------- Resumo & Alertas & Gráfico
  const alerts=$('#alerts'), chartEl=$('#chart');
  function renderResumo(){
    // Alerts: despesas não pagas por vencimento + parcelamentos (próximo vencimento)
    if(alerts){
      alerts.innerHTML='';
      const hoje=ymd();
      despesasMes().forEach(d=>{
        if(d.pago) return;
        let label='';
        if (d.venc){
          if (d.venc < hoje) label='ATRASADA';
          else label='vence em breve';
        }
        const chip=el('div',{class:'item'},[
          el('div',{class:'top'},[ el('strong',{html:d.categoria}), el('span',{class:'badge',html:`${label||'a pagar'}`}) ]),
          el('div',{class:'meta'},[ el('span',{html:`Venc.: ${d.venc||'-'}`}), el('span',{html:`Valor: <b>${fmt(d.valor)}</b>`}) ]),
          el('button',{class:'badge',onclick:()=>{togglePago(d.id)}},['Marcar pago'])
        ]);
        alerts.append(chip);
      });
      // Parcelamentos — apenas badge informativa
      S.parcels.forEach(p=>{
        const perc = Math.round(((p.pagas||0)/p.total)*100);
        const chip=el('div',{class:'item'},[
          el('div',{class:'top'},[ el('strong',{html:`${p.nome}`}), el('span',{class:'badge',html:`${p.pagas||0}/${p.total} (${perc}%)`}) ]),
          el('div',{class:'meta'},[ el('span',{html:`Parcela: ${fmt(p.valor)}`}), el('span',{html:`Venc. dia ${p.vencDia||'-'}`}) ]),
        ]);
        alerts.append(chip);
      });
    }
    // saldo disponível para distribuição
    const liq = entradasMes().reduce((a,x)=>a+num(x.liquido),0);
    saldoDisp && (saldoDisp.innerHTML = `Saldo disp.: ${fmt(liq)}`);
    // Gráfico metas
    drawChart();
  }

  // Chart simples
  function drawChart(){
    if(!chartEl) return;
    const ctx=chartEl.getContext('2d');
    const w=chartEl.width = chartEl.clientWidth || 600;
    const h=chartEl.height = chartEl.clientHeight || 360;
    ctx.clearRect(0,0,w,h);
    const goals=S.goals.slice(0,8); // mostra as 8 primeiras para caber
    const left=140, right=20, top=20, barH=24, gap=16;
    goals.forEach((g,i)=>{
      const y=top+i*(barH+gap);
      const perc=Math.min(1, (num(g.acum)/Math.max(1,num(g.alvo))));
      // label
      ctx.fillStyle='#0F1A3A'; ctx.font='14px system-ui, -apple-system, sans-serif';
      let name=g.nome; if(name.length>22) name=name.slice(0,22)+'…';
      ctx.fillText(name, 12, y+barH-6);
      // bar bg
      ctx.fillStyle='#E3EBFF'; ctx.fillRect(left, y, w-left-right, barH);
      // bar
      ctx.fillStyle='#3F7DFF'; ctx.fillRect(left, y, (w-left-right)*perc, barH);
      // pct
      ctx.fillStyle='#0F1A3A'; ctx.font='12px system-ui'; ctx.fillText(`${Math.round(perc*100)}%`, w-right-36, y+barH-6);
    });
  }

  // ------- Backup / Import
  const btnExport=$('#btnExport'), btnImport=$('#btnImport'), fileImport=$('#fileImport');
  btnExport && btnExport.addEventListener('click', ()=>{
    const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`FLOW_${S.month}.json`; a.click();
  });
  btnImport && btnImport.addEventListener('click', ()=>{
    if(!fileImport.files[0]) return alert('Selecione um arquivo .json');
    const f=fileImport.files[0]; const r=new FileReader();
    r.onload=()=>{ try{ S=JSON.parse(r.result); save(); renderAll(); alert('Backup importado.'); }catch(e){ alert('Arquivo inválido.'); } };
    r.readAsText(f);
  });

  // ------- Ações globais usadas no HTML
  function togglePago(idDesp){ const d=S.expenses.find(x=>x.id===idDesp); if(!d) return; d.pago=!d.pago; save(); renderDespesas(); renderResumo(); }
  function delDesp(idDesp){ S.expenses=S.expenses.filter(x=>x.id!==idDesp); save(); renderDespesas(); renderResumo(); }
  window.FLOW={togglePago, delDesp};

  // ------- Inicialização
  function renderAll(){
    renderEntradas();
    renderDespesas();
    renderParcelas();
    renderMetas();
    renderResumo();
  }

  // Primeira carga
  if (!S.defaultsLoaded){
    // Popula alguns fixos que você passou (como lembretes iniciais)
    const today=ymd();
    const add=(cat, val, venc)=>S.expenses.push({id:id(), data:today, categoria:cat, tipo:'fixa', valor:val, venc:venc||'', obs:'', pago:false, ym:ym()});
    add('Aluguel',1600,''); // venc. você ajusta
    add('Luz',278.96,'');
    add('Água',253.88,'');
    add('Mercado',500,'');
    add('Internet/Telefone',128.99,'');
    add('Cartão Nubank',232.78,''); 
    add('Internet TIM móvel',48.99,'');
    add('Cartão Gabriel Sofá',250,'');
    // Variáveis
    S.expenses.push({id:id(), data:today, categoria:'Farmácia', tipo:'variavel', valor:150, venc:'', obs:'', pago:false, ym:ym()});
    S.defaultsLoaded=true; save();
  }

  window.addEventListener('resize', drawChart, {passive:true});
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) drawChart(); });

  // SW hard-refresh helper: se o cache antigo servir app.html, força buscar novo
  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(list=>{
      list.forEach(r=>{
        if(!r.active) return;
        r.update().catch(()=>{});
      });
    });
  }

  // Vamos lá
  setTimeout(renderAll, 0);
})();
