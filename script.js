const csvFile = 'art.csv';

let artData = [];
let currentCategory = 'All';

// ---------------- OVERLAY ----------------
const overlay = document.createElement('div');
overlay.className = 'fullscreen-overlay';
document.body.appendChild(overlay);

overlay.addEventListener('click', () => {
  overlay.classList.remove('active');

  setTimeout(() => {
    overlay.innerHTML = '';
    overlay.style.background = '';
  }, 350);
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

  return lines.slice(1).map(line => {
    const clean = line.replace('\r', '');
    const values = clean.split(',').map(v => v.trim());

    return {
      FileName: values[0],
      Category: values[1],
      ArtworkName: values[2],
      Year: values[3],
      Title: values[4],
      LinkLabel: values[5],
      Link: values[6]
    };
  });
}

// ---------------- CATEGORIES ----------------
function renderCategories() {
  const categories = ['All', ...new Set(artData.map(a => a.Category).filter(Boolean))];

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
    .filter(a => {
      const searchable = [
        a.FileName,
        a.Category,
        a.ArtworkName,
        a.Year,
        a.Title
      ].join(' ').toLowerCase();

      return searchable.includes(searchQuery);
    });

  filtered.forEach(a => {
    const img = document.createElement('img');

    const src = `images/${a.FileName}`;

    img.dataset.src = src;
    img.dataset.full = src;
    img.alt = a.ArtworkName || a.Title || '';
    img.loading = 'lazy';

    img.classList.add('gallery-img');

    observer.observe(img);

    img.addEventListener('click', () => {
      openZoom(img, a);
    });

    gallery.appendChild(img);
  });
}

// ---------------- ZOOM MODE ----------------
function openZoom(img, a) {
  overlay.innerHTML = '';

  const zoomBg = document.createElement('div');
  zoomBg.className = 'zoom-bg';

  const zoomWrap = document.createElement('div');
  zoomWrap.className = 'zoom-wrap';

  const zoomImg = document.createElement('img');
  zoomImg.src = img.dataset.full || img.src;
  zoomImg.alt = a.ArtworkName || a.Title || '';

  zoomWrap.appendChild(zoomImg);

  const info = document.createElement('div');
  info.className = 'zoom-info';

  if (a.ArtworkName) {
    const name = document.createElement('div');
    name.className = 'zoom-title';
    name.textContent = a.ArtworkName;
    info.appendChild(name);
  }

  if (a.Year) {
    const year = document.createElement('div');
    year.className = 'zoom-year';
    year.textContent = a.Year;
    info.appendChild(year);
  }

  if (a.Link) {
    const link = document.createElement('a');
    link.href = a.Link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'overlay-link';
    link.textContent = a.LinkLabel || 'View more';

    link.addEventListener('click', e => e.stopPropagation());

    info.appendChild(link);
  }

  overlay.appendChild(zoomBg);
  overlay.appendChild(zoomWrap);
  overlay.appendChild(info);

  overlay.classList.add('active');

  setZoomColours(zoomImg, zoomBg);
}

// ---------------- COLOUR BACKGROUND ----------------
function setZoomColours(img, bgEl) {
  function sampleColours() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 40;
    canvas.height = 40;

    try {
      ctx.drawImage(img, 0, 0, 40, 40);

      const data = ctx.getImageData(0, 0, 40, 40).data;
      const colours = {};

      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r + g + b > 720 || r + g + b < 80) continue;

        const key = `${Math.round(r / 40) * 40},${Math.round(g / 40) * 40},${Math.round(b / 40) * 40}`;
        colours[key] = (colours[key] || 0) + 1;
      }

      const topColours = Object.entries(colours)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([colour]) => `rgb(${colour})`);

      const c1 = topColours[0] || '#222';
      const c2 = topColours[1] || '#555';
      const c3 = topColours[2] || '#999';

      bgEl.style.background = `
        radial-gradient(circle at 20% 30%, ${c1}, transparent 35%),
        radial-gradient(circle at 80% 40%, ${c2}, transparent 35%),
        radial-gradient(circle at 50% 80%, ${c3}, transparent 40%),
        repeating-linear-gradient(
          45deg,
          ${c1} 0px,
          ${c1} 12px,
          ${c2} 12px,
          ${c2} 24px,
          ${c3} 24px,
          ${c3} 36px
        )
      `;
    } catch (err) {
      bgEl.style.background = '#111';
    }
  }

  if (img.complete) {
    sampleColours();
  } else {
    img.onload = sampleColours;
  }
}
