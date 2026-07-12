/* ==========================================================================
   WMO Imam Gazzali Academy Library - User Dashboard Portal Handler
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  // Require Authentication
  const user = await window.supabaseAuth.requireAuth();
  if (!user) return; // Exit if not logged in (will redirect inside requireAuth)

  // Load appropriate elements based on which dashboard sub-panel exists
  if (document.getElementById("dashboard-user-name")) {
    loadDashboardPortal(user);
  }

  if (document.getElementById("profile-form")) {
    loadProfilePortal(user);
  }
});

// --- DASHBOARD PORTAL ---
async function loadDashboardPortal(user) {
  // Populate welcome card
  document.getElementById("dashboard-user-name").textContent = user.full_name || 'Reader';
  document.getElementById("dashboard-user-role").textContent = user.role.toUpperCase();
  
  const avatar = document.getElementById("dashboard-user-avatar");
  if (avatar) {
    avatar.src = user.profile_image || 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22 fill=%22%23ccc%22><circle cx=%2250%22 cy=%2250%22 r=%2250%22/><text x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2224%22 font-family=%22sans-serif%22 font-weight=%22bold%22>' + (user.full_name ? user.full_name.charAt(0) : 'U') + '</text></svg>';
  }

  // Load Borrow History
  loadUserBorrowedBooks(user.id);

  // Load Wishlisted Books
  loadUserWishlist(user.id);

  // Load Notifications
  loadUserNotifications(user.id);
}

// Fetch user borrows list
async function loadUserBorrowedBooks(userId) {
  const activeGrid = document.getElementById("active-borrows-list");
  const historyTable = document.getElementById("borrow-history-table-body");

  if (!activeGrid && !historyTable) return;

  const borrows = await window.supabaseDb.getUserBorrows(userId);

  // Active Borrows filter (approved, overdue, pending)
  const activeBorrows = borrows.filter(b => ['approved', 'overdue', 'pending'].includes(b.status));
  // Completed Borrows (returned, rejected)
  const completedBorrows = borrows.filter(b => ['returned', 'rejected'].includes(b.status));

  // Render active books in grid
  if (activeGrid) {
    if (activeBorrows.length > 0) {
      activeGrid.innerHTML = activeBorrows.map(b => {
        const book = b.books;
        if (!book) return '';
        
        let statusColor = "var(--warning)";
        let statusText = "Pending Approval";
        if (b.status === 'approved') {
          statusColor = "var(--success)";
          statusText = `Due: ${new Date(b.due_date).toLocaleDateString()}`;
        } else if (b.status === 'overdue') {
          statusColor = "var(--danger)";
          statusText = "Overdue - Return Immediately";
        }

        // Reading progress calculation (mock/stored value, defaults to random progression)
        const progress = b.status === 'approved' ? 45 : 0;

        return `
          <div class="glass-card" style="display:flex;gap:20px;padding:20px;align-items:center;flex-wrap:wrap;">
            <img src="${book.cover_image || '/assets/images/book-placeholder.jpg'}" alt="${book.title}" style="width:70px;height:100px;object-fit:cover;border-radius:8px;box-shadow:var(--card-shadow);">
            <div style="flex:1;min-width:200px;">
              <h4 style="font-weight:700;font-size:1.1rem;margin-bottom:5px;">${book.title}</h4>
              <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px;">by ${book.author}</p>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span class="status-pill" style="background:rgba(255,255,255,0.05);color:${statusColor};padding:4px 8px;font-size:0.75rem;font-weight:700;">${statusText}</span>
                ${b.status === 'approved' ? `<span style="font-size:0.8rem;color:var(--text-muted);font-weight:600;">Progress: ${progress}%</span>` : ''}
              </div>
              
              ${b.status === 'approved' ? `
                <div style="width:100%;height:6px;background:var(--bg-tertiary);border-radius:10px;overflow:hidden;margin-bottom:12px;">
                  <div style="width:${progress}%;height:100%;background:var(--accent-gradient);border-radius:10px;"></div>
                </div>
                <div style="display:flex;gap:10px;">
                  ${book.pdf_url ? `<button onclick="window.openBookDetails('${book.id}')" class="btn btn-primary" style="padding:6px 12px;font-size:0.8rem;"><i class="fas fa-book-open"></i> Read</button>` : ''}
                  <button onclick="window.openBookDetails('${book.id}')" class="btn btn-secondary" style="padding:6px 12px;font-size:0.8rem;"><i class="fas fa-info-circle"></i> Info</button>
                </div>
              ` : `
                <button onclick="window.openBookDetails('${book.id}')" class="btn btn-secondary" style="padding:6px 12px;font-size:0.8rem;"><i class="fas fa-info-circle"></i> Info</button>
              `}
            </div>
          </div>
        `;
      }).join('');
    } else {
      activeGrid.innerHTML = `
        <div class="glass-card text-center" style="grid-column:1/-1;padding:40px;">
          <i class="fas fa-book-reader" style="font-size:2.5rem;color:var(--text-muted);margin-bottom:15px;"></i>
          <h4 style="font-weight:600;margin-bottom:5px;">No Active Borrowings</h4>
          <p style="color:var(--text-secondary);font-size:0.95rem;margin-bottom:15px;">Explore the library catalog to borrow E-books.</p>
          <a href="/books.html" class="btn btn-primary">Browse Catalog</a>
        </div>
      `;
    }
  }

  // Render completed books in table
  if (historyTable) {
    if (completedBorrows.length > 0) {
      historyTable.innerHTML = completedBorrows.map((b, idx) => {
        const book = b.books;
        if (!book) return '';
        const retDate = b.returned_date ? new Date(b.returned_date).toLocaleDateString() : 'Rejected';
        const statusColor = b.status === 'returned' ? 'approved' : 'rejected';
        return `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${book.title}</strong></td>
            <td>${book.author}</td>
            <td>${new Date(b.borrowed_date).toLocaleDateString()}</td>
            <td>${retDate}</td>
            <td><span class="status-pill ${statusColor}">${b.status.toUpperCase()}</span></td>
          </tr>
        `;
      }).join('');
    } else {
      historyTable.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No historical borrowing entries.</td></tr>`;
    }
  }
}

// Fetch user wishlist / favorites
async function loadUserWishlist(userId) {
  const container = document.getElementById("favorites-books-grid");
  if (!container) return;

  const wishlist = await window.supabaseDb.getWishlist(userId);
  if (wishlist.length > 0) {
    container.innerHTML = wishlist.map(book => createBookCardHTML(book)).join('');
    if (window.bindBookCardEvents) {
      window.bindBookCardEvents(container);
    }
  } else {
    container.innerHTML = `
      <div class="glass-card text-center" style="grid-column:1/-1;padding:40px;">
        <i class="far fa-heart" style="font-size:2.5rem;color:var(--text-muted);margin-bottom:15px;"></i>
        <h4 style="font-weight:600;margin-bottom:5px;">Your Wishlist is Empty</h4>
        <p style="color:var(--text-secondary);font-size:0.95rem;">Save your favorite books to read them later.</p>
      </div>
    `;
  }
}

// Fetch notifications
async function loadUserNotifications(userId) {
  const container = document.getElementById("notifications-list");
  if (!container) return;

  const list = await window.supabaseDb.getNotifications(userId);
  if (list.length > 0) {
    container.innerHTML = list.map(notif => `
      <div class="notification-item ${notif.is_read ? 'read' : 'unread'}" data-id="${notif.id}" style="display:flex;gap:15px;align-items:center;padding:15px;border-bottom:1px solid var(--border-color);position:relative;cursor:pointer;">
        <div class="stat-icon" style="width:36px;height:36px;font-size:0.95rem;background:${notif.is_read ? 'var(--bg-tertiary)' : 'var(--accent-gradient)'};color:${notif.is_read ? 'var(--text-secondary)' : 'white'};">
          <i class="fas ${notif.is_read ? 'fa-envelope-open' : 'fa-envelope'}"></i>
        </div>
        <div style="flex:1;">
          <h5 style="font-weight:700;font-size:0.95rem;color:var(--text-primary);">${notif.title}</h5>
          <p style="font-size:0.85rem;color:var(--text-secondary);">${notif.message}</p>
          <span style="font-size:0.75rem;color:var(--text-muted);">${new Date(notif.created_at).toLocaleString()}</span>
        </div>
        ${!notif.is_read ? `<button onclick="handleMarkRead(event, '${notif.id}')" class="btn btn-icon" style="width:28px;height:28px;font-size:0.8rem;" title="Mark Read"><i class="fas fa-check"></i></button>` : ''}
      </div>
    `).join('');
  } else {
    container.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:20px;">No notifications found.</p>`;
  }
}

async function handleMarkRead(e, id) {
  e.stopPropagation();
  const ok = await window.supabaseDb.markNotificationRead(id);
  if (ok) {
    showToast("Notification marked as read", "info");
    // Reload notifications list
    const user = await window.supabaseAuth.getCurrentUser();
    if (user) loadUserNotifications(user.id);
  }
}

// --- PROFILE SETTINGS PORTAL ---
async function loadProfilePortal(user) {
  // Populate form values
  document.getElementById("profile-name").value = user.full_name || '';
  document.getElementById("profile-phone").value = user.phone || '';
  document.getElementById("profile-email").value = user.email || '';
  
  const avatar = document.getElementById("profile-avatar-preview");
  if (avatar) {
    avatar.src = user.profile_image || 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22 fill=%22%23ccc%22><circle cx=%2250%22 cy=%2250%22 r=%2250%22/><text x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2224%22 font-family=%22sans-serif%22 font-weight=%22bold%22>' + (user.full_name ? user.full_name.charAt(0) : 'U') + '</text></svg>';
  }

  // Bind Submit Action
  const form = document.getElementById("profile-form");
  form.addEventListener("submit", handleProfileUpdate);

  // Bind password update settings
  const passForm = document.getElementById("dashboard-change-password-form");
  if (passForm) {
    passForm.addEventListener("submit", handleDashboardPasswordUpdate);
  }

  // Bind Avatar Image Upload
  const avatarInput = document.getElementById("profile-avatar-input");
  if (avatarInput) {
    avatarInput.addEventListener("change", handleAvatarUpload);
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const name = document.getElementById("profile-name").value.trim();
  const phone = document.getElementById("profile-phone").value.trim();
  const submitBtn = e.target.querySelector("button[type='submit']");

  if (!name) {
    showToast("Name is required", "warning");
    return;
  }

  submitBtn.disabled = true;

  const res = await window.supabaseAuth.updateProfile(name, phone);
  if (res.success) {
    showToast("Profile updated successfully!", "success");
  } else {
    showToast(res.error, "error");
  }
  submitBtn.disabled = false;
}

async function handleDashboardPasswordUpdate(e) {
  e.preventDefault();
  const pass = document.getElementById("dashboard-new-password").value;
  const conf = document.getElementById("dashboard-confirm-password").value;
  const submitBtn = e.target.querySelector("button[type='submit']");

  if (!pass || !conf) {
    showToast("Please fill in both fields", "warning");
    return;
  }
  if (pass !== conf) {
    showToast("Passwords do not match", "warning");
    return;
  }

  submitBtn.disabled = true;
  const res = await window.supabaseAuth.updatePassword(pass);
  if (res.success) {
    showToast("Password updated successfully!", "success");
    e.target.reset();
  } else {
    showToast(res.error, "error");
  }
  submitBtn.disabled = false;
}

// Avatar image upload action
async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const user = await window.supabaseAuth.getCurrentUser();
  if (!user) return;

  const preview = document.getElementById("profile-avatar-preview");
  if (preview) {
    preview.src = URL.createObjectURL(file); // Temporary preview
  }

  showToast("Uploading profile image...", "info");
  
  // Format filepath as `profiles/user_id/avatar_timestamp.ext`
  const ext = file.name.split('.').pop();
  const filePath = `profiles/${user.id}/avatar_${Date.now()}.${ext}`;

  // Upload to Supabase Storage bucket 'covers' (or lets create a separate public bucket or use 'covers' for simplicity)
  // Let's use 'covers' or 'profiles' bucket. We will use 'covers' since it's already defined public
  const res = await window.supabaseDb.uploadFile('covers', filePath, file);
  if (res.success) {
    // Update public.users record
    const dbUpdate = await window.supabaseAuth.updateProfile(user.full_name, user.phone, res.url);
    if (dbUpdate.success) {
      showToast("Profile image updated!", "success");
    } else {
      showToast(dbUpdate.error, "error");
    }
  } else {
    showToast(res.error, "error");
  }
}

window.handleMarkRead = handleMarkRead;
