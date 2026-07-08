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

      bgEl.innerHTML = '';

for (let i = 0; i < 90; i++) {
  const pixel = document.createElement('span');
  pixel.className = 'zoom-pixel';

  const colour = [c1, c2, c3][i % 3];

  pixel.style.background = colour;
  pixel.style.left = Math.random() * 100 + '%';
  pixel.style.top = Math.random() * 100 + '%';
  pixel.style.width = 30 + Math.random() * 120 + 'px';
  pixel.style.height = pixel.style.width;
  pixel.style.animationDelay = Math.random() * -12 + 's';
  pixel.style.animationDuration = 8 + Math.random() * 14 + 's';
  pixel.style.opacity = 0.18 + Math.random() * 0.45;

  bgEl.appendChild(pixel);
}
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
// ---------------- RAINBOW PIXEL FAIRY DUST ----------------
const fairyColours = [
  '#ff9ad5',
  '#ffb86b',
  '#fff176',
  '#9cffb1',
  '#8be9fd',
  '#b39ddb',
  '#ff80ab'
];

let fairyDustTick = 0;

document.addEventListener('mousemove', (e) => {
  // not on touch devices, because phones deserve mercy
  if (window.matchMedia('(pointer: coarse)').matches) return;

  fairyDustTick++;

  // lower number = more chaos. 2 is cute. 1 is full glitter goblin.
  if (fairyDustTick % 2 !== 0) return;

  createFairyPixel(e.clientX, e.clientY);
});

function createFairyPixel(x, y) {
  const pixel = document.createElement('span');
  pixel.className = 'fairy-pixel';

  const colour = fairyColours[Math.floor(Math.random() * fairyColours.length)];
  const size = 5 + Math.random() * 9;
  const driftX = (Math.random() - 0.5) * 80;
  const driftY = (Math.random() - 0.5) * 80;

  pixel.style.left = x + (Math.random() - 0.5) * 18 + 'px';
  pixel.style.top = y + (Math.random() - 0.5) * 18 + 'px';
  pixel.style.width = size + 'px';
  pixel.style.height = size + 'px';
  pixel.style.background = colour;
  pixel.style.color = colour;
  pixel.style.setProperty('--drift-x', driftX + 'px');
  pixel.style.setProperty('--drift-y', driftY + 'px');

  document.body.appendChild(pixel);

  setTimeout(() => {
    pixel.remove();
  }, 950);
}
