const csvFile = 'art.csv';

let artData = [];
let currentCategory = 'All';
const STAR_GOAL = 50;
const STAR_STORAGE_KEY = 'azzurro-viewed-artworks';

let viewedArtworks = new Set(
  JSON.parse(localStorage.getItem(STAR_STORAGE_KEY) || '[]')
);
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
  currentCategory = 'All';
  renderCategories();

  const query = e.target.value.trim().toLowerCase();
  renderGallery('All', query);
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

  const searchInput = document.getElementById('search');
  searchInput.value = '';

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
      awardStar(a.FileName);
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
  function boostColour(r, g, b) {
    const avg = (r + g + b) / 3;

    r = avg + (r - avg) * 1.8;
    g = avg + (g - avg) * 1.8;
    b = avg + (b - avg) * 1.8;

    const max = Math.max(r, g, b);

    if (max < 185) {
      const boost = 185 / Math.max(max, 1);
      r *= boost;
      g *= boost;
      b *= boost;
    }

    r = Math.min(255, Math.max(70, Math.round(r)));
    g = Math.min(255, Math.max(70, Math.round(g)));
    b = Math.min(255, Math.max(70, Math.round(b)));

    return `rgb(${r}, ${g}, ${b})`;
  }

  function sampleColours() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 50;
    canvas.height = 50;

    try {
      ctx.drawImage(img, 0, 0, 50, 50);

      const data = ctx.getImageData(0, 0, 50, 50).data;
      const colours = {};

      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max - min;
        const brightness = max;

        // no dark goblin colours
        if (brightness < 95) continue;

        // no grey sludge
        if (saturation < 45) continue;

        // no muddy brown
        if (
          r > g &&
          g > b &&
          saturation < 95 &&
          brightness < 200
        ) continue;

        const key = `${Math.round(r / 36) * 36},${Math.round(g / 36) * 36},${Math.round(b / 36) * 36}`;

        colours[key] = (colours[key] || 0) + 1 + saturation / 50 + brightness / 170;
      }

      const topColours = Object.entries(colours)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([colour]) => {
          const [r, g, b] = colour.split(',').map(Number);
          return boostColour(r, g, b);
        });

      const c1 = topColours[0] || 'rgb(255, 90, 200)';
      const c2 = topColours[1] || 'rgb(90, 220, 255)';
      const c3 = topColours[2] || 'rgb(255, 225, 80)';

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
        pixel.style.opacity = 0.2 + Math.random() * 0.5;

        bgEl.appendChild(pixel);
      }
    } catch (err) {
      bgEl.innerHTML = '';
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

// ---------------- STAR COUNTER ----------------

function updateStarCounter() {
  const counter = document.getElementById('star-counter');
  if (!counter) return;

  const count = viewedArtworks.size;
  counter.textContent = `⭐ ${count} / ${STAR_GOAL}`;

  if (count >= STAR_GOAL) {
    counter.textContent = '🎁 Prize unlocked';
    counter.classList.add('prize-ready');
  }
}

function awardStar(fileName) {
  if (!fileName || viewedArtworks.has(fileName)) return;

  viewedArtworks.add(fileName);
  localStorage.setItem(STAR_STORAGE_KEY, JSON.stringify([...viewedArtworks]));

  updateStarCounter();
  showStarFloat();

  const counter = document.getElementById('star-counter');
  if (counter) {
    counter.classList.remove('star-bump');
    void counter.offsetWidth;
    counter.classList.add('star-bump');
  }

  if (viewedArtworks.size === STAR_GOAL) {
    setTimeout(showPrizeModal, 500);
  }
}

function showStarFloat() {
  const counter = document.getElementById('star-counter');
  if (!counter) return;

  const rect = counter.getBoundingClientRect();

  const float = document.createElement('div');
  float.className = 'star-float';
  float.textContent = '+1 ⭐';
  float.style.left = rect.left + rect.width / 2 - 18 + 'px';
  float.style.top = rect.top + rect.height + 8 + 'px';

  document.body.appendChild(float);

  setTimeout(() => float.remove(), 950);
}

function showPrizeModal() {
  const prize = document.getElementById('star-prize');
  if (!prize) return;

  prize.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  updateStarCounter();

  const counter = document.getElementById('star-counter');
  const prize = document.getElementById('star-prize');

  if (counter) {
    counter.addEventListener('click', () => {
      if (viewedArtworks.size >= STAR_GOAL) {
        showPrizeModal();
      }
    });
  }

  if (prize) {
    prize.addEventListener('click', (e) => {
      if (e.target === prize) {
        prize.classList.remove('active');
      }
    });
  }
});
