/* Trendyhub — catalog loader
   Loads content/products.json, renders piece cards, wires up WhatsApp ordering
   and a full-size photo lightbox. */

loadCatalog();

async function loadCatalog() {
  const grid = document.getElementById('grid');
  const countEl = document.getElementById('catalog-count');

  let data;
  try {
    const res = await fetch('content/products.json?t=' + Date.now());
    if (!res.ok) throw new Error('fetch failed');
    data = await res.json();
  } catch (err) {
    if (grid) grid.innerHTML = '<div class="state-msg">Couldn\'t load the catalog right now. Please refresh.</div>';
    return;
  }

  const waNumber = String(data.whatsapp_number || '').replace(/[^0-9]/g, '');
  const orderEnabled = waNumber.length >= 4;

  // CTA links — hide gracefully if no number is configured.
  var ctaIds = ['header-whatsapp', 'hero-whatsapp', 'footer-cta'];
  ctaIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (orderEnabled) el.href = 'https://wa.me/' + waNumber;
    else el.style.display = 'none';
  });

  const footerContact = document.getElementById('footer-contact');
  if (footerContact) footerContact.textContent = data.whatsapp_number ? 'WhatsApp: +' + waNumber : '';

  const yearEl = document.getElementById('foot-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const taglineEl = document.getElementById('tagline');
  if (taglineEl && data.tagline) taglineEl.textContent = data.tagline;

  document.title = (data.shop_name || 'Trendyhub') + ' — Stitched Collection';

  const products = (data.products || []).filter(p => p && p.name);

  if (products.length === 0) {
    if (grid) grid.innerHTML = '<div class="state-msg">No pieces posted yet — check back soon.</div>';
    if (countEl) countEl.textContent = '';
    return;
  }

  // Newest first if a date is present.
  products.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (countEl) countEl.textContent = products.length + ' piece' + (products.length === 1 ? '' : 's');

  if (grid) {
    grid.innerHTML = products.map(p => renderPiece(p, orderEnabled ? waNumber : null)).join('');
    wireLightbox(grid);
    initGalleries(grid);
  }
  populateHero(products);
}

function renderPiece(p, waNumber) {
  const images = (p.images || []).filter(Boolean);
  const sold = !!p.sold_out;

  // Native lazy loading, async decode, a soft fade-in once loaded, and a
  // graceful fallback if a photo fails to load.
  const imgAttrs = 'loading="lazy" decoding="async" onload="this.classList.add(\'loaded\')" onerror="handleImgError(this)"';

  let photoMarkup;
  if (images.length > 1) {
    const slides = images.map((src, i) =>
      '<img src="' + escapeAttr(src) + '" alt="' + escapeAttr(p.name) + ' — photo ' + (i + 1) + '" ' + imgAttrs + (i === 0 ? ' fetchpriority="high"' : '') + '>'
    ).join('');
    const dots = images.map((_, i) => '<span class="' + (i === 0 ? 'on' : '') + '"></span>').join('');
    photoMarkup = '<div class="photo-scroll">' + slides + '</div>' + '<div class="gallery-dots">' + dots + '</div>';
  } else if (images.length === 1) {
    photoMarkup = '<img src="' + escapeAttr(images[0]) + '" alt="' + escapeAttr(p.name) + '" ' + imgAttrs + ' fetchpriority="high">';
  } else {
    photoMarkup = '<div class="state-msg" style="padding:0;height:100%;display:flex;align-items:center;justify-content:center;">photo coming soon</div>';
  }

  const sizes = Array.isArray(p.sizes) ? p.sizes : [];
  const chest = p.chest || {};
  const metaBits = [];
  sizes.forEach(s => { if (chest[s]) metaBits.push('<span>' + escapeHtml(s) + ' chest ' + escapeHtml(chest[s]) + '"</span>'); });
  if (p.shirt_length) metaBits.push('<span>Shirt ' + escapeHtml(p.shirt_length) + '"</span>');
  if (p.plazo_length) metaBits.push('<span>Bottom ' + escapeHtml(p.plazo_length) + '"</span>');

  const tag = sold
    ? '<span class="tab sold">Sold out</span>'
    : (typeof p.stock_left === 'number' ? '<span class="tab">' + escapeHtml(p.stock_left) + ' left</span>' : '');

  const priceText = typeof p.price === 'number' ? 'Rs ' + p.price.toLocaleString() : (p.price || '');
  const priceSafe = escapeHtml(priceText);

  let orderButton;
  if (sold) {
    orderButton = '<span class="order-btn disabled">Sold out</span>';
  } else if (waNumber) {
    const orderMsg = encodeURIComponent('Hi! I\'d like to order: ' + p.name + ' (' + priceText + ').');
    orderButton = '<a class="order-btn" href="https://wa.me/' + waNumber + '?text=' + orderMsg + '" target="_blank" rel="noopener">Order on WhatsApp</a>';
  } else {
    orderButton = '<span class="order-btn disabled">Contact us</span>';
  }

  return '\n    <article class="piece">\n      ' + tag +
    '\n      <div class="photo">' + photoMarkup + '</div>' +
    '\n      <div class="body">' +
    '\n        <h4>' + escapeHtml(p.name) + '</h4>' +
    (p.fabric ? '\n        <div class="fabric">' + escapeHtml(p.fabric) + '</div>' : '') +
    (p.description ? '\n        <div class="desc">' + escapeHtml(p.description) + '</div>' : '') +
    (sizes.length ? '\n        <div class="desc" style="opacity:.6;font-size:12.5px;margin-bottom:10px;">Sizes: ' + escapeHtml(sizes.join(', ')) + '</div>' : '') +
    (metaBits.length ? '\n        <div class="meta">' + metaBits.join('') + '</div>' : '') +
    '\n        <div class="foot">' +
    '\n          <span class="price">' + priceSafe + '</span>' +
    orderButton +
    '\n        </div>' +
    '\n      </div>' +
    '\n    </article>';
}

/* ---- Photo fallback: replace a broken image with a friendly note ---- */
function handleImgError(img) {
  if (!img || !img.closest) return;
  const photo = img.closest('.photo');
  if (!photo) return;
  const note = document.createElement('div');
  note.className = 'state-msg';
  note.style.cssText = 'padding:0;height:100%;display:flex;align-items:center;justify-content:center;';
  note.textContent = 'Photo temporarily unavailable';
  photo.innerHTML = '';
  photo.appendChild(note);
}

/* ---- Gallery dots + swipe indicators ---- */
function initGalleries(grid) {
  const scrolls = Array.prototype.filter.call(grid.querySelectorAll('.photo-scroll'), sc => sc.nextElementSibling && sc.nextElementSibling.classList.contains('gallery-dots'));
  scrolls.forEach(sc => {
    const dots = sc.nextElementSibling;
    const update = () => {
      const imgs = Array.prototype.filter.call(sc.children, c => c.tagName === 'IMG');
      if (imgs.length === 0) return;
      const idx = Math.min(imgs.length - 1, Math.max(0, Math.round(sc.scrollLeft / sc.clientWidth)));
      Array.prototype.forEach.call(dots.children, (s, i) => s.classList.toggle('on', i === idx));
    };
    sc.addEventListener('scroll', update, { passive: true });
    dots.addEventListener('click', e => {
      const i = Array.prototype.indexOf.call(dots.children, e.target);
      if (i >= 0) sc.scrollTo({ left: i * sc.clientWidth, behavior: 'smooth' });
    });
  });
}

/* ---- Hero photo collage (populated from the newest pieces) ---- */
function populateHero(products) {
  const el = document.getElementById('hero-photos');
  if (!el) return;
  const shots = [];
  products.slice(0, 4).forEach(p => (p.images || []).forEach(s => shots.push(s)));
  if (shots.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = shots.slice(0, 3).map(s =>
    '<figure class="hero-shot"><img src="' + escapeAttr(s) + '" alt="Trendyhub stitched suit" loading="lazy" decoding="async" onerror="this.style.display=\'none\'"></figure>'
  ).join('');
}

/* ---- Lightbox: view any photo full size ---- */
let lightbox = null;
let lightboxIndex = 0;

function wireLightbox(grid) {
  const photos = Array.prototype.filter.call(grid.querySelectorAll('.photo'), el => el.querySelector('img'));
  photos.forEach(photo => photo.addEventListener('click', () => openLightbox(photo)));
}

function buildLightbox() {
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Photo viewer');
  box.innerHTML =
    '<button class="lightbox-close" aria-label="Close photo">&times;</button>' +
    '<div class="lightbox-stage"><img src="" alt=""></div>' +
    '<button class="lightbox-prev" aria-label="Previous photo">&#8249;</button>' +
    '<button class="lightbox-next" aria-label="Next photo">&#8250;</button>';
  return box;
}

function openLightbox(photoEl) {
  const imgs = Array.prototype.filter.call(photoEl.querySelectorAll('img'), i => i.getAttribute('src'));
  if (imgs.length === 0) return;

  if (!lightbox) {
    lightbox = buildLightbox();
    document.body.appendChild(lightbox);
    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
    lightbox.querySelector('.lightbox-prev').addEventListener('click', () => stepLightbox(-1));
    lightbox.querySelector('.lightbox-next').addEventListener('click', () => stepLightbox(1));
  }

  lightboxIndex = 0;
  lightbox._sources = imgs.map(i => i.getAttribute('src'));
  const multi = lightbox._sources.length > 1;
  lightbox.querySelector('.lightbox-prev').style.display = multi ? '' : 'none';
  lightbox.querySelector('.lightbox-next').style.display = multi ? '' : 'none';

  lightbox.classList.add('open');
  document.body.classList.add('lightbox-open');
  showLightboxImage();
}

function showLightboxImage() {
  lightbox.querySelector('.lightbox-stage img').src = lightbox._sources[lightboxIndex];
}

function stepLightbox(dir) {
  const n = lightbox._sources.length;
  lightboxIndex = (lightboxIndex + dir + n) % n;
  showLightboxImage();
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('open');
  document.body.classList.remove('lightbox-open');
  lightbox.querySelector('.lightbox-stage img').removeAttribute('src');
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

/* ---- Escaping helpers ---- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function escapeAttr(str) { return escapeHtml(str); }