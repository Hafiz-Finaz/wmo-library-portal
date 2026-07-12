# WMO Imam Gazzali Academy Library Council - Digital Library Portal

A responsive, fast, and modern Digital Library Management System built with HTML5, CSS3, Vanilla JavaScript, and Supabase. Optimized for deployment on GitHub and Vercel.

---

## Features
- **Modern Theme**: Glassmorphic UI, smooth CSS transitions, and fully responsive grid layouts (desktop, tablet, mobile).
- **Persistent Dark/Light Mode**: Easily toggle theme with local state saved in `localStorage`.
- **Multi-language Support**: Seamless toggle between English, Malayalam, and Arabic (RTL support enabled).
- **Supabase Integration**: Serverless PostgreSQL database, Supabase Auth integration, and public file uploads.
- **PWA Ready**: Offline fallback capability and service worker asset caching.
- **Academic Features**: Digital PDF reader inside browser, download counter, rating & reviews, wishlist, and QR codes for book details.
- **Separate Admin Portal**: Fully-featured dashboard with Chart.js statistics, inventory CRUD, borrow request approvals, database backups, and CSV reporting.

---

## Supabase Setup Instructions

1. **Create Supabase Project**:
   - Go to [Supabase Console](https://supabase.com/) and create a new project.
2. **Execute Database Setup**:
   - Navigate to the **SQL Editor** tab in your Supabase dashboard.
   - Click "New Query", paste the entire contents of [supabase/setup.sql](file:///c:/Users/IGA/Videos/Library%20Site/supabase/setup.sql), and click **Run**.
3. **Configure Storage Buckets**:
   - Navigate to the **Storage** tab in Supabase.
   - Create two public buckets:
     1. **`covers`** (for book cover images).
     2. **`pdfs`** (for book PDF documents).
   - Set the bucket privacy toggle to **Public** so the browser can download/preview URLs.
4. **Copy API Keys**:
   - Navigate to **Project Settings** > **API**.
   - Copy the `Project URL` and `anon public` key.

---

## Local Development Setup

1. **Environment Variables**:
   - Create a file named `.env` in the root of the project.
   - Add your Supabase credentials:
     ```env
     SUPABASE_URL=https://your-project-id.supabase.co
     SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```
2. **Run Config Build**:
   - Run the zero-dependency build script in your terminal:
     ```bash
     node build.js
     ```
   - This compiles and generates `supabase/config.js` with your active keys.
3. **Run Locally**:
   - Open `index.html` in any browser or launch it using a VS Code Live Server extension.

---

## GitHub + Vercel Deployment

1. **Push to GitHub**:
   - Create a new repository on GitHub and push the codebase.
2. **Import to Vercel**:
   - Log in to your [Vercel Dashboard](https://vercel.com/) and click **Add New** > **Project**.
   - Import the GitHub repository.
3. **Configure Environment Variables**:
   - Under the **Environment Variables** accordion, add:
     - `SUPABASE_URL` = Your Supabase Project URL
     - `SUPABASE_ANON_KEY` = Your Supabase anon public API Key
4. **Configure Build Settings**:
   - Set the **Build Command** to: `node build.js`
   - Set the **Output Directory** to: `.` (representing the root directory)
5. **Deploy**:
   - Click **Deploy**. Vercel will build the configurations and deploy the portal online.

---

## Folder Structure
```
LibraryHub/
├── index.html            # Home page (Hero, Stats, Trending, announcements)
├── about.html            # Academy vision & FAQ sections
├── books.html            # Library catalog browser with advanced filters
├── categories.html      # Subjects directory
├── contact.html          # Contact form submitting directly to Supabase
├── login.html            # Authentication (Sign in, reset password recovery)
├── register.html         # Sign up (Roles: Student, Guest, Admin)
├── dashboard.html        # Scholar dashboard (Borrows list, notifications, wishlist)
├── profile.html          # Profile management & profile photo upload
├── admin/
│   ├── index.html        # Admin portal dashboard stats & Chart.js graphics
│   ├── books.html        # Book CRUD, uploads, borrow actions approvals
│   ├── users.html        # Member account status & role toggles
│   ├── categories.html  # Create/delete subjects
│   ├── reports.html      # CSV export and DB backup tools
│   ├── settings.html     # System parameters configurations
├── css/
│   ├── style.css         # Core CSS design system
│   ├── admin.css         # Admin console styles
│   ├── responsive.css    # Responsive media queries & RTL configurations
├── js/
│   ├── app.js            # Main global engine (Themes, lang, SW)
│   ├── auth.js           # Auth forms handlers
│   ├── books.js          # Book cards, wishlist, reviews, PDF modal
│   ├── search.js         # Catalog filter debouncing & paginators
│   ├── dashboard.js      # Profile forms & borrow history grids
│   ├── admin.js          # Admin CRUD actions, Chart.js loaders
├── assets/
│   └── logo/
│       └── logo.svg      # Clean vector book logo asset
└── supabase/
    ├── setup.sql         # Postgres tables structure script
    ├── config.js         # Injected client parameters
    ├── auth.js           # Auth helper API
    └── database.js       # Database helper queries API
```
