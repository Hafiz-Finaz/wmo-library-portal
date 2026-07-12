/* ==========================================================================
   WMO Imam Gazzali Academy Library - Global App Script
   ========================================================================= */

// Global state / dictionary for Multi-language support
const i18n = {
  en: {
    nav_home: "Home",
    nav_about: "About",
    nav_books: "Books",
    nav_categories: "Categories",
    nav_contact: "Contact",
    nav_dashboard: "Dashboard",
    nav_admin: "Admin Portal",
    nav_login: "Login",
    nav_logout: "Logout",
    hero_title: "WMO Imam Gazzali Academy <span>Library Council</span>",
    hero_desc: "Discover a wealth of knowledge with our digital library system. Access thousands of E-books, research papers, journals, and local educational resources anywhere, anytime.",
    search_placeholder: "Search books, authors, ISBN...",
    btn_search: "Search",
    btn_explore: "Explore Library",
    btn_borrow: "Borrow Book",
    stats_books: "Total Books",
    stats_users: "Active Readers",
    stats_borrows: "Total Borrows",
    stats_categories: "Subject Areas",
    popular_title: "Popular Books",
    recent_title: "Recently Added",
    news_title: "Library News & Announcements",
    footer_desc: "Empowering minds through quality academic resources and digital reading platforms.",
    footer_links: "Quick Links",
    footer_contact: "Contact Info"
  },
  ml: {
    nav_home: "ഹോം",
    nav_about: "വിവരങ്ങൾ",
    nav_books: "പുസ്തകങ്ങൾ",
    nav_categories: "വിഭാഗങ്ങൾ",
    nav_contact: "ബന്ധപ്പെടുക",
    nav_dashboard: "ഡാഷ്‌ബോർഡ്",
    nav_admin: "അഡ്മിൻ പോർട്ടൽ",
    nav_login: "ലോഗിൻ",
    nav_logout: "ലോഗൗട്ട്",
    hero_title: "WMO ഇമാം ഗസ്സാലി അക്കാദമി <span>ലൈബ്രറി കൗൺസിൽ</span>",
    hero_desc: "ഞങ്ങളുടെ ഡിജിറ്റൽ ലൈബ്രറിയിലൂടെ അറിവിന്റെ ലോകം കണ്ടെത്തൂ. ആയിരക്കണക്കിന് ഇ-ബുക്കുകൾ, ഗവേഷണ പ്രബന്ധങ്ങൾ, ജേണലുകൾ എന്നിവ എവിടെയും എപ്പോഴും ആക്സസ് ചെയ്യാം.",
    search_placeholder: "പുസ്തകങ്ങൾ, രചയിതാക്കൾ തിരയുക...",
    btn_search: "തിരയുക",
    btn_explore: "ലൈബ്രറി കാണുക",
    btn_borrow: "ബുക്ക് എടുക്കുക",
    stats_books: "ആകെ പുസ്തകങ്ങൾ",
    stats_users: "വായനക്കാർ",
    stats_borrows: "ആകെ വായ്പകൾ",
    stats_categories: "വിഷയങ്ങൾ",
    popular_title: "ജനപ്രിയ പുസ്തകങ്ങൾ",
    recent_title: "പുതിയ പുസ്തകങ്ങൾ",
    news_title: "ലൈബ്രറി വാർത്തകളും അറിയിപ്പുകളും",
    footer_desc: "ഗുണനിലവാരമുള്ള അക്കാദമിക് ഉറവിടങ്ങളിലൂടെയും ഡിജിറ്റൽ വായനയിലൂടെയും ചിന്തകളെ ശാക്തീകരിക്കുന്നു.",
    footer_links: "ദ്രുത ലിങ്കുകൾ",
    footer_contact: "ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ"
  },
  ar: {
    nav_home: "الرئيسية",
    nav_about: "من نحن",
    nav_books: "الكتب",
    nav_categories: "التصنيفات",
    nav_contact: "اتصل بنا",
    nav_dashboard: "لوحة التحكم",
    nav_admin: "بوابة المشرف",
    nav_login: "تسجيل الدخول",
    nav_logout: "تسجيل الخروج",
    hero_title: "مجلس مكتبة <span>أكاديمية الإمام الغزالي WMO</span>",
    hero_desc: "اكتشف عالمًا من المعرفة من خلال مكتبتنا الرقمية. يمكنك الوصول إلى آلاف الكتب الإلكترونية، والأوراق البحثية، والمجلات في أي مكان وزمان.",
    search_placeholder: "ابحث عن الكتب والمؤلفين والرقم الدولي المعياري للكتاب...",
    btn_search: "بحث",
    btn_explore: "استكشف المكتبة",
    btn_borrow: "استعارة كتاب",
    stats_books: "إجمالي الكتب",
    stats_users: "القراء النشطين",
    stats_borrows: "إجمالي الاستعارات",
    stats_categories: "المجالات الدراسية",
    popular_title: "الكتب الشائعة",
    recent_title: "أضيفت حديثا",
    news_title: "أخبار وإعلانات المكتبة",
    footer_desc: "تمكين العقول من خلال الموارد الأكاديمية المتميزة ومنصات القراءة الرقمية.",
    footer_links: "روابط سريعة",
    footer_contact: "معلومات الاتصال"
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // 1. Remove Loader Screen
  const loader = document.getElementById("loader-wrapper");
  if (loader) {
    setTimeout(() => {
      loader.style.opacity = "0";
      loader.style.visibility = "hidden";
    }, 500);
  }

  // 2. Initialize Theme (Dark / Light)
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  const themeToggleBtn = document.getElementById("theme-toggle");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      updateThemeIcon(newTheme);
    });
  }

  // 3. Initialize Language Settings
  const savedLang = localStorage.getItem("lang") || "en";
  setLanguage(savedLang);

  const langSelect = document.getElementById("lang-select");
  if (langSelect) {
    langSelect.value = savedLang;
    langSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
    });
  }

  // 4. Header Scroll Effect
  const header = document.querySelector("header");
  window.addEventListener("scroll", () => {
    // Scroll progress bar calculation
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const progress = document.getElementById("scroll-progress");
    if (progress) progress.style.width = scrolled + "%";

    // Header padding toggle
    if (header) {
      if (winScroll > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }

    // Back to top button visibility
    const backToTop = document.getElementById("back-to-top");
    if (backToTop) {
      if (winScroll > 300) {
        backToTop.classList.add("visible");
      } else {
        backToTop.classList.remove("visible");
      }
    }
  });

  // Back to top button functionality
  const backToTop = document.getElementById("back-to-top");
  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // 5. Mobile Hamburger Navigation
  const menuToggle = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
      const icon = menuToggle.querySelector("i");
      if (icon) {
        if (navLinks.classList.contains("open")) {
          icon.className = "fas fa-times";
        } else {
          icon.className = "fas fa-bars";
        }
      }
    });
  }

  // 6. Navigation Actions Setup (Sync login/logout button states)
  updateNavAuthenticationStates();

  // 7. Register PWA Service Worker
  registerServiceWorker();
});

// Update Theme Icon UI
function updateThemeIcon(theme) {
  const themeIcon = document.querySelector("#theme-toggle i");
  if (themeIcon) {
    themeIcon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }
}

// Set Multi-language
function setLanguage(lang) {
  localStorage.setItem("lang", lang);
  
  // Set Direction for Arabic (RTL)
  if (lang === "ar") {
    document.documentElement.setAttribute("dir", "rtl");
  } else {
    document.documentElement.setAttribute("dir", "ltr");
  }

  // Update DOM translation nodes
  const translationNodes = document.querySelectorAll("[data-i18n]");
  translationNodes.forEach(node => {
    const key = node.getAttribute("data-i18n");
    if (i18n[lang] && i18n[lang][key]) {
      if (node.tagName === "INPUT" || node.tagName === "TEXTAREA") {
        node.setAttribute("placeholder", i18n[lang][key]);
      } else {
        node.innerHTML = i18n[lang][key];
      }
    }
  });
}

// Sync Navigation Bar for Logged in / Logged out states
async function updateNavAuthenticationStates() {
  const authNav = document.getElementById("auth-nav-action");
  if (!authNav) return;

  const role = localStorage.getItem('user_role');

  if (role === 'admin') {
    authNav.innerHTML = `
      <a href="/admin/index.html" class="btn btn-secondary" style="font-weight:600;margin-right:10px;"><i class="fas fa-toolbox"></i> Admin Panel</a>
      <button onclick="handleLogout()" class="btn btn-icon" title="Logout"><i class="fas fa-sign-out-alt"></i></button>
    `;
  } else {
    authNav.innerHTML = `
      <a href="/login.html" class="btn btn-primary" data-i18n="nav_login">Login</a>
    `;
  }
}

// Global logout handler triggered by inline buttons
async function handleLogout() {
  if (window.supabaseAuth) {
    const res = await window.supabaseAuth.signOut();
    if (res.success) {
      showToast("Logged out successfully", "success");
      setTimeout(() => {
        window.location.href = "/index.html";
      }, 1000);
    } else {
      showToast(res.error, "error");
    }
  }
}

// Bind contact form if present
document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("contact-name").value.trim();
      const email = document.getElementById("contact-email").value.trim();
      const subject = document.getElementById("contact-subject").value.trim();
      const message = document.getElementById("contact-message").value.trim();
      const submitBtn = e.target.querySelector("button[type='submit']");
      
      if (!name || !email || !subject || !message) {
        showToast("Please fill in all fields", "warning");
        return;
      }
      
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      }
      
      const res = await window.supabaseDb.sendContactMessage(name, email, subject, message);
      if (res.success) {
        showToast("Message sent successfully! Thank you.", "success");
        contactForm.reset();
      } else {
        showToast("Error: " + res.error, "error");
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    });
  }
});

// TOAST NOTIFICATION ENGINE
function showToast(message, type = "info") {
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let iconClass = "fa-info-circle";
  if (type === "success") iconClass = "fa-check-circle";
  if (type === "error") iconClass = "fa-exclamation-circle";
  if (type === "warning") iconClass = "fa-exclamation-triangle";

  toast.innerHTML = `
    <i class="fas ${iconClass}"></i>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Auto remove toast
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// PWA Service Worker Registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered successfully!', reg.scope))
      .catch(err => console.warn('Service Worker registration failed:', err));
  }
}

// Export functions to global window object
window.showToast = showToast;
window.handleLogout = handleLogout;
window.updateNavAuthenticationStates = updateNavAuthenticationStates;
