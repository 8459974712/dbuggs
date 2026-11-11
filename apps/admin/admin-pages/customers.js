(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const tabs = [...document.querySelectorAll('[data-type]')];
  const PAGE_SIZE = 25;
  let directory, type = 'b2c', page = 0;
  const displayDate = value => value ? new Date(value).toLocaleDateString('en-IN') : '—';
  function cell(parent, tag, value, style) {
    const el = document.createElement(tag);
    if (style) {
      const badge = document.createElement('span');
      badge.className = 'badge ' + style;
      badge.textContent = value;
      el.append(badge);
    } else el.textContent = value == null || value === '' ? '—' : String(value);
    if (tag === 'th') el.scope = 'col';
    parent.append(el);
  }
  function render() {
    if (!directory) return;
    const business = type === 'b2b';
    const query = $('customer-search').value.trim().toLowerCase();
    const records = directory[type].filter(x => [x.name,x.email,x.phone,x.companyName,x.gstin].some(v => String(v || '').toLowerCase().includes(query)));
    const pages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
    page = Math.min(page,pages - 1);
    $('head').replaceChildren();
    $('rows').replaceChildren();
    for (const label of ['Name','Email','Phone',...(business?['Company','GSTIN']:[]),'Status','Registered']) cell($('head'),'th',label);
    for (const x of records.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE)) {
      const row = document.createElement('tr');
      for (const v of [x.name,x.email,x.phone,...(business?[x.companyName,x.gstin]:[])]) cell(row,'td',v);
      const status = business ? x.isApproved ? 'Approved' : 'Not approved' : x.isActive ? 'Active' : 'Inactive';
      cell(row,'td',status,(business?x.isApproved:x.isActive)?'good':'pending');
      cell(row,'td',displayDate(x.createdAt));
      $('rows').append(row);
    }
    $('status').textContent = records.length ? `${records.length} ${type.toUpperCase()} customer${records.length===1?'':'s'}` : 'No matching customers.';
    $('table-wrap').hidden = !records.length;
    $('pagination').hidden = pages<=1;
    $('page').textContent = `Page ${page+1} of ${pages}`;
    $('prev').disabled = page===0;
    $('next').disabled = page===pages-1;
    tabs.forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.type===type)));
  }
  for(const tab of tabs) tab.addEventListener('click',()=>{type=tab.dataset.type;page=0;render();});
  $('customer-search').addEventListener('input',()=>{page=0;render();});
  $('prev').addEventListener('click',()=>{page=Math.max(0,page-1);render();});
  $('next').addEventListener('click',()=>{page++;render();});
  (async()=>{
    if(!getToken())return;
    try {directory=await apiFetch('/admin/customers');if(directory)render();}
    catch { $('status').textContent='Customer list could not be loaded. Super Admin access is required.'; }
  })();
})();
