(() => {
  'use strict';
  const tabs = [['b2b','Overview'],['b2b-orders','Orders'],['b2b-rfq','Quotes'],['b2b-ledger','Credit']];
  const date = value => value ? new Date(value).toLocaleDateString('en-IN') : '—';
  const wrap = (route, body, M) => M.layout('Business workspace',
    '<nav class="business-tabs" aria-label="Business navigation">'+tabs.map(([id,label])=>
      `<a href="#${id}" ${id===route?'aria-current="page"':''}>${label}</a>`).join('')+'</nav>'+body);
  const stat = (label,value,M) => `<div class="stat"><span>${label}</span><strong>${M.esc(value)}</strong></div>`;
  const post = (M,path,body) => M.api(path,{method:'POST',...(body?{body:JSON.stringify(body)}:{})});

  async function render(route,M) {
    if (!M.token()) return M.layout('Business workspace',M.empty('Sign in to continue','Use your DBUGG business account.','login','Sign in'));
    const buyer=await M.api('/b2b/my');
    if (!buyer?.id) return M.layout('Business workspace',M.empty('Buy laptops for your business','Apply for business purchasing, bulk quotes and credit terms.')+'<a class="orange button-link full" href="/b2b-register.html">Apply for a business account</a>');
    if (!buyer.isApproved) return M.layout('Business workspace',M.empty('Approval required','An approved business account is required to see wholesale tools.'));
    if (route==='b2b-ledger') {
      const {summary,entries}=await M.api('/b2b/ledger');
      return wrap(route,`<div class="wallet-card"><div>Available credit</div><strong>${M.money(summary.creditAvailable)}</strong></div><div class="stats business-stats">${stat('Credit limit',M.money(summary.creditLimit),M)}${stat('Outstanding',M.money(summary.creditUsed),M)}${stat('GST',M.money(summary.gstOnPurchases),M)}</div><h2>Ledger activity</h2>${entries.length?entries.map(e=>`<article class="panel"><div class="row"><b>${M.esc(e.reference||e.type||'Ledger entry')}</b><strong>${M.money(e.amount)}</strong></div><p class="muted small">${date(e.createdAt)} · ${M.esc(e.type||'')}</p></article>`).join(''):M.empty('No ledger entries','Credit transactions will appear here.')}`,M);
    }
    if (route==='b2b-rfq') {
      const quotes=await M.api('/b2b/rfq');
      return wrap(route,`<section class="panel"><h2>Request a quote</h2><form data-form="business-rfq" class="form"><label>Requirements<textarea name="details" minlength="10" maxlength="2000" placeholder="Models, quantity and delivery city" required></textarea></label><button class="orange full">Send request</button><p class="form-status" role="status"></p></form></section><h2>My quotes</h2>${quotes.length?quotes.map(q=>`<article class="panel"><div class="row"><b>${M.esc(q.rfqNumber)}</b><span class="tag">${M.esc(q.status)}</span></div><p class="small business-detail">${M.esc(q.details)}</p>${q.total?`<strong>${M.money(q.total)}</strong><p class="small muted">Valid until ${date(q.validUntil)}</p>`:''}${q.status==='quoted'?'<a class="outline button-link" href="/b2b-panel/rfq.html">Review quotation</a>':''}</article>`).join(''):M.empty('No quotes yet','Send your requirements to request pricing.')}`,M);
    }
    const orders=(await M.api('/orders')).filter(o=>o.type==='b2b');
    if(route==='b2b-orders')return wrap(route,`<h2>Business orders</h2>${orders.length?orders.map(o=>`<article class="panel"><div class="row"><b>${M.esc(o.orderNumber)}</b><span class="tag">${M.esc(o.status)}</span></div><p class="small muted">${date(o.createdAt)}</p><div class="summary-row"><strong>${M.money(o.amount)}</strong><a class="text-link" href="#order/${encodeURIComponent(o.id)}">Track order</a></div></article>`).join(''):M.empty('No business orders','Your bulk purchases will appear here.')}`,M);
    return wrap('b2b',`<section class="business-hero"><span class="dealer-badge">APPROVED BUSINESS</span><h1>${M.esc(buyer.companyName||'Business account')}</h1><p>Available credit</p><div class="balance">${M.money(Number(buyer.creditLimit||0)-Number(buyer.creditUsed||0))}</div></section><div class="stats business-stats">${stat('Credit limit',M.money(buyer.creditLimit),M)}${stat('Credit used',M.money(buyer.creditUsed),M)}${stat('Orders',orders.length,M)}</div><section class="panel"><h2>Buy in bulk</h2><p class="small muted business-detail">Match your laptop list to available stock and use purchase-order checkout if eligible.</p><a class="orange button-link full" href="/b2b-panel/bulk-order.html">Open bulk ordering</a></section><a class="outline button-link full" href="#b2b-rfq">Request a quote</a>`,M);
  }
  async function submit(name,form,M) {
    if(name!=='business-rfq')return false;
    const details=String(new FormData(form).get('details')||'').trim();
    if(details.length<10)throw new Error('Enter at least 10 characters.');
    const buyer=await M.api('/b2b/my');
    if(!buyer?.isApproved)throw new Error('Business approval is required.');
    await post(M,'/b2b/rfq',{details});M.toast('Quote request submitted');M.go('b2b-rfq');return true;
  }
  window.DbuggBusiness={render,submit};
})();
