/* Account and profile routes for the DBUGG mobile shell.
 * The core renderer owns navigation, API policy, storage scoping and toasts.
 */
(function () {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const icon = (M, name) => M.icon(name) || '';
  const action = (name, label, id) => `<button type="button" data-action="${esc(name)}"${id ? ` data-id="${esc(id)}"` : ''}>${label}</button>`;
  const nav = (name, label, cls = '') => `<a href="#${esc(name)}" data-nav="${esc(name)}" class="${cls}">${label}</a>`;
  const title = () => '';
  const authGate = (M, text = 'Sign in to continue') => `<div class="empty"><p>${esc(text)}</p>${action('login', 'Sign in')}</div>`;
  const row = (M, ico, label, route, detail = '') => `<button type="button" class="group-row" data-nav="${esc(route)}"><span class="row-icon">${icon(M, ico)}</span><span>${esc(label)}${detail ? `<small>${esc(detail)}</small>` : ''}</span><span class="row-arrow">${icon(M, 'chevron')}</span></button>`;

  function profile(M) {
    const user = M.user();
    const name = user?.name || 'Guest';
    const role = user?.role || 'Customer';
    const initial = esc(name.slice(0, 1).toUpperCase());
    const edit = user ? action('account-edit', `${icon(M, 'edit')} Edit profile`) : action('login', 'Sign in');
    const kyc = user?.kycStatus && user.kycStatus !== 'pending' ? user.kycStatus : 'Not submitted';
    return `${M.layout('', `<div class="account-heading"><h1>My account</h1><a href="#settings" aria-label="Settings">${icon(M,'settings')}</a></div>
      <div class="profile-card"><div class="avatar">${initial}</div><div><h2>${esc(name)}</h2><span class="tag">${esc(role)}</span></div><div class="profile-edit">${edit}</div></div>
      <div class="shortcut"><button type="button" data-nav="orders">${icon(M, 'orders')}<strong>Orders</strong></button><button type="button" data-nav="rentals">${icon(M, 'rent')}<strong>Rentals</strong></button><button type="button" data-nav="wishlist">${icon(M, 'heart')}<strong>Wishlist</strong></button></div>
      <section class="panel"><h2>Account details</h2><div class="group-list">${row(M, 'map', 'Saved addresses', 'addresses', 'Saved on this device')}<button type="button" class="group-row" data-nav="kyc"><span class="row-icon">${icon(M, 'id')}</span><span>KYC verification<small class="chip">${esc(kyc)}</small></span><span class="row-arrow">${icon(M, 'chevron')}</span></button>${row(M, 'card', 'Payment preferences', 'payments')}</div></section>
      <section class="panel"><h2>Help & preferences</h2><div class="group-list">${row(M, 'help', 'Help & support', 'support')}${row(M, 'bell', 'Notifications', 'notifications')}${row(M, 'settings', 'Privacy & terms', 'privacy')}</div></section>
      <button type="button" class="switch-card" data-nav="dealer">${icon(M, 'store')}<span><b>Switch to Dealer</b><small>Open your dealer workspace</small></span>${icon(M, 'arrow')}</button>
      ${user ? `<button type="button" class="logout-link" data-action="logout">${icon(M, 'logout')} Log out</button>` : ''}`, { tab: 'profile' })}`;
  }

  function editProfile(M) {
    const u = M.user();
    if (!u) return M.layout('Edit profile', `${title(M, 'Edit profile')} ${authGate(M)}`, { tab: 'profile' });
    return M.layout('Edit profile', `${title(M, 'Edit profile')}<form class="panel form" data-form="profile"><div class="avatar form-avatar">${esc((u.name || 'A').slice(0, 1).toUpperCase())}</div>${M.field('Name', 'name', u.name || '', 'text', true)}${M.field('Email', 'email', u.email || '', 'email')}${M.field('Mobile number', 'phone', u.phone || '', 'tel')}<button class="orange" type="submit">Save changes</button></form>`, { tab: 'profile' });
  }

  function wishlist(M) {
    const ids = new Set(M.wishlist());
    const products = M.products().filter(p => ids.has(String(p.id)));
    const cards = products.map(p => `<article class="panel"><button class="wish-remove" type="button" data-action="wishlist-toggle" data-id="${esc(p.id)}" aria-label="Remove from wishlist">${icon(M, 'heart')}</button><a href="#product/${esc(p.id)}"><div class="laptop"><img src="./assets/promo-laptop.png" alt="Illustrative laptop"></div><span class="tag">Grade ${esc(p.grade || 'Not listed')}</span><h3>${esc(`${p.brand || ''} ${p.model || ''}`.trim())}</h3></a><div class="price">${esc(M.money(p.sellingPrice))}</div><span class="image-note">Illustrative image</span><button class="orange full section-button" data-action="add-cart" data-id="${esc(p.id)}">Add to bag</button></article>`).join('');
    return M.layout('Wishlist', `${title(M, 'Wishlist')} ${cards || '<div class="empty">No saved laptops yet. Tap the heart on a product to save it.</div>'}`, { tab: 'profile' });
  }

  function addresses(M) {
    const saved = M.store('addresses') || [];
    const cards = saved.map((a, i) => `<article class="panel address-card"><div class="row"><b>${esc(a.label || 'Address')}</b>${a.default ? '<span class="tag">Default</span>' : ''}</div><p>${esc(a.name || '')}<br>${esc(a.line || '')}</p><div class="row">${action('address-edit', `${icon(M, 'edit')} Edit`, String(i))}${action('address-delete', `${icon(M, 'trash')} Delete`, String(i))}</div></article>`).join('');
    return M.layout('Saved addresses', `${title(M, 'Saved addresses')}<p class="muted small">Saved on this device for this account.</p>${cards || '<div class="empty">No saved addresses.</div>'}<button class="orange" type="button" data-nav="address-new">${icon(M, 'plus')} Add new address</button>`, { tab: 'profile' });
  }

  function addressNew(M) {
    if (!M.user()) return M.layout('Add address', `${title(M, 'Add address')} ${authGate(M)}`, { tab: 'profile' });
    const edit=M.store('addressEdit');const a=edit===null?{}:(M.store('addresses')||[])[edit]||{};
    return M.layout(edit===null?'Add address':'Edit address', `<form class="panel form" data-form="address">${M.field('Label', 'label', a.label||'Home', 'text', true)}${M.field('Name', 'name', a.name||M.user().name||'', 'text', true)}${M.field('Address', 'line', a.line||'', 'text', true)}${M.field('City', 'city', a.city||'', 'text', true)}${M.field('Postal code', 'postalCode', a.postalCode||'', 'text', true)}<label class="choice"><input type="checkbox" name="default" ${a.default?'checked':''}> Make default</label><button class="orange" type="submit">Save address</button><p class="form-status" role="status"></p></form>`, { tab: 'profile' });
  }

  async function kyc(M) {
    if (!M.user()) return M.layout('KYC verification', `${title(M, 'KYC verification')} ${authGate(M)}`, { tab: 'profile' });
    let status = M.user().kycStatus || 'pending';
    try { const result = await M.api('/rental/kyc/status'); status = result?.kycStatus || status; } catch (_) { /* status card remains honest */ }
    return M.layout('KYC verification', `<div class="panel"><h1>Complete your verification</h1><p class="muted small">Required for rental applications.</p><div class="notice">Status: ${esc(status)}</div><div class="steps"><span class="active">1 Details</span><span>2 Documents</span><span>3 Review</span></div><h3>Documents</h3><div class="notice">Document submission is not available in this build. Please complete verification through your account once secure uploads are available.</div><button class="outline" type="button" disabled>Upload document</button><button class="outline" type="button" disabled>Upload selfie</button></div>`, { tab: 'profile' });
  }

  function payments(M) {
    if (!M.user()) return M.layout('Payment preferences', `${title(M, 'Payment preferences')} ${authGate(M)}`, { tab: 'profile' });
    const pref = M.store('paymentPreference') || 'upi';
    return M.layout('Payment preferences', `${title(M, 'Payment preferences')}<form class="panel form" data-form="payment"><p>Choose how you prefer to pay.</p><label class="choice"><input type="radio" name="method" value="upi" ${pref === 'upi' ? 'checked' : ''}> UPI</label><label class="choice"><input type="radio" name="method" value="card" ${pref === 'card' ? 'checked' : ''}> Debit / Credit Card</label><div class="notice">Payment details are entered during checkout. No card number is stored here.</div><button class="orange" type="submit">Save preference</button></form>`, { tab: 'profile' });
  }

  function support(M) {
    return M.layout('Help & support', `${title(M, 'Help & support')}<h1>How can we help?</h1><div class="search">${icon(M, 'search')}<input placeholder="Search FAQs" aria-label="Search FAQs"></div><div class="faq"><details><summary>${icon(M, 'orders')} Where is my order?</summary><p>Open Orders to view the latest status returned by the server.</p></details><details><summary>${icon(M, 'rent')} How do rentals work?</summary><p>Open Rent to review the application and KYC requirements.</p></details><details><summary>${icon(M, 'help')} When will I get a refund?</summary><p>Refund status is shown on the associated order when available.</p></details></div><div class="notice">Support tickets are not connected in the current app build.</div><button type="button" class="outline" disabled>Create support ticket unavailable</button>`, { tab: 'profile' });
  }

  function notifications(M) {
    const prefs = M.store('notificationPreferences') || { orders: true, rentals: true };
    return M.layout('Notifications', `${title(M, 'Notifications')}<div class="panel"><h3>Preferences</h3><form data-form="notifications"><label class="choice"><input type="checkbox" name="orders" ${prefs.orders ? 'checked' : ''}> Order updates</label><label class="choice"><input type="checkbox" name="rentals" ${prefs.rentals ? 'checked' : ''}> Rental reminders</label><button class="orange" type="submit">Save preferences</button></form></div><div class="notice">Live notifications will appear when the server integration is available. Order status is always checked from Orders.</div>`, { tab: 'profile' });
  }

  function legal(M, kind) {
    const privacy = kind === 'privacy';
    return M.layout(privacy ? 'Privacy policy' : 'Terms of use', `${title(M, privacy ? 'Privacy policy' : 'Terms of use')}<article class="panel legal"><h1>${privacy ? 'Your choices. Clearly explained.' : 'Use dbuggs clearly and responsibly.'}</h1>${privacy ? '<h3>Information you provide</h3><p>Information submitted for accounts, orders, rentals, KYC or dealer flows is used to provide that requested service.</p><h3>Browser and app storage</h3><p>Authentication and cart data may be stored locally on this device. Clear it through device settings or log out.</p><h3>External services</h3><p>Payment, shipping and identity services may have their own terms and privacy practices.</p>' : '<h3>Using dbuggs</h3><p>Use the app lawfully, keep account details private and provide accurate information.</p><h3>Catalog and orders</h3><p>Availability, prices, specifications and delivery information can change. Orders follow the applicable checkout and fulfilment confirmation.</p><h3>Updates</h3><p>The current version of this page applies when published.</p>'}<button class="outline" type="button" data-nav="${privacy ? 'terms' : 'privacy'}">Read ${privacy ? 'terms of use' : 'privacy policy'}</button></article>`, { tab: 'profile' });
  }

  function settings(M) { return M.layout('Settings', `${title(M, 'Settings')}<div class="panel group-list">${row(M, 'bell', 'Notifications', 'notifications')}${row(M, 'settings', 'Privacy policy', 'privacy')}${row(M, 'settings', 'Terms of use', 'terms')}</div>`, { tab: 'profile' }); }
  function dealerProfile(M) { return M.layout('Dealer profile', `${title(M, 'Dealer profile')}<div class="panel"><h1>${esc(M.user()?.name || 'Dealer')}</h1><span class="tag">Dealer access requires approval</span><p class="muted">Your dealer workspace and data are controlled by the server role.</p><button class="outline" type="button" data-nav="dealer">Open dealer workspace</button></div><button class="switch-card" type="button" data-nav="profile">${icon(M, 'arrow')} Switch to Customer</button>`, { tab: 'dealer', dealer: true }); }

  const renders = { profile, 'edit-profile': editProfile, wishlist, addresses, 'address-new': addressNew, kyc, payments, support, notifications, privacy: M => legal(M, 'privacy'), terms: M => legal(M, 'terms'), settings, 'dealer-profile': dealerProfile };

  async function render(route, M) { const fn = renders[route]; return fn ? await fn(M) : null; }

  async function actionHandler(name, element, M) {
    if (name === 'account-edit') { M.go('#edit-profile'); return true; }
    if (name === 'wishlist-toggle') { M.toggleWish(element?.dataset.id); M.go('#wishlist'); return true; }
    if (name === 'cart-add') { M.go('#cart'); return true; }
    if (name === 'address-delete') { const items = M.store('addresses') || []; items.splice(Number(element?.dataset.id), 1); M.store('addresses', items); M.go('#addresses'); return true; }
    if (name === 'address-edit') { M.store('addressEdit',Number(element.dataset.id));M.go('#address-new'); return true; }
    if (name === 'login') { M.go('#login'); return true; }
    return false;
  }

  async function submit(name, form, M) {
    const data = Object.fromEntries(new FormData(form));
    if (name === 'profile') { const updated = await M.api('/users/me', { method: 'PATCH', body: JSON.stringify({ name: data.name, email: data.email, phone: data.phone }) }); M.persistUser(updated); M.toast('Profile saved'); M.go('#profile'); return true; }
    if (name === 'address') { const items = M.store('addresses') || []; if (data.default) items.forEach(a => { a.default = false; });const value={...data,default:!!data.default,address:[data.name,data.line,data.city,data.postalCode].filter(Boolean).join(', ')};const edit=M.store('addressEdit');if(edit!==null&&items[edit])items[edit]=value;else items.push(value);M.store('addressEdit',null);M.store('addresses', items); M.toast('Address saved on this device'); M.go('#addresses'); return true; }
    if (name === 'payment') { M.store('paymentPreference', data.method || 'upi'); M.toast('Payment preference saved on this device'); M.go('#payments'); return true; }
    if (name === 'notifications') { M.store('notificationPreferences', { orders: !!data.orders, rentals: !!data.rentals }); M.toast('Notification preferences saved on this device'); return true; }
    return false;
  }

  window.DbuggAccount = { render, action: actionHandler, submit };
}());
