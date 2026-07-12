/* ==========================================================================
   WMO Imam Gazzali Academy Library - Books Feed, Detail & Reader Logic
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // If we are on the homepage, load grids and statistics
  if (document.getElementById("latest-books-grid")) {
    loadHomeGrids();
  }

  // Bind close buttons for modals
  const modals = document.querySelectorAll(".modal-overlay");
  modals.forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
    const closeBtn = modal.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => closeModal(modal.id));
    }
  });
});

// Load Home Page Grids
async function loadHomeGrids() {
  const latestGrid = document.getElementById("latest-books-grid");
  const featuredGrid = document.getElementById("featured-books-grid");
  const categoriesGrid = document.getElementById("home-categories-grid");

  // Show skeletons
  showGridSkeletons(latestGrid, 4);
  showGridSkeletons(featuredGrid, 4);

  // Fetch Categories
  const categories = await window.supabaseDb.getCategories();
  if (categoriesGrid && categories.length > 0) {
    categoriesGrid.innerHTML = categories.slice(0, 6).map(cat => `
      <a href="/books.html?category=${cat.id}" class="glass-card text-center" style="display:flex;flex-direction:column;align-items:center;gap:15px;padding:30px;">
        <div class="stat-icon"><i class="fas ${cat.icon || 'fa-book'}"></i></div>
        <h4 style="font-weight:700;font-size:1.1rem;color:var(--text-primary);">${cat.category_name}</h4>
      </a>
    `).join('');
  }

  // Fetch Books
  const booksRes = await window.supabaseDb.getBooks({ limit: 100 });
  const allBooks = booksRes.books || [];

  // Update homepage statistics
  let totalViews = 0;
  let totalDownloads = 0;
  allBooks.forEach(b => {
    totalViews += (b.views || 0);
    totalDownloads += (b.downloads || 0);
  });

  const bCountEl = document.getElementById("stat-total-books");
  const cCountEl = document.getElementById("stat-total-categories");
  const vCountEl = document.getElementById("stat-total-views");
  const dCountEl = document.getElementById("stat-total-downloads");

  if (bCountEl) bCountEl.textContent = allBooks.length;
  if (cCountEl) cCountEl.textContent = categories.length;
  if (vCountEl) vCountEl.textContent = totalViews;
  if (dCountEl) dCountEl.textContent = totalDownloads;

  // Filter latest books (sorted by created_at desc)
  const latestBooks = [...allBooks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (latestGrid) {
    if (latestBooks.length > 0) {
      latestGrid.innerHTML = latestBooks.slice(0, 4).map(book => createBookCardHTML(book)).join('');
      bindBookCardEvents(latestGrid);
    } else {
      latestGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-secondary);">No books available.</p>`;
    }
  }

  // Filter featured books (where featured is true)
  const featuredBooks = allBooks.filter(b => b.featured === true);
  if (featuredGrid) {
    if (featuredBooks.length > 0) {
      featuredGrid.innerHTML = featuredBooks.slice(0, 4).map(book => createBookCardHTML(book)).join('');
      bindBookCardEvents(featuredGrid);
    } else {
      // Fallback to highest views if none explicitly featured
      const fallbackFeatured = [...allBooks].sort((a, b) => (b.views || 0) - (a.views || 0));
      if (fallbackFeatured.length > 0) {
        featuredGrid.innerHTML = fallbackFeatured.slice(0, 4).map(book => createBookCardHTML(book)).join('');
        bindBookCardEvents(featuredGrid);
      } else {
        featuredGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-secondary);">No books available.</p>`;
      }
    }
  }
}

// Render skeleton states for grids
function showGridSkeletons(grid, count) {
  if (!grid) return;
  grid.innerHTML = Array(count).fill(0).map(() => `
    <div class="glass-card skeleton-card" style="height: 380px;">
      <div style="width:100%;height:65%;background:var(--bg-tertiary);border-radius:12px;margin-bottom:15px;animation: pulse 1.5s infinite;"></div>
      <div style="width:60%;height:15px;background:var(--bg-tertiary);border-radius:4px;margin-bottom:10px;animation: pulse 1.5s infinite;"></div>
      <div style="width:90%;height:20px;background:var(--bg-tertiary);border-radius:4px;margin-bottom:10px;animation: pulse 1.5s infinite;"></div>
      <div style="width:40%;height:15px;background:var(--bg-tertiary);border-radius:4px;animation: pulse 1.5s infinite;"></div>
    </div>
  `).join('');
}

// Generate Single Card HTML
function createBookCardHTML(book) {
  return `
    <div class="glass-card book-card" data-id="${book.id}">
      <div class="book-cover-wrapper">
        <img src="${book.cover_image || '/assets/images/book-placeholder.jpg'}" alt="${book.title}" class="book-cover-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 150%22 fill=%22%23ccc%22><rect width=%22100%22 height=%22150%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2212%22>No Cover</text></svg>'">
      </div>
      <div class="book-meta">${book.categories?.category_name || 'Book'}</div>
      <a href="javascript:void(0)" class="book-title-link trigger-details">${book.title}</a>
      <div class="book-author">${book.author}</div>
      <div class="book-footer">
        <span style="font-size:0.8rem;color:var(--text-muted);font-weight:600;"><i class="fas fa-eye"></i> ${book.views || 0}</span>
        <span style="font-size:0.8rem;color:var(--text-muted);font-weight:600;"><i class="fas fa-download"></i> ${book.downloads || 0}</span>
      </div>
    </div>
  `;
}

// Bind Click Events on Book Cards
function bindBookCardEvents(container) {
  const cards = container.querySelectorAll(".book-card");
  cards.forEach(card => {
    const trigger = card.querySelector(".trigger-details");
    const cover = card.querySelector(".book-cover-wrapper");
    
    const openAction = () => {
      openBookDetails(card.dataset.id);
    };

    if (trigger) trigger.addEventListener("click", openAction);
    if (cover) cover.addEventListener("click", openAction);
  });
}

// --- BOOK DETAILS MODAL ---
let currentSelectedBookId = null;

async function openBookDetails(bookId) {
  currentSelectedBookId = bookId;
  const book = await window.supabaseDb.getBookDetails(bookId);
  if (!book) return;

  // Open modal
  const modal = document.getElementById("book-details-modal");
  if (!modal) return;
  modal.classList.add("open");

  // Populate info
  document.getElementById("modal-book-title").textContent = book.title;
  document.getElementById("modal-book-subtitle").textContent = book.subtitle || '';
  document.getElementById("modal-book-author").textContent = book.author;
  document.getElementById("modal-book-desc").textContent = book.description || 'No description available.';
  document.getElementById("modal-book-publisher").textContent = book.publisher || 'Unknown';
  document.getElementById("modal-book-year").textContent = book.publication_year || 'Unknown';
  document.getElementById("modal-book-language").textContent = book.language || 'English';
  document.getElementById("modal-book-isbn").textContent = book.isbn || 'N/A';
  document.getElementById("modal-book-edition").textContent = book.edition || '1st Edition';
  document.getElementById("modal-book-pages").textContent = book.pages || 'N/A';
  document.getElementById("modal-book-size").textContent = book.file_size || 'N/A';
  document.getElementById("modal-book-views").textContent = book.views || 0;
  document.getElementById("modal-book-downloads").textContent = book.downloads || 0;
  document.getElementById("modal-book-category").textContent = book.categories?.category_name || 'General';
  document.getElementById("modal-book-cover").src = book.cover_image || '/assets/images/book-placeholder.jpg';

  // Render tags
  const tagsContainer = document.getElementById("modal-book-tags-container");
  if (tagsContainer) {
    tagsContainer.innerHTML = '';
    if (book.tags) {
      const tags = book.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      tagsContainer.innerHTML = tags.map(tag => `
        <span class="section-badge" style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color);margin:0;font-size:0.75rem;padding:4px 8px;">#${tag}</span>
      `).join('');
    }
  }

  // Setup Actions
  setupBookDetailsActions(book);

  // Load related books
  loadRelated(book.category_id, book.id);
}

function setupBookDetailsActions(book) {
  const readBtn = document.getElementById("modal-read-btn");
  const downloadBtn = document.getElementById("modal-download-btn");

  // PDF Preview button setup
  if (readBtn) {
    if (book.pdf_url) {
      readBtn.style.display = "inline-flex";
      readBtn.onclick = () => openPDFReader(book.title, book.pdf_url, book.id);
    } else {
      readBtn.style.display = "none";
    }
  }

  // PDF Download button setup
  if (downloadBtn) {
    if (book.pdf_url) {
      downloadBtn.style.display = "inline-flex";
      downloadBtn.onclick = () => triggerPDFDownload(book);
    } else {
      downloadBtn.style.display = "none";
    }
  }
}

// PDF Reader Inside Modal
async function openPDFReader(title, pdfUrl, bookId) {
  closeModal("book-details-modal");
  const modal = document.getElementById("pdf-reader-modal");
  if (!modal) return;
  modal.classList.add("open");

  document.getElementById("reader-title").textContent = title;
  
  // Setup iframe/embed
  const iframeContainer = document.getElementById("pdf-frame-container");
  iframeContainer.innerHTML = `
    <embed src="${pdfUrl}#toolbar=0" type="application/pdf" width="100%" height="600px" />
  `;

  // Reading progress tracker (simulate progress on scroll)
  const readerProgress = document.getElementById("reader-progress-bar");
  if (readerProgress) readerProgress.style.width = "100%";

  // Track view metrics
  await window.supabaseDb.incrementBookViews(bookId);
}

// Download PDF
async function triggerPDFDownload(book) {
  await window.supabaseDb.incrementBookDownloads(book.id);
  
  // Direct trigger download link
  const link = document.createElement("a");
  link.href = book.pdf_url;
  link.target = "_blank";
  link.download = `${book.title}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Download started!", "success");
  
  // Update UI counter in background
  const viewsEl = document.getElementById("modal-book-downloads");
  if (viewsEl) {
    viewsEl.textContent = (book.downloads || 0) + 1;
  }
}

// Related Books Loading
async function loadRelated(categoryId, currentBookId) {
  const container = document.getElementById("modal-related-books");
  if (!container) return;
  container.innerHTML = '';

  const related = await window.supabaseDb.getRelatedBooks(categoryId, currentBookId, 3);
  if (related.length > 0) {
    container.innerHTML = related.map(book => `
      <div class="glass-card" onclick="openBookDetails('${book.id}')" style="display:flex;gap:12px;padding:12px;cursor:pointer;align-items:center;">
        <img src="${book.cover_image || '/assets/images/book-placeholder.jpg'}" alt="${book.title}" style="width:50px;height:70px;object-fit:cover;border-radius:6px;">
        <div style="flex:1;">
          <h4 style="font-size:0.95rem;font-weight:700;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;">${book.title}</h4>
          <p style="font-size:0.8rem;color:var(--text-secondary);">${book.author}</p>
        </div>
      </div>
    `).join('');
  } else {
    container.innerHTML = `<p style="font-size:0.85rem;color:var(--text-muted);">No related books found.</p>`;
  }
}

// Modal closing helper
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("open");
    // If it's the reader, clean iframe to stop audio/loading
    if (modalId === 'pdf-reader-modal') {
      const frame = document.getElementById("pdf-frame-container");
      if (frame) frame.innerHTML = '';
      
      // Refresh grids to update view counts
      if (document.getElementById("latest-books-grid")) {
        loadHomeGrids();
      }
      // If books.html is open, trigger search reload
      if (window.loadCatalog) {
        window.loadCatalog();
      }
    }
  }
}

window.openBookDetails = openBookDetails;
window.closeModal = closeModal;
