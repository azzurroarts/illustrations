const csvFile = 'art.csv';

let artData = [];
let currentCategory = 'All';

// ---------------- OVERLAY ----------------
const overlay = document.createElement('div');
overlay.className = 'fullscreen-overlay';
document.body.appendChild(overlay);

const floatingCategory = document.getElementById('floating-category');

overlay.addEventListener('click', () => {
  overlay.classList.remove('active');
  floatingCategory.style.opacity = 0;

  const img = overlay.querySelector('img');
  if (!img) return;

  const rect = img.dataset.originalRect && JSON.parse(img.dataset.originalRect);

  if (rect) {
    img.style.transform =
      `translate(${rect.left}px, ${rect.top}px)
       scale(${rect.width / img.naturalWidth}, ${rect.height / img.naturalHeight})`;
  }

  setTimeout(() => overlay.innerHTML = '', 350);
});

// ---------------- OBSERVER (LAZY LOAD) ----------------
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    const img = entry.target;

    if (img.dataset.src) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    }

    observer.unobserve(img);
  });
}, {
  rootMargin: '150px'
});

// ---------------- INIT ----------------
window.addEventListener('DOMContentLoaded', init);

function init() {
  fetch(csvFile)
    .then(r => r.text())
    .then(text => {
      artData = csvToArray(text);

      renderCategories();
      renderGallery('All');
    })
    .catch(err => console.error('CSV load error:', err));

  const searchInput = document.getElementById('search');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    renderGallery(currentCategory, query);
  });
}

// ---------------- CSV ----------------
function csvToArray(str) {
  const lines = str.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const clean = line.replace('\r', '');
    const values = clean.split(',').map(v => v.trim());

   return {
  FileName: values[0],
  Category: values[1],
  Title: values[2],
  LinkLabel: values[3],
  Link: values[4]
};
  });
}

// ---------------- CATEGORIES ----------------
function renderCategories() {
  const categories = ['All', ...new Set(artData.map(a => a.Category))];

  const container = document.getElementById('categories');
  container.innerHTML = '';

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat;

    if (cat === currentCategory) btn.classList.add('active');

    btn.addEventListener('click', () => {
      currentCategory = cat;
      renderCategories();
      renderGallery(cat);
    });

    container.appendChild(btn);
  });
}

// ---------------- GALLERY ----------------
function renderGallery(filter, searchQuery = '') {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';

  const filtered = artData
    .filter(a => filter === 'All' || a.Category === filter)
    .filter(a => (a.Title || '').toLowerCase().includes(searchQuery));

  filtered.forEach(a => {
    const img = document.createElement('img');

    const src = `images/${a.FileName}`;

    img.dataset.src = src;
    img.dataset.full = src;
    img.alt = a.Title;
    img.loading = 'lazy';

    img.classList.add('gallery-img');

    observer.observe(img);

    img.addEventListener('click', () => {
    floatingCategory.innerHTML = `
  <span style="font-weight:700">${a.Category}</span>
  <span style="opacity:0.7; margin-left:8px;">${a.Year || ''}</span>
`;

      floatingCategory.textContent = a.Category;
      floatingCategory.style.opacity = 1;

      const zoomImg = document.createElement('img');
      zoomImg.src = img.dataset.full;

      const rect = img.getBoundingClientRect();
      zoomImg.dataset.originalRect = JSON.stringify(rect);

      zoomImg.style.position = 'fixed';
      zoomImg.style.left = rect.left + 'px';
      zoomImg.style.top = rect.top + 'px';
      zoomImg.style.width = rect.width + 'px';
      zoomImg.style.height = rect.height + 'px';
      zoomImg.style.transition = 'all 0.35s ease';

      overlay.innerHTML = '';
      overlay.appendChild(zoomImg);
      overlay.classList.add('active');

      requestAnimationFrame(() => {
        zoomImg.style.left = '50%';
        zoomImg.style.top = '50%';
        zoomImg.style.transform = 'translate(-50%, -50%) scale(1)';
        zoomImg.style.width = '';
        zoomImg.style.height = '';
      });
    });

    gallery.appendChild(img);
  });
}
