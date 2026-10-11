const API_BASE = 'http://200.234.39.146:4000';

function getToken() { return localStorage.getItem('dbugg_shop_token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('dbugg_shop_user') || 'null'); } catch { return null; } }
function setAuth(token, user) {
  localStorage.setItem('dbugg_shop_token', token);
  localStorage.setItem('dbugg_shop_user', JSON.stringify(user));
}
function logout() {
  localStorage.removeItem('dbugg_shop_token');
  localStorage.removeItem('dbugg_shop_user');
  window.location.href = '/login.html';
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

// --- CART (localStorage, per-browser) ---
function getCart() { try { return JSON.parse(localStorage.getItem('dbugg_cart') || '[]'); } catch { return []; } }
function saveCart(cart) { localStorage.setItem('dbugg_cart', JSON.stringify(cart)); updateCartBadge(); }
function addToCart(laptop) {
  const cart = getCart();
  if (!cart.find(i => i.id === laptop.id)) {
    cart.push({ id: laptop.id, brand: laptop.brand, model: laptop.model, grade: laptop.grade, sellingPrice: laptop.sellingPrice, serialNo: laptop.serialNo });
    saveCart(cart);
  }
  return cart;
}
function removeFromCart(id) { saveCart(getCart().filter(i => i.id !== id)); }
function clearCart() { saveCart([]); }
function updateCartBadge() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = getCart().length;
}
document.addEventListener('DOMContentLoaded', updateCartBadge);

function money(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
