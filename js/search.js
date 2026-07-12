/* ==========================================================================
   WMO Imam Gazzali Academy Library - Catalog Search, Filtering & Paginate
   ========================================================================== */

let searchState = {
  search: '',
  categoryId: 'all',
  language: 'all',
  sortBy: 'title',
  order: 'asc',
  page: 1,
  limit: 12
};

document.addEventListener("DOMContentLoaded", () => {
  const booksGrid = document.getElementById("catalog-books-grid");
  if (!booksGrid) return; // Only execute on catalog books page

  // Bind filters
  const searchInput = document.getElementById("catalog-search-input");
  const categorySelect = document.getElementById("catalog-category-select");
  const languageSelect = document.getElementById("catalog-language-select");
  const sortSelect = document.getElementById("catalog-sort-select");

  if (searchInput) searchInput.addEventListener("input", debounce(handleSearchInput, 500));
  if (categorySelect) categorySelect.addEventListener("change", handleCategoryChange);
  if (languageSelect) languageSelect.addEventListener("change", handleLanguageChange);
  if (sortSelect) sortSelect.addEventListener("change", handleSortChange);

  // Read URL query parameters
  parseUrlParams();

  // Populate categories dropdown list
  populateCategoriesDropdown();

  // Load books
  loadCatalogBooks();
});

// Parse URL Parameters on Init
function parseUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('search')) {
    searchState.search = urlParams.get('search');
    const input = document.getElementById("catalog-search-input");
    if (input) input.value = searchState.search;
  }
  if (urlParams.has('category')) {
    searchState.categoryId = urlParams.get('category');
  }
  if (urlParams.has('id')) {
    // Open detailed modal directly
    const bookId = urlParams.get('id');
    setTimeout(() => {
      if (window.openBookDetails) window.openBookDetails(bookId);
    }, 800);
  }
}

// Populate Category Filter dropdown
async function populateCategoriesDropdown() {
  const select = document.getElementById("catalog-category-select");
  if (!select) return;

  const categories = await window.supabaseDb.getCategories();
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.category_name;
    if (cat.id === searchState.categoryId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

// Debounce helper to prevent heavy API query thrashing
function debounce(func, delay) {
  let debounceTimer;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  };
}

function handleSearchInput(e) {
  searchState.search = e.target.value.trim();
  searchState.page = 1;
  loadCatalogBooks();
}

function handleCategoryChange(e) {
  searchState.categoryId = e.target.value;
  searchState.page = 1;
  loadCatalogBooks();
}

function handleLanguageChange(e) {
  searchState.language = e.target.value;
  searchState.page = 1;
  loadCatalogBooks();
}

function handleSortChange(e) {
  const parts = e.target.value.split('-');
  searchState.sortBy = parts[0];
  searchState.order = parts[1] || 'asc';
  searchState.page = 1;
  loadCatalogBooks();
}

// LOAD BOOKS
async function loadCatalogBooks() {
  const grid = document.getElementById("catalog-books-grid");
  if (!grid) return;

  // Show Skeleton Screens
  if (window.showGridSkeletons) {
    window.showGridSkeletons(grid, searchState.limit);
  }

  const { books, total } = await window.supabaseDb.getBooks(searchState);

  if (books.length > 0) {
    grid.innerHTML = books.map(book => createBookCardHTML(book)).join('');
    if (window.bindBookCardEvents) {
      window.bindBookCardEvents(grid);
    }
    renderPagination(total);
  } else {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
        <i class="fas fa-search" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 20px;"></i>
        <h3 style="font-weight: 700; margin-bottom: 10px;">No Books Found</h3>
        <p style="color: var(--text-secondary);">Try refining your search terms or filters.</p>
      </div>
    `;
    const pagContainer = document.getElementById("catalog-pagination");
    if (pagContainer) pagContainer.innerHTML = '';
  }
}

// Render Pagination Buttons
function renderPagination(totalCount) {
  const pagContainer = document.getElementById("catalog-pagination");
  if (!pagContainer) return;

  const totalPages = Math.ceil(totalCount / searchState.limit);
  if (totalPages <= 1) {
    pagContainer.innerHTML = '';
    return;
  }

  let html = '';
  
  // Previous button
  html += `
    <button class="btn btn-secondary" ${searchState.page === 1 ? 'disabled' : ''} onclick="changePage(${searchState.page - 1})">
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= searchState.page - 1 && i <= searchState.page + 1)) {
      html += `
        <button class="btn ${searchState.page === i ? 'btn-primary' : 'btn-secondary'}" onclick="changePage(${i})">
          ${i}
        </button>
      `;
    } else if (i === 2 || i === totalPages - 1) {
      html += `<span style="padding: 10px; color: var(--text-muted);">...</span>`;
    }
  }

  // Next button
  html += `
    <button class="btn btn-secondary" ${searchState.page === totalPages ? 'disabled' : ''} onclick="changePage(${searchState.page + 1})">
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  pagContainer.innerHTML = html;
}

function changePage(pageNumber) {
  searchState.page = pageNumber;
  loadCatalogBooks();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.changePage = changePage;
