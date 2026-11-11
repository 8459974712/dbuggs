(() => {
  'use strict';
  const date = value => value ? new Date(value).toLocaleDateString('en-IN') : '—';
  const wrap = (route, body, M) => M.layout(route==='b2b'?'':'Business workspace',body,{business:true,tab:route});
  const stat = (label,value,M) => `<div class="stat"><span>${label}</span><strong>${M.esc(value)}</strong></div>`;
  const post = (M,path,body) => M.api(path,{method:'POST',...(body?{body:JSON.stringify(body)}:{})});
  let match = null;
  let quoteDraft = '';
  function bulkLine() {
    return '<fieldset class="bulk-line"><legend>Laptop requirement</legend><label>Brand<input name="brand" required maxlength="60" placeholder="Dell"></label><label>Model<input name="model" maxlength="100" placeholder="Any model"></label><div class="bulk-fields"><label>Grade<select name="grade"><option value="">Any grade</option><option>A+</option><option>A</option><option>B</option><option>C</option></select></label><label>Quantity<input name="qty" type="number" value="1" min="1" max="100" required inputmode="numeric"></label></div><button type="button" class="text-link" data-business-action="remove-line">Remove line</button></fieldset>';
  }
  function bulkResult(M) {
    if (!match) return '';
    const result=match.result;
    return `<section class="panel"><h2>Stock matches</h2>${result.lines.map(line=>`<div class="bulk-match"><div class="row"><strong>${M.esc([line.input.brand,line.input.model].filter(Boolean).join(' '))}</strong><span class="tag">${line.matched.length} / ${M.esc(line.input.qty)}</span></div>${line.matched.map(unit=>`<div class="summary-row"><span>${M.esc(unit.brand+' '+unit.model)}<br><small>${M.esc([unit.grade,unit.ram,unit.storage].filter(Boolean).join(' · '))}</small></span><b>${M.money(unit.sellingPrice)}</b></div>`).join('')}${line.shortBy?'<p class="small muted">'+M.esc(line.shortBy)+' units unavailable</p>':''}</div>`).join('')}<div class="summary-row"><strong>Estimated total</strong><b>${M.money(result.estimatedTotal)}</b></div><p class="small muted">Final price and stock are checked at checkout.</p><button type="button" class="orange full section-button" data-business-action="bulk-cart" ${!result.units||result.units>50?'disabled':''}>Add matched laptops to bag</button>${result.units>50?'<p class="small muted">Orders above 50 units need a quotation.</p>':''}<button type="button" class="outline full section-button" data-business-action="bulk-quote">Request quotation</button></section>`;
  }

  async function render(route,M) {
    if (!M.token()) return M.layout('Business workspace',M.empty('Sign in to continue','Use your DBUGG business account.','login','Sign in'));
    const buyer=await M.api('/b2b/my');
    if (!buyer?.id) return M.layout('Business workspace',M.empty('Buy laptops for your business','Apply for business purchasing, bulk quotes and credit terms.')+'<a class="orange button-link full" href="/b2b-register.html">Apply for a business account</a>');
    if (!buyer.isApproved) return M.layout('Business workspace',M.empty('Approval required','An approved business account is required to see wholesale tools.'));
    if (route==='b2b-bulk') {
      if(match?.buyer!==buyer.id)match=null;
      return M.layout('Bulk order',`<section class="business-hero"><span class="dealer-badge">BUSINESS</span><h1>Find stock in bulk</h1><p>Enter your laptop requirements to see matching units and estimated pricing.</p></section><form class="panel form" data-form="business-bulk"><div id="bulk-lines">${bulkLine()}</div><button type="button" class="outline full" data-business-action="add-line">+ Add another line</button><button class="orange full section-button">Check stock</button><p class="form-status" role="status"></p></form><div id="bulk-result">${bulkResult(M)}</div>`,{business:true,tab:'b2b'});
    }
    if (route==='b2b-ledger') {
      const {summary,entries}=await M.api('/b2b/ledger');
      return wrap(route,`<div class="wallet-card"><div>Available credit</div><strong>${M.money(summary.creditAvailable)}</strong></div><div class="stats business-stats">${stat('Credit limit',M.money(summary.creditLimit),M)}${stat('Outstanding',M.money(summary.creditUsed),M)}${stat('GST',M.money(summary.gstOnPurchases),M)}</div><h2>Ledger activity</h2>${entries.length?entries.map(e=>`<article class="panel"><div class="row"><b>${M.esc(e.reference||e.type||'Ledger entry')}</b><strong>${M.money(e.amount)}</strong></div><p class="muted small">${date(e.createdAt)} · ${M.esc(e.type||'')}</p></article>`).join(''):M.empty('No ledger entries','Credit transactions will appear here.')}`,M);
    }
    if (route==='b2b-rfq') {
      const quotes=await M.api('/b2b/rfq');
      return wrap(route,`<section class="panel"><h2>Request a quote</h2><form data-form="business-rfq" class="form"><label>Requirements<textarea name="details" minlength="10" maxlength="2000" placeholder="Models, quantity and delivery city" required>${M.esc(quoteDraft)}</textarea></label><button class="orange full">Send request</button><p class="form-status" role="status"></p></form></section><h2>My quotes</h2>${quotes.length?quotes.map(q=>`<article class="panel"><div class="row"><b>${M.esc(q.rfqNumber)}</b><span class="tag">${M.esc(q.status)}</span></div><p class="small business-detail">${M.esc(q.details)}</p>${q.total?`<strong>${M.money(q.total)}</strong><p class="small muted">Valid until ${date(q.validUntil)}</p>`:''}${q.status==='quoted'?'<a class="outline button-link" href="/b2b-panel/rfq.html">Review quotation</a>':''}</article>`).join(''):M.empty('No quotes yet','Send your requirements to request pricing.')}`,M);
    }
    const orders=(await M.api('/orders')).filter(o=>o.type==='b2b');
    if(route==='b2b-orders')return wrap(route,`<h2>Business orders</h2>${orders.length?orders.map(o=>`<article class="panel"><div class="row"><b>${M.esc(o.orderNumber)}</b><span class="tag">${M.esc(o.status)}</span></div><p class="small muted">${date(o.createdAt)}</p><div class="summary-row"><strong>${M.money(o.amount)}</strong><a class="text-link" href="#order/${encodeURIComponent(o.id)}">Track order</a></div></article>`).join(''):M.empty('No business orders','Your bulk purchases will appear here.')}`,M);
    return wrap('b2b',`<section class="business-hero b2b-overview"><div class="row"><span class="logo">dbu<span>ggs</span></span><span class="dealer-badge">BUSINESS</span></div><h1>${M.esc(buyer.companyName||'Business account')}</h1><p>Available credit</p><div class="balance">${M.money(Number(buyer.creditLimit||0)-Number(buyer.creditUsed||0))}</div></section><div class="stats business-stats">${stat('Credit limit',M.money(buyer.creditLimit),M)}${stat('Credit used',M.money(buyer.creditUsed),M)}${stat('Orders',orders.length,M)}</div><section class="section"><h2>Quick actions</h2><div class="actions"><a class="quick-action" href="#b2b-bulk">${M.icon('stock')}<span>Bulk order</span></a><a class="quick-action" href="#b2b-rfq">${M.icon('document')}<span>Quotes</span></a><a class="quick-action" href="#b2b-orders">${M.icon('orders')}<span>Orders</span></a><a class="quick-action" href="#b2b-ledger">${M.icon('wallet')}<span>Credit</span></a></div></section><section class="panel"><h2>Buy in bulk</h2><p class="small muted business-detail">Match your laptop list to available stock and use purchase-order checkout if eligible.</p><a class="orange button-link full" href="#b2b-bulk">Open bulk ordering</a></section><a class="outline button-link full" href="#b2b-rfq">Request a quote</a>`,M);
  }
  async function submit(name,form,M) {
    if(name==='business-bulk') {
      const buyer=await M.api('/b2b/my');
      if(!buyer?.isApproved)throw new Error('Business approval is required.');
      const items=[...form.querySelectorAll('.bulk-line')].map(line=>{
        const value=name=>line.querySelector('[name="'+name+'"]').value.trim();
        return {brand:value('brand'),model:value('model'),grade:value('grade'),qty:Number(value('qty'))};
      });
      if(!items.length||items.some(x=>!x.brand||!Number.isInteger(x.qty)||x.qty<1||x.qty>100))throw new Error('Enter a brand and a quantity from 1 to 100 on each line.');
      const result=await post(M,'/b2b/bulk-match',{items});
      if(!form.isConnected)return true;
      match={buyer:buyer.id,items,result};
      const target=document.getElementById('bulk-result');
      if(target){target.innerHTML=bulkResult(M);target.scrollIntoView({block:'nearest'});}
      return true;
    }
    if(name!=='business-rfq')return false;
    const details=String(new FormData(form).get('details')||'').trim();
    if(details.length<10)throw new Error('Enter at least 10 characters.');
    const buyer=await M.api('/b2b/my');
    if(!buyer?.isApproved)throw new Error('Business approval is required.');
    await post(M,'/b2b/rfq',{details});quoteDraft='';M.toast('Quote request submitted');M.go('b2b-rfq');return true;
  }
  function action(name,button,M) {
    if(name==='add-line'){
      const lines=document.getElementById('bulk-lines');
      if(lines.children.length>=50)return M.toast('Maximum 50 requirement lines.');
      lines.insertAdjacentHTML('beforeend',bulkLine());
      lines.lastElementChild.querySelector('input').focus();
    }else if(name==='remove-line'){
      const line=button.closest('.bulk-line');
      if(line.parentElement.children.length===1)return M.toast('Keep at least one requirement line.');
      line.remove();
    }else if(name==='bulk-cart'&&match){
      M.addBulkCart(match.result.lines.flatMap(line=>line.matched));
    }else if(name==='bulk-quote'&&match){
      quoteDraft=match.items.map(item=>[item.qty+' ×',item.brand,item.model,item.grade].filter(Boolean).join(' ')).join('\n').slice(0,2000);
      M.go('b2b-rfq');
    }
  }
  function clear(){match=null;quoteDraft='';}
  window.DbuggBusiness={render,submit,action,clear};
})();
