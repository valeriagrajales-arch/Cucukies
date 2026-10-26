/* Funcionalidad de Cucukies: carrito persistente, pedidos por WhatsApp y carrusel. */
(() => {
  'use strict';
  const WHATSAPP_NUMBER = '573053472245';
  const CART_KEY = 'cucukies_cart_v1';
  const money = value => '$' + Number(value).toLocaleString('es-CO');
  const parsePrice = text => Number((text || '').replace(/[^\d]/g, '')) || 0;
  const readCart = () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
  };
  let cart = readCart();
  const saveCart = () => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (_) {}
    updateCount();
  };
  const updateCount = () => {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => { el.textContent = count; });
  };
  const getProductFromButton = button => {
    const card = button.closest('.producto-card, .productos-contenedor, .producto');
    if (!card) return null;
    const name = card.querySelector('h3')?.textContent.trim() || card.querySelector('.description')?.textContent.trim() || 'Galleta Cucukies';
    const price = parsePrice(card.querySelector('.producto-precio, .precio')?.textContent);
    const image = card.querySelector('img')?.getAttribute('src') || '';
    if (!price) return null;
    return { id: name.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-'), name, price, image };
  };
  const addProduct = product => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    saveCart();
    renderCart();
    openCart();
  };
  const modal = document.createElement('div');
  modal.className = 'cucukies-cart-overlay';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `<section class="cucukies-cart" role="dialog" aria-modal="true" aria-labelledby="cucukies-cart-title">
    <div class="cucukies-cart-head"><h2 id="cucukies-cart-title">Tu carrito 🛒</h2><button type="button" class="cucukies-close" aria-label="Cerrar carrito">×</button></div>
    <div class="cucukies-cart-items"></div>
    <div class="cucukies-cart-bottom"><p class="cucukies-total">Total: $0</p><button type="button" class="cucukies-checkout">Hacer pedido por WhatsApp</button><button type="button" class="cucukies-keep-shopping">Seguir comprando</button></div>
  </section>`;
  document.body.appendChild(modal);
  const itemContainer = modal.querySelector('.cucukies-cart-items');
  const renderCart = () => {
    if (!cart.length) {
      itemContainer.innerHTML = '<p class="cucukies-empty">Tu carrito está vacío. ¡Agrega tus galletas favoritas!</p>';
    } else {
      itemContainer.innerHTML = cart.map(item => `<article class="cucukies-cart-item" data-id="${escapeHtml(item.id)}">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">` : ''}
        <div class="cucukies-item-info"><strong>${escapeHtml(item.name)}</strong><span>${money(item.price)} c/u</span><div class="cucukies-quantity"><button type="button" data-action="minus" aria-label="Quitar una unidad">−</button><span>${item.quantity}</span><button type="button" data-action="plus" aria-label="Agregar una unidad">+</button></div></div>
        <strong class="cucukies-line-total">${money(item.price * item.quantity)}</strong><button type="button" class="cucukies-remove" data-action="remove" aria-label="Eliminar producto">×</button>
      </article>`).join('');
    }
    modal.querySelector('.cucukies-total').textContent = 'Total: ' + money(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
    modal.querySelector('.cucukies-checkout').disabled = !cart.length;
  };
  const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const openCart = () => { renderCart(); modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('cart-open'); };
  const closeCart = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('cart-open'); };
  modal.querySelector('.cucukies-close').addEventListener('click', closeCart);
  modal.querySelector('.cucukies-keep-shopping').addEventListener('click', closeCart);
  modal.addEventListener('click', event => { if (event.target === modal) closeCart(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeCart(); });
  itemContainer.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const row = button.closest('[data-id]');
    const item = cart.find(product => product.id === row?.dataset.id);
    if (!item) return;
    if (button.dataset.action === 'plus') item.quantity += 1;
    if (button.dataset.action === 'minus') item.quantity -= 1;
    if (button.dataset.action === 'remove' || item.quantity <= 0) cart = cart.filter(product => product.id !== item.id);
    saveCart(); renderCart();
  });
  modal.querySelector('.cucukies-checkout').addEventListener('click', () => {
    if (!cart.length) return;
    const lines = cart.map(item => `• ${item.name} x${item.quantity} — ${money(item.price * item.quantity)}`);
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const message = `¡Hola Cucukies! Quiero hacer este pedido:\n\n${lines.join('\n')}\n\nTotal: ${money(total)}\n\n¿Me confirman disponibilidad y entrega?`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  });
  document.addEventListener('click', event => {
    const addButton = event.target.closest('.agregar-button, .btn-producto');
    if (addButton) {
      event.preventDefault();
      const product = getProductFromButton(addButton);
      if (product) addProduct(product);
      else alert('No pudimos identificar el precio de este producto.');
      return;
    }
    if (event.target.closest('.cart-button')) { event.preventDefault(); openCart(); }
  });
  // Carrusel de sabores de la página de inicio.
  const grid = document.querySelector('.sabores-grid');
  if (grid) {
    const cards = Array.from(grid.querySelectorAll('.producto-card'));
    const left = document.querySelector('.slider-button-left');
    const right = document.querySelector('.slider-button-right');
    let page = 0;
    const visibleCount = () => window.innerWidth <= 600 ? 1 : window.innerWidth <= 900 ? 2 : 4;
    const paintSlider = () => {
      const visible = visibleCount();
      const pages = Math.max(1, Math.ceil(cards.length / visible));
      page = Math.max(0, Math.min(page, pages - 1));
      cards.forEach((card, index) => {
        card.style.display = index >= page * visible && index < (page + 1) * visible ? 'flex' : 'none';
      });
      if (left) left.disabled = page === 0;
      if (right) right.disabled = page >= pages - 1;
      const dots = document.querySelector('.slider-dots');
      if (dots) dots.innerHTML = Array.from({length: pages}, (_, i) => `<button type="button" class="dot ${i === page ? 'dot-active' : ''}" aria-label="Página ${i + 1}" data-page="${i}"></button>`).join('');
    };
    left?.addEventListener('click', () => { page--; paintSlider(); });
    right?.addEventListener('click', () => { page++; paintSlider(); });
    document.querySelector('.slider-dots')?.addEventListener('click', event => { const dot = event.target.closest('[data-page]'); if (dot) { page = Number(dot.dataset.page); paintSlider(); } });
    window.addEventListener('resize', paintSlider);
    paintSlider();
  }
  const currentPage = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');
  document.querySelectorAll('.main-nav a[data-page]').forEach(link => {
    if (link.dataset.page === currentPage) link.classList.add('active');
  });
  updateCount();
  renderCart();
})();
