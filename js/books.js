/* ==========================================================================
   WMO Imam Gazzali Academy Library - Books Feed, Detail & Reader Logic
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // If we are on the homepage, load sliders
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

  // Bind borrow confirmation action
  const confirmBorrowBtn = document.getElementById("confirm-borrow-btn");
  if (confirmBorrowBtn) {
    confirmBorrowBtn.addEventListener("click", executeBorrowBook);
  }

  // Bind review submit form
  const reviewForm = document.getElementById("submit-review-form");
  if (reviewForm) {
    reviewForm.addEventListener("submit", executeSubmitReview);
  }
});

// Load Home Page Grids
async function loadHomeGrids() {
  const latestGrid = document.getElementById("latest-books-grid");
  const popularGrid = document.getElementById("popular-books-grid");
  const categoriesGrid = document.getElementById("home-categories-grid");
  const announcementsList = document.getElementById("announcements-list");

  // Show skeletons
  showGridSkeletons(latestGrid, 4);
  showGridSkeletons(popularGrid, 4);

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
  const booksRes = await window.supabaseDb.getBooks({ limit: 8, sortBy: 'created_at', order: 'desc' });
  const books = booksRes.books;

  if (latestGrid) {
    if (books.length > 0) {
      latestGrid.innerHTML = books.slice(0, 4).map(book => createBookCardHTML(book)).join('');
      bindBookCardEvents(latestGrid);
    } else {
      latestGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-secondary);">No books available.</p>`;
    }
  }

  if (popularGrid) {
    // Sort by downloads as popular indicator
    const popularBooks = [...books].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    if (popularBooks.length > 0) {
      popularGrid.innerHTML = popularBooks.slice(0, 4).map(book => createBookCardHTML(book)).join('');
      bindBookCardEvents(popularGrid);
    } else {
      popularGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-secondary);">No books available.</p>`;
    }
  }

  // Fetch Announcements
  const announcements = await window.supabaseDb.getAnnouncements(3);
  if (announcementsList) {
    if (announcements.length > 0) {
      announcementsList.innerHTML = announcements.map(ann => `
        <div class="glass-card announcement-item" style="display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap;">
          ${ann.image ? `<img src="${ann.image}" alt="${ann.title}" style="width:120px;height:120px;object-fit:cover;border-radius:10px;">` : ''}
          <div style="flex:1;min-width:200px;">
            <span style="font-size:0.8rem;color:var(--text-muted);font-weight:600;">${new Date(ann.created_at).toLocaleDateString()}</span>
            <h3 style="font-size:1.25rem;margin:5px 0 10px 0;font-weight:700;">${ann.title}</h3>
            <p style="color:var(--text-secondary);font-size:0.95rem;">${ann.content}</p>
          </div>
        </div>
      `).join('');
    } else {
      announcementsList.innerHTML = `<p style="text-align:center;color:var(--text-secondary);">No announcements at this time.</p>`;
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
  const isAvailable = book.available_quantity > 0 && book.status === 'available';
  const badgeClass = isAvailable ? 'badge-available' : 'badge-out';
  const badgeText = isAvailable ? 'Available' : 'Out of Stock';
  
  return `
    <div class="glass-card book-card" data-id="${book.id}">
      <div class="book-cover-wrapper">
        <span class="book-badge ${badgeClass}">${badgeText}</span>
        <button class="book-wishlist-btn" onclick="handleCardWishlistToggle(event, '${book.id}')">
          <i class="far fa-heart"></i>
        </button>
        <img src="${book.cover_image || '/assets/images/book-placeholder.jpg'}" alt="${book.title}" class="book-cover-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 150%22 fill=%22%23ccc%22><rect width=%22100%22 height=%22150%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2212%22>No Cover</text></svg>'">
      </div>
      <div class="book-meta">${book.categories?.category_name || 'Book'}</div>
      <a href="javascript:void(0)" class="book-title-link trigger-details">${book.title}</a>
      <div class="book-author">${book.author}</div>
      <div class="book-footer">
        <span class="book-rating"><i class="fas fa-star"></i> ${(book.rating || 4.5).toFixed(1)}</span>
        <span style="font-size:0.8rem;color:var(--text-muted);font-weight:600;"><i class="fas fa-download"></i> ${book.downloads || 0}</span>
      </div>
    </div>
  `;
}

// Bind Click Events on Book Cards
function bindBookCardEvents(container) {
  const cards = container.querySelectorAll(".book-card");
  cards.forEach(card => {
    // Open details modal when clicking cover or title
    const trigger = card.querySelector(".trigger-details");
    const cover = card.querySelector(".book-cover-wrapper");
    
    const openAction = (e) => {
      if (e.target.closest('.book-wishlist-btn')) return; // ignore wishlist clicks
      openBookDetails(card.dataset.id);
    };

    if (trigger) trigger.addEventListener("click", openAction);
    if (cover) cover.addEventListener("click", openAction);

    // Sync wishlist icon state
    syncWishlistIcon(card.dataset.id, card.querySelector(".book-wishlist-btn i"));
  });
}

// Sync single wishlist icon state
async function syncWishlistIcon(bookId, iconEl) {
  const user = await window.supabaseAuth.getCurrentUser();
  if (user && iconEl) {
    const active = await window.supabaseDb.isWishlisted(user.id, bookId);
    if (active) {
      iconEl.className = "fas fa-heart";
    } else {
      iconEl.className = "far fa-heart";
    }
  }
}

// Trigger Wishlist Click from Card
async function handleCardWishlistToggle(e, bookId) {
  e.stopPropagation();
  const user = await window.supabaseAuth.getCurrentUser();
  if (!user) {
    showToast("Please log in to add books to your wishlist", "warning");
    return;
  }

  const icon = e.currentTarget.querySelector("i");
  const res = await window.supabaseDb.toggleWishlist(user.id, bookId);
  if (res.success) {
    if (res.action === 'added') {
      icon.className = "fas fa-heart";
      showToast("Book added to wishlist!", "success");
    } else {
      icon.className = "far fa-heart";
      showToast("Book removed from wishlist", "info");
    }
  }
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
  document.getElementById("modal-book-author").textContent = book.author;
  document.getElementById("modal-book-desc").textContent = book.description || 'No description available.';
  document.getElementById("modal-book-publisher").textContent = book.publisher || 'Unknown';
  document.getElementById("modal-book-year").textContent = book.publication_year || 'Unknown';
  document.getElementById("modal-book-language").textContent = book.language || 'English';
  document.getElementById("modal-book-isbn").textContent = book.isbn || 'N/A';
  document.getElementById("modal-book-shelf").textContent = book.shelf_location || 'Digital Shelf';
  document.getElementById("modal-book-category").textContent = book.categories?.category_name || 'General';
  document.getElementById("modal-book-cover").src = book.cover_image || '/assets/images/book-placeholder.jpg';

  // Available quantities
  const qtyEl = document.getElementById("modal-book-qty");
  if (qtyEl) {
    qtyEl.textContent = `${book.available_quantity} / ${book.total_quantity}`;
  }

  // QR Code Generation
  const qrEl = document.getElementById("modal-book-qrcode");
  if (qrEl) {
    qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/books.html?id=' + book.id)}`;
  }

  // Setup Actions
  setupBookDetailsActions(book);

  // Load reviews list
  loadReviews(bookId);

  // Load related books
  loadRelated(book.category_id, book.id);
}

function setupBookDetailsActions(book) {
  const borrowBtn = document.getElementById("modal-borrow-btn");
  const readBtn = document.getElementById("modal-read-btn");
  const downloadBtn = document.getElementById("modal-download-btn");
  const favoriteBtn = document.getElementById("modal-favorite-btn");

  const isAvailable = book.available_quantity > 0 && book.status === 'available';

  // Wishlist Action Sync
  if (favoriteBtn) {
    syncWishlistIcon(book.id, favoriteBtn.querySelector("i"));
    favoriteBtn.onclick = async () => {
      const user = await window.supabaseAuth.getCurrentUser();
      if (!user) {
        showToast("Please log in first", "warning");
        return;
      }
      const icon = favoriteBtn.querySelector("i");
      const res = await window.supabaseDb.toggleWishlist(user.id, book.id);
      if (res.success) {
        icon.className = res.action === 'added' ? 'fas fa-heart' : 'far fa-heart';
        showToast(res.action === 'added' ? 'Added to favorites!' : 'Removed from favorites', 'info');
      }
    };
  }

  // Borrow button setup
  if (borrowBtn) {
    if (isAvailable) {
      borrowBtn.disabled = false;
      borrowBtn.classList.remove("btn-secondary");
      borrowBtn.classList.add("btn-primary");
      borrowBtn.onclick = () => openBorrowConfirmModal(book);
    } else {
      borrowBtn.disabled = true;
      borrowBtn.classList.remove("btn-primary");
      borrowBtn.classList.add("btn-secondary");
      borrowBtn.textContent = "Unavailable";
    }
  }

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

// Open borrow confirmation modal
function openBorrowConfirmModal(book) {
  closeModal("book-details-modal");
  const modal = document.getElementById("borrow-confirm-modal");
  if (!modal) return;
  modal.classList.add("open");

  document.getElementById("borrow-confirm-title").textContent = book.title;
  document.getElementById("borrow-confirm-author").textContent = book.author;
  
  // Set calculated return date (14 days default)
  const returnDate = new Date();
  returnDate.setDate(returnDate.getDate() + 14);
  document.getElementById("borrow-confirm-date").textContent = returnDate.toLocaleDateString();
}

// Execute borrow request
async function executeBorrowBook() {
  const user = await window.supabaseAuth.getCurrentUser();
  if (!user) {
    showToast("Please log in to borrow books", "warning");
    closeModal("borrow-confirm-modal");
    return;
  }

  const submitBtn = document.getElementById("confirm-borrow-btn");
  submitBtn.disabled = true;

  const res = await window.supabaseDb.requestBorrow(currentSelectedBookId, user.id);
  if (res.success) {
    showToast("Request submitted successfully! Awaiting library approval.", "success");
    closeModal("borrow-confirm-modal");
  } else {
    showToast(res.error, "error");
  }
  submitBtn.disabled = false;
}

// PDF Reader Inside Modal
function openPDFReader(title, pdfUrl, bookId) {
  closeModal("book-details-modal");
  const modal = document.getElementById("pdf-reader-modal");
  if (!modal) return;
  modal.classList.add("open");

  document.getElementById("reader-title").textContent = title;
  
  // Setup iframe
  const iframeContainer = document.getElementById("pdf-frame-container");
  iframeContainer.innerHTML = `
    <embed src="${pdfUrl}#toolbar=0" type="application/pdf" width="100%" height="600px" />
  `;

  // Reading progress tracker (simulate progress on scroll)
  const readerProgress = document.getElementById("reader-progress-bar");
  const readerBody = iframeContainer.querySelector('embed');
  if (readerProgress) readerProgress.style.width = "0%";

  // Track download metrics
  window.supabaseDb.incrementDownload(bookId);
}

// Download PDF
async function triggerPDFDownload(book) {
  window.supabaseDb.incrementDownload(book.id);
  
  // Direct trigger download link
  const link = document.createElement("a");
  link.href = book.pdf_url;
  link.target = "_blank";
  link.download = `${book.title}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Download started!", "success");
}

// Load Reviews inside details modal
async function loadReviews(bookId) {
  const container = document.getElementById("modal-reviews-list");
  if (!container) return;
  container.innerHTML = `<p style="text-align:center;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading reviews...</p>`;

  const reviews = await window.supabaseDb.getBookReviews(bookId);
  if (reviews.length > 0) {
    container.innerHTML = reviews.map(rev => `
      <div style="border-bottom:1px solid var(--border-color);padding:15px 0;">
        <div style="display:flex;justify-content:between;align-items:center;margin-bottom:8px;">
          <strong style="font-weight:600;font-size:0.95rem;">${rev.users?.full_name || 'Anonymous Reader'}</strong>
          <span style="color:var(--warning);font-size:0.85rem;margin-left:auto;">
            ${Array(rev.rating).fill('<i class="fas fa-star"></i>').join('')}
            ${Array(5 - rev.rating).fill('<i class="far fa-star"></i>').join('')}
          </span>
        </div>
        <p style="color:var(--text-secondary);font-size:0.9rem;">${rev.review_text || 'No comments left.'}</p>
        <span style="font-size:0.75rem;color:var(--text-muted);">${new Date(rev.created_at).toLocaleDateString()}</span>
      </div>
    `).join('');
  } else {
    container.innerHTML = `<p style="text-align:center;color:var(--text-muted);font-size:0.95rem;">No reviews yet. Be the first to review this book!</p>`;
  }
}

// Submit Review Action
async function executeSubmitReview(e) {
  e.preventDefault();
  const user = await window.supabaseAuth.getCurrentUser();
  if (!user) {
    showToast("Please log in to post reviews", "warning");
    return;
  }

  const rating = parseInt(document.getElementById("review-rating").value);
  const text = document.getElementById("review-text").value.trim();
  const submitBtn = e.target.querySelector("button[type='submit']");

  if (!rating) {
    showToast("Please select a rating star", "warning");
    return;
  }

  submitBtn.disabled = true;

  const res = await window.supabaseDb.addReview(currentSelectedBookId, user.id, rating, text);
  if (res.success) {
    showToast("Review submitted successfully!", "success");
    e.target.reset();
    loadReviews(currentSelectedBookId);
  } else {
    showToast(res.error, "error");
  }
  submitBtn.disabled = false;
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
    }
  }
}

window.openBookDetails = openBookDetails;
window.closeModal = closeModal;
window.handleCardWishlistToggle = handleCardWishlistToggle;
