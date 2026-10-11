const API_BASE = 'http://200.234.39.146:4000';

function getToken() {
  return localStorage.getItem('dbugg_admin_token');
}

function setToken(token) {
  localStorage.setItem('dbugg_admin_token', token);
}

function logout() {
  localStorage.removeItem('dbugg_admin_token');
  window.location.href = '/login.html';
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  if (!token && !path.startsWith('/auth')) {
    window.location.href = '/login.html';
    return;
  }
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401) {
    logout();
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

// Guard: redirect to login if not authenticated (skip on login.html itself)
if (!window.location.pathname.endsWith('login.html') && !getToken()) {
  window.location.href = '/login.html';
}

// Permission-aware sidebar: hide nav items the logged-in "admin" role can't view,
// and block the current page with a message if they landed on it directly.
// Super Admin always sees everything — this only restricts the "admin" role.
async function applyPagePermissions() {
  const role = localStorage.getItem('dbugg_user_role');
  if (role !== 'admin') return; // super_admin or unknown: no restriction

  try {
    const perms = await apiFetch('/admin/permissions/admin');
    const viewable = new Set(perms.filter(p => p.canView).map(p => p.page));

    document.querySelectorAll('.sidebar .nav-item, .sidebar-nav .nav-item').forEach(link => {
      const href = link.getAttribute('href') || '';
      const page = href.replace('.html', '').replace('./', '');
      if (!page || page === 'dashboard') return; // dashboard always visible
      if (!viewable.has(page)) link.style.display = 'none';
    });

    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    if (currentPage && currentPage !== 'dashboard' && !viewable.has(currentPage)) {
      document.body.innerHTML = '<div style="padding:60px;text-align:center;font-family:sans-serif;color:#991B1B;">You do not have permission to view this page. Contact your Super Admin.</div>';
    }
  } catch (e) {
    console.warn('Could not load permissions:', e);
  }
}
if (!window.location.pathname.endsWith('login.html')) {
  document.addEventListener('DOMContentLoaded', applyPagePermissions);
}

// Profile dropdown: clicking the avatar/badge in the topbar (any page, any markup variant)
// shows name/role/email + a working Logout button.
function initProfileDropdown() {
  const name = localStorage.getItem('dbugg_user_name') || 'Admin';
  const role = localStorage.getItem('dbugg_user_role') || '';

  const menu = document.createElement('div');
  menu.id = 'profile-dropdown-menu';
  menu.style.cssText = 'display:none;position:fixed;background:#fff;border:1px solid #E5E7EB;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:200px;z-index:1000;font-family:"DM Sans",sans-serif;overflow:hidden;';
  menu.innerHTML = `
    <div style="padding:14px 16px;border-bottom:1px solid #E5E7EB;">
      <div style="font-weight:700;font-size:13.5px;color:#111827;">${name}</div>
      <div style="font-size:11.5px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.04em;margin-top:2px;">${role}</div>
    </div>
    <div style="padding:8px;">
      <button id="profile-dropdown-logout" style="width:100%;text-align:left;padding:9px 10px;border:none;background:none;color:#991B1B;font-size:13px;font-weight:600;cursor:pointer;border-radius:6px;">Logout</button>
    </div>
  `;
  document.body.appendChild(menu);
  menu.querySelector('#profile-dropdown-logout').addEventListener('click', logout);
  menu.querySelector('#profile-dropdown-logout').addEventListener('mouseenter', e => e.target.style.background = '#FEF2F2');
  menu.querySelector('#profile-dropdown-logout').addEventListener('mouseleave', e => e.target.style.background = 'none');

  const triggers = document.querySelectorAll('.topbar-avatar, .topbar-right .avatar, .super-badge, .sidebar-user .avatar, .sidebar-footer .avatar');
  triggers.forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.style.display === 'block';
      if (isOpen) { menu.style.display = 'none'; return; }
      const rect = el.getBoundingClientRect();
      menu.style.top = (rect.bottom + 6) + 'px';
      menu.style.left = Math.max(10, rect.right - 200) + 'px';
      menu.style.display = 'block';
    });
  });
  document.addEventListener('click', () => { menu.style.display = 'none'; });
}
if (!window.location.pathname.endsWith('login.html')) {
  document.addEventListener('DOMContentLoaded', initProfileDropdown);
}
