-- SUPABASE SQL SETUP SCRIPT
-- Run this script in the Supabase SQL Editor to set up tables, triggers, and Row Level Security (RLS).

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) NOT NULL DEFAULT 'fa-book',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS TABLE (Public profile synced with Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150),
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'librarian', 'student', 'guest')),
    profile_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BOOKS TABLE
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(150) NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    isbn VARCHAR(20) UNIQUE,
    publisher VARCHAR(150),
    publication_year INTEGER,
    language VARCHAR(50) DEFAULT 'English',
    description TEXT,
    cover_image TEXT, -- Storage URL
    pdf_url TEXT,     -- Storage URL
    available_quantity INTEGER NOT NULL DEFAULT 1,
    total_quantity INTEGER NOT NULL DEFAULT 1,
    shelf_location VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'out_of_stock', 'archived')),
    downloads INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT qty_check CHECK (available_quantity <= total_quantity AND available_quantity >= 0)
);

-- 4. BORROWED BOOKS TABLE
CREATE TABLE IF NOT EXISTS public.borrowed_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    borrowed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    returned_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'returned', 'overdue')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CONTACT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BOOK REVIEWS TABLE (Extra Feature)
CREATE TABLE IF NOT EXISTS public.book_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (book_id, user_id)
);

-- 8. WISHLIST TABLE (Extra Feature)
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, book_id)
);

-- 9. NOTIFICATIONS TABLE (Extra Feature)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SYSTEM SETTINGS TABLE (Extra Feature)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL
);

-- Seed basic settings
INSERT INTO public.system_settings (key, value) VALUES
('library_name', 'WMO Imam Gazzali Academy Library Council'),
('max_borrow_limit', '3'),
('borrow_duration_days', '14')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowed_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- RLS POLICIES
-- ----------------------------------------------------

-- Categories Policies
CREATE POLICY "Allow public read-only access to categories" ON public.categories
    FOR SELECT USING (true);
CREATE POLICY "Allow admin/librarian insert to categories" ON public.categories
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'librarian'))
    );
CREATE POLICY "Allow admin/librarian update to categories" ON public.categories
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'librarian'))
    );
CREATE POLICY "Allow admin/librarian delete to categories" ON public.categories
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'librarian'))
    );

-- Users Policies
CREATE POLICY "Allow users to read all profiles" ON public.users
    FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow admin to manage all user accounts" ON public.users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Books Policies
CREATE POLICY "Allow public read-only access to books" ON public.books
    FOR SELECT USING (true);
CREATE POLICY "Allow admin/librarian to manage books" ON public.books
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'librarian'))
    );

-- Borrowed Books Policies
CREATE POLICY "Allow users to view own borrows" ON public.borrowed_books
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'librarian')));
CREATE POLICY "Allow users to request borrow (insert)" ON public.borrowed_books
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow admin/librarian to update borrows" ON public.borrowed_books
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'librarian'))
    );

-- Announcements Policies
CREATE POLICY "Allow public read-only access to announcements" ON public.announcements
    FOR SELECT USING (true);
CREATE POLICY "Allow admin/librarian to manage announcements" ON public.announcements
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'librarian'))
    );

-- Contact Messages Policies
CREATE POLICY "Allow anyone to insert contact messages" ON public.contact_messages
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin/librarian to read/manage contact messages" ON public.contact_messages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'librarian'))
    );

-- Book Reviews Policies
CREATE POLICY "Allow anyone to read reviews" ON public.book_reviews
    FOR SELECT USING (true);
CREATE POLICY "Allow logged in users to write reviews" ON public.book_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to edit/delete own reviews" ON public.book_reviews
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow admin to manage all reviews" ON public.book_reviews
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'librarian'))
    );

-- Wishlist Policies
CREATE POLICY "Allow users to view own wishlist" ON public.wishlist
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to manage own wishlist" ON public.wishlist
    FOR ALL USING (auth.uid() = user_id);

-- Notifications Policies
CREATE POLICY "Allow users to view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to update own notifications (mark read)" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow system/admin to insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- System Settings Policies
CREATE POLICY "Allow public to read settings" ON public.system_settings
    FOR SELECT USING (true);
CREATE POLICY "Allow admin to update settings" ON public.system_settings
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- ----------------------------------------------------
-- TRIGGER FOR SYNCING AUTH USERS WITH PUBLIC USERS
-- ----------------------------------------------------

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract values from raw_user_meta_data if present, fallback to defaults
  INSERT INTO public.users (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run handle_new_user on insert to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------
-- STORAGE BUCKETS (INSTRUCTIONS IN SQL FOR REFERENCE)
-- ----------------------------------------------------
-- Note: Create two public storage buckets in the Supabase console:
-- 1. 'covers' - For book cover images.
-- 2. 'pdfs' - For digital books PDF files.
-- Set appropriate access controls: Select (Public), Insert/Update/Delete (Authenticated with admin/librarian role).

-- ----------------------------------------------------
-- SEED DATA (INITIAL DATA INJECTION)
-- ----------------------------------------------------

-- Seed categories
INSERT INTO public.categories (id, category_name, icon) VALUES
('c0000000-0000-0000-0000-000000000001', 'Theology & Philosophy', 'fa-book-open'),
('c0000000-0000-0000-0000-000000000002', 'Islamic History', 'fa-monument'),
('c0000000-0000-0000-0000-000000000003', 'Science & Technology', 'fa-laptop-code'),
('c0000000-0000-0000-0000-000000000004', 'Malayalam Literature', 'fa-feather-alt'),
('c0000000-0000-0000-0000-000000000005', 'Arabic Literature', 'fa-globe-asia'),
('c0000000-0000-0000-0000-000000000006', 'General Knowledge', 'fa-compass'),
('c0000000-0000-0000-0000-000000000007', 'Research Papers & Journals', 'fa-graduation-cap')
ON CONFLICT (id) DO NOTHING;

-- Seed books
INSERT INTO public.books (id, title, author, category_id, isbn, publisher, publication_year, language, description, cover_image, pdf_url, available_quantity, total_quantity, shelf_location, status, downloads) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'The Alchemy of Happiness',
  'Al-Ghazali',
  'c0000000-0000-0000-0000-000000000001',
  '978-1597310031',
  'The Islamic Texts Society',
  2002,
  'English',
  'A classic treatise on Sufi psychology and theology, exploring the path to spiritual fulfillment and knowledge of self and the Divine.',
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
  null,
  2,
  2,
  'A1-Shelf-3',
  'available',
  18
),
(
  'b0000000-0000-0000-0000-000000000002',
  'Ihya Ulum al-Din (Arabic)',
  'Al-Ghazali',
  'c0000000-0000-0000-0000-000000000001',
  '978-2745100000',
  'Dar Al-Kotob Al-Ilmiyah',
  1998,
  'Arabic',
  'The Revival of the Religious Sciences is widely regarded as the greatest work of Muslim spirituality and theology.',
  'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=400',
  null,
  1,
  1,
  'A1-Shelf-4',
  'available',
  24
),
(
  'b0000000-0000-0000-0000-000000000003',
  'Introduction to Algorithms',
  'Thomas H. Cormen',
  'c0000000-0000-0000-0000-000000000003',
  '978-0262033848',
  'MIT Press',
  2009,
  'English',
  'The standard reference text for algorithms, providing a comprehensive guide to data structures, algorithms design, and analysis.',
  'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&q=80&w=400',
  null,
  3,
  3,
  'C2-Shelf-1',
  'available',
  42
),
(
  'b0000000-0000-0000-0000-000000000004',
  'Aadujeevitham (Goat Days)',
  'Benyamin',
  'c0000000-0000-0000-0000-000000000004',
  '978-8126422739',
  'Green Books',
  2008,
  'Malayalam',
  'The poignant story of Najeeb, an Indian emigrant worker, who is forced into slavery as a goat herd in the remote deserts of Saudi Arabia.',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400',
  null,
  2,
  2,
  'D1-Shelf-2',
  'available',
  56
),
(
  'b0000000-0000-0000-0000-000000000005',
  'A Brief History of Time',
  'Stephen Hawking',
  'c0000000-0000-0000-0000-000000000003',
  '978-0553380163',
  'Bantam Books',
  1998,
  'English',
  'Hawking writes in non-technical terms about the structure, origin, development, and eventual fate of the universe.',
  'https://images.unsplash.com/photo-1618666012174-83b441c0bc76?auto=format&fit=crop&q=80&w=400',
  null,
  2,
  2,
  'C2-Shelf-2',
  'available',
  35
)
ON CONFLICT (id) DO NOTHING;

-- Seed announcements
INSERT INTO public.announcements (id, title, content, image) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  'Digital Library Portal Launched!',
  'WMO Imam Gazzali Academy Library Council is proud to launch its state-of-the-art Digital Library Management Portal. Scholars can now search the catalog, view real-time shelf availability, check borrowing rules, and read digital E-Books directly.',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600'
),
(
  'a0000000-0000-0000-0000-000000000002',
  'WMO Academy Book Fair 2026',
  'Join us for the Annual WMO Academy Book Fair on August 15-20, 2026. Major academic publishers will display textbooks, historical references, and regional literary works with student discounts.',
  'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=600'
)
ON CONFLICT (id) DO NOTHING;

