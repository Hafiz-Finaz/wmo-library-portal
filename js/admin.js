/* ==========================================================================
   WMO Imam Gazzali Academy Library - Admin Portal Controller
   ========================================================================== */

// Modal closing helper
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("open");
  }
}
window.closeModal = closeModal;

document.addEventListener("DOMContentLoaded", async () => {
  // Check Admin Authentication
  const user = await window.supabaseAuth.requireAuth(['admin']);
  if (!user) return;
  // Bind modal close buttons
  document.querySelectorAll(".modal-overlay").forEach(modal => {

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });

    const closeBtn = modal.querySelector(".modal-close");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        console.log("Close button clicked:", modal.id);
        closeModal(modal.id);
      });
    }

  }); // Stop executing if not admin

  // Sync Nav Sidebar Active States
  syncSidebarActiveState();

  // Initialize Mobile Sidebar Drawer Toggle
  initMobileSidebar();

  // Route to the appropriate sub-module based on elements on the current page
  if (document.getElementById("admin-stats-total-books")) {
    loadAdminDashboard(user);
  }

  if (document.getElementById("admin-books-table-body")) {
    loadAdminBooksModule();
  }

  if (document.getElementById("admin-categories-list")) {
    loadAdminCategoriesModule();
  }

  if (document.getElementById("admin-messages-table-body")) {
    loadAdminMessagesModule();
  }

  if (document.getElementById("admin-settings-form")) {
    loadAdminSettingsModule();
  }
});

// Sidebar Link Styling Sync
function syncSidebarActiveState() {
  const currentPath = window.location.pathname;
  const menuLinks = document.querySelectorAll(".sidebar-menu li");

  menuLinks.forEach(li => {
    const a = li.querySelector("a");
    if (a && currentPath.includes(a.getAttribute("href"))) {
      li.classList.add("active");
    } else {
      li.classList.remove("active");
    }
  });
}

// Initialize mobile sidebar drawer and backdrop toggle
function initMobileSidebar() {
  const adminHeader = document.querySelector(".admin-header");
  const sidebar = document.querySelector(".admin-sidebar");

  if (adminHeader && sidebar) {
    if (document.getElementById("admin-sidebar-toggle")) return;

    // Create toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "admin-sidebar-toggle";
    toggleBtn.className = "btn-icon admin-sidebar-toggle";
    toggleBtn.setAttribute("aria-label", "Toggle Sidebar");
    toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';

    // Insert toggle button before the header title
    const headerTitle = adminHeader.querySelector(".admin-header-title");
    if (headerTitle) {
      adminHeader.insertBefore(toggleBtn, headerTitle);
    } else {
      adminHeader.prepend(toggleBtn);
    }

    // Create backdrop overlay element if not exists
    let backdrop = document.querySelector(".admin-sidebar-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "admin-sidebar-backdrop";
      document.body.appendChild(backdrop);
    }

    // Toggle click listeners
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      backdrop.classList.toggle("active");
    });

    backdrop.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("active");
    });

    // Close on any menu link click
    const sidebarLinks = sidebar.querySelectorAll(".sidebar-menu a, .sidebar-footer a");
    sidebarLinks.forEach(link => {
      link.addEventListener("click", () => {
        sidebar.classList.remove("open");
        backdrop.classList.remove("active");
      });
    });
  }
}

// --- ADMIN DASHBOARD ---
async function loadAdminDashboard(user) {
  let allBooks = [];
  let categories = [];
  if (window.useMockData) {
    const res = await window.supabaseDb.getBooks({ limit: 1000 });
    allBooks = res.books || [];
    categories = await window.supabaseDb.getCategories();
  } else {
    const { data: bData } = await window.supabaseClient.from('books').select('views, downloads, category_id');
    const { data: cData } = await window.supabaseClient.from('categories').select('*');
    allBooks = bData || [];
    categories = cData || [];
  }

  let totalBooks = allBooks ? allBooks.length : 0;
  let totalCategories = categories ? categories.length : 0;
  let totalViews = 0;
  let totalDownloads = 0;

  if (allBooks) {
    allBooks.forEach(b => {
      totalViews += (b.views || 0);
      totalDownloads += (b.downloads || 0);
    });
  }

  document.getElementById("admin-stats-total-books").textContent = totalBooks;
  document.getElementById("admin-stats-total-categories").textContent = totalCategories;
  document.getElementById("admin-stats-total-views").textContent = totalViews;
  document.getElementById("admin-stats-total-downloads").textContent = totalDownloads;

  // Load Recent Messages
  const recentMessages = await window.supabaseDb.getContactMessages();
  const tbody = document.getElementById("admin-recent-messages-table");
  if (tbody) {
    if (recentMessages && recentMessages.length > 0) {
      tbody.innerHTML = recentMessages.slice(0, 5).map((msg, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${msg.name}</strong></td>
          <td>${msg.email}</td>
          <td>${msg.subject}</td>
          <td>${new Date(msg.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No messages received yet.</td></tr>`;
    }
  }

  // Render Charts
  renderCharts(allBooks, categories);
}

async function renderCharts(allBooks, categories) {
  const booksCtx = document.getElementById('chart-books-category');
  const borrowsCtx = document.getElementById('chart-monthly-borrowings');

  if (!booksCtx || !borrowsCtx) return;

  // Calculate book counts per category ID
  const counts = {};
  if (allBooks) {
    allBooks.forEach(b => {
      counts[b.category_id] = (counts[b.category_id] || 0) + 1;
    });
  }

  const labels = categories ? categories.map(c => c.category_name) : [];
  const bookCounts = categories ? categories.map(c => counts[c.id] || 0) : [];

  new Chart(booksCtx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Books by Category',
        data: bookCounts,
        backgroundColor: 'rgba(79, 70, 229, 0.6)',
        borderColor: '#4f46e5',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } } }
    }
  });

  // Monthly Downloads Chart (Line Chart representation)
  new Chart(borrowsCtx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [{
        label: 'Monthly E-book Downloads',
        data: [15, 28, 45, 30, 68, 92, 120],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}

// --- ADMIN BOOKS MODULE ---
let adminBooks = [];

async function loadAdminBooksModule() {
  const tbody = document.getElementById("admin-books-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading inventory...</td></tr>`;

  // Fetch all books
  let data = [];
  if (window.useMockData) {
    const res = await window.supabaseDb.getBooks({ limit: 1000 });
    data = res.books || [];
  } else {
    const { data: bData, error } = await window.supabaseClient
      .from('books')
      .select('*, categories(category_name)')
      .order('created_at', { ascending: false });

    if (error) {
      showToast(error.message, "error");
      return;
    }
    data = bData || [];
  }

  adminBooks = data;

  tbody.innerHTML = data.map((book, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><img src="${book.cover_image || '/assets/images/book-placeholder.jpg'}" style="width:35px;height:50px;object-fit:cover;border-radius:4px;"></td>
      <td><strong>${book.title}</strong><br><span style="font-size:0.8rem;color:var(--text-muted);">${book.subtitle || ''}</span></td>
      <td>${book.author}</td>
      <td>${book.categories?.category_name || 'N/A'}</td>
      <td>${book.views || 0}</td>
      <td>${book.downloads || 0}</td>
      <td><span class="status-pill ${book.featured ? 'approved' : 'rejected'}">${book.featured ? 'Yes' : 'No'}</span></td>
      <td>
        <div class="action-btns">
          <button onclick="openEditBookModal('${book.id}')" class="action-btn edit" title="Edit"><i class="fas fa-edit"></i></button>
          <button onclick="handleDeleteBook('${book.id}')" class="action-btn delete" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </div>
      </td>
    </tr>
  `).join('');

  // Populate categories dropdown select in Form Modal
  populateBookModalCategoryDropdown();

  // Bind Submit add/edit book forms
  const form = document.getElementById("add-book-form");
  if (form) {
    // Clean up previous listeners
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.addEventListener("submit", handleBookSubmit);
  }
}

async function populateBookModalCategoryDropdown() {
  const select = document.getElementById("book-form-category");
  if (!select) return;
  select.innerHTML = '<option value="">Select Category</option>';

  const categories = await window.supabaseDb.getCategories();
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.category_name;
    select.appendChild(opt);
  });
}

function openAddBookModal() {
  const modal = document.getElementById("admin-book-modal");
  if (!modal) return;
  modal.classList.add("open");
  const closeBtn = modal.querySelector(".modal-close");

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.remove("open");
    };
  }

  document.getElementById("modal-form-title").textContent = "Add New E-Book";
  document.getElementById("add-book-form").reset();
  document.getElementById("book-form-id").value = "";

  // Set default check state
  document.getElementById("book-form-featured").checked = false;
}

async function openEditBookModal(bookId) {
  const book = adminBooks.find(b => b.id === bookId);
  if (!book) return;

  const modal = document.getElementById("admin-book-modal");
  if (!modal) return;
  modal.classList.add("open");

  document.getElementById("modal-form-title").textContent = "Edit E-Book Details";
  document.getElementById("book-form-id").value = book.id;
  document.getElementById("book-form-title").value = book.title;
  document.getElementById("book-form-subtitle").value = book.subtitle || "";
  document.getElementById("book-form-author").value = book.author;
  document.getElementById("book-form-category").value = book.category_id || "";
  document.getElementById("book-form-isbn").value = book.isbn || "";
  document.getElementById("book-form-publisher").value = book.publisher || "";
  document.getElementById("book-form-year").value = book.publication_year || "";
  document.getElementById("book-form-edition").value = book.edition || "";
  document.getElementById("book-form-pages").value = book.pages || "";
  document.getElementById("book-form-size").value = book.file_size || "";
  document.getElementById("book-form-language").value = book.language || "English";
  document.getElementById("book-form-status").value = book.status || "available";
  document.getElementById("book-form-tags").value = book.tags || "";
  document.getElementById("book-form-featured").checked = book.featured === true;
  document.getElementById("book-form-desc").value = book.description || "";
}

// Create or update book details
async function handleBookSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("book-form-id").value;
  const title = document.getElementById("book-form-title").value.trim();
  const subtitle = document.getElementById("book-form-subtitle").value.trim();
  const author = document.getElementById("book-form-author").value.trim();
  const categoryId = document.getElementById("book-form-category").value;
  const isbn = document.getElementById("book-form-isbn").value.trim();
  const publisher = document.getElementById("book-form-publisher").value.trim();
  const publicationYear = parseInt(document.getElementById("book-form-year").value) || null;
  const edition = document.getElementById("book-form-edition").value.trim();
  const pages = parseInt(document.getElementById("book-form-pages").value) || null;
  const fileSize = document.getElementById("book-form-size").value.trim();
  const language = document.getElementById("book-form-language").value;
  const status = document.getElementById("book-form-status").value;
  const tags = document.getElementById("book-form-tags").value.trim();
  const featured = document.getElementById("book-form-featured").checked;
  const description = document.getElementById("book-form-desc").value.trim();

  const coverFile = document.getElementById("book-form-cover").files[0];
  const pdfFile = document.getElementById("book-form-pdf").files[0];

  const submitBtn = e.target.querySelector("button[type='submit']");
  submitBtn.disabled = true;

  try {
    let coverUrl = null;
    let pdfUrl = null;

    // Upload Cover to covers storage bucket
    if (coverFile) {
      const coverPath = `covers/cover_${Date.now()}_${coverFile.name}`;
      const coverRes = await window.supabaseDb.uploadFile('covers', coverPath, coverFile);
      if (coverRes.success) {
        coverUrl = coverRes.url;
      } else {
        showToast("Cover upload failure: " + coverRes.error, "error");
      }
    }

    // Upload PDF to books storage bucket
    if (pdfFile) {
      const pdfPath = `books/pdf_${Date.now()}_${pdfFile.name}`;
      const pdfRes = await window.supabaseDb.uploadFile('books', pdfPath, pdfFile);
      if (pdfRes.success) {
        pdfUrl = pdfRes.url;
      } else {
        showToast("PDF file upload failure: " + pdfRes.error, "error");
      }
    }

    const payload = {
      title,
      subtitle,
      author,
      category_id: categoryId || null,
      isbn,
      publisher,
      publication_year: publicationYear,
      edition,
      pages,
      file_size: fileSize,
      language,
      status,
      tags,
      featured,
      description
    };

    if (coverUrl) payload.cover_image = coverUrl;
    if (pdfUrl) payload.pdf_url = pdfUrl;

    const res = await window.supabaseDb.saveBook(id, payload);
    if (!res.success) throw new Error(res.error);
    showToast(id ? "Book details updated!" : "Book created successfully!", "success");

    window.closeModal("admin-book-modal");
    loadAdminBooksModule();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    submitBtn.disabled = false;
  }
}

async function handleDeleteBook(bookId) {
  if (!confirm("Are you sure you want to permanently delete this digital book?")) return;

  const res = await window.supabaseDb.deleteBook(bookId);
  if (!res.success) {
    showToast(res.error, "error");
  } else {
    showToast("Book deleted", "info");
    loadAdminBooksModule();
  }
}

// --- ADMIN CATEGORIES MODULE ---
async function loadAdminCategoriesModule() {
  const container = document.getElementById("admin-categories-list");
  if (!container) return;

  container.innerHTML = `<p style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading subject areas...</p>`;

  const list = await window.supabaseDb.getCategories();

  container.innerHTML = list.map(c => `
    <div class="glass-card" style="display:flex;justify-content:space-between;align-items:center;padding:15px 20px;">
      <div style="display:flex;align-items:center;gap:15px;">
        <div class="stat-icon" style="width:36px;height:36px;font-size:0.95rem;"><i class="fas ${c.icon || 'fa-book'}"></i></div>
        <strong style="font-size:1.05rem;font-weight:700;">${c.category_name}</strong>
      </div>
      <button onclick="handleDeleteCategory('${c.id}')" class="action-btn delete"><i class="fas fa-trash-alt"></i></button>
    </div>
  `).join('');

  // Bind Submit Category Action
  const form = document.getElementById("admin-add-category-form");
  if (form) {
    // Clean listener
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.addEventListener("submit", handleCategorySubmit);
  }
}

async function handleCategorySubmit(e) {
  e.preventDefault();
  const name = document.getElementById("category-input-name").value.trim();
  const icon = document.getElementById("category-input-icon").value.trim();
  const submitBtn = e.target.querySelector("button[type='submit']");

  if (!name) return;

  submitBtn.disabled = true;
  const res = await window.supabaseDb.addCategory(name, icon);
  if (!res.success) {
    showToast(res.error, "error");
  } else {
    showToast("Category added", "success");
    e.target.reset();
    loadAdminCategoriesModule();
  }
  submitBtn.disabled = false;
}

async function handleDeleteCategory(catId) {
  if (!confirm("Deleting this category will set related books categories to General. Continue?")) return;

  const res = await window.supabaseDb.deleteCategory(catId);
  if (!res.success) {
    showToast(res.error, "error");
  } else {
    showToast("Category deleted", "info");
    loadAdminCategoriesModule();
  }
}

// --- ADMIN MESSAGES MODULE ---
async function loadAdminMessagesModule() {
  const tbody = document.getElementById("admin-messages-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading inbox messages...</td></tr>`;

  const messages = await window.supabaseDb.getContactMessages();

  if (messages && messages.length > 0) {
    tbody.innerHTML = messages.map((msg, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${msg.name}</strong></td>
        <td><a href="mailto:${msg.email}" style="color:var(--accent-primary);text-decoration:underline;">${msg.email}</a></td>
        <td><strong>${msg.subject}</strong></td>
        <td><div style="max-width:300px;font-size:0.9rem;white-space:normal;word-break:break-word;">${msg.message}</div></td>
        <td>${new Date(msg.created_at).toLocaleString()}</td>
        <td>
          <button onclick="handleDeleteMessage('${msg.id}')" class="action-btn delete" title="Delete Message"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">Inbox is empty.</td></tr>`;
  }
}

async function handleDeleteMessage(messageId) {
  if (!confirm("Delete this contact message permanently?")) return;

  const res = await window.supabaseDb.deleteContactMessage(messageId);
  if (res.success) {
    showToast("Message deleted", "info");
    loadAdminMessagesModule();
  } else {
    showToast("Error deleting: " + res.error, "error");
  }
}

// --- ADMIN SYSTEM SETTINGS ---
async function loadAdminSettingsModule() {
  const nameInput = document.getElementById("setting-library-name");
  if (!nameInput) return;

  // Retrieve value
  nameInput.value = await window.supabaseDb.getSystemSetting('library_name', 'WMO Imam Gazzali Academy Library Council');

  const form = document.getElementById("admin-settings-form");
  // Clean listener
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);

  newForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button[type='submit']");
    submitBtn.disabled = true;

    try {
      if (window.useMockData) {
        localStorage.setItem('setting_library_name', nameInput.value);
      } else {
        const { error } = await window.supabaseClient
          .from('system_settings')
          .upsert({ key: 'library_name', value: nameInput.value });
        if (error) throw error;
      }
      showToast("Library portal configurations updated!", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// Export functions globally
window.openAddBookModal = openAddBookModal;
window.openEditBookModal = openEditBookModal;
window.handleDeleteBook = handleDeleteBook;
window.handleDeleteCategory = handleDeleteCategory;
window.handleDeleteMessage = handleDeleteMessage;
