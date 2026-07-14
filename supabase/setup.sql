-- SUPABASE SQL SETUP SCRIPT
-- Run this script in the Supabase SQL Editor to set up tables, triggers, and Row Level Security (RLS) for the Digital Library Portal.

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
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
    profile_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BOOKS TABLE (Digital library layout)
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    author VARCHAR(150) NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    isbn VARCHAR(20) UNIQUE,
    publisher VARCHAR(150),
    publication_year INTEGER,
    edition VARCHAR(50),
    pages INTEGER,
    file_size VARCHAR(50),
    language VARCHAR(50) DEFAULT 'English',
    description TEXT,
    tags TEXT, -- Comma-separated list of tags
    cover_image TEXT, -- Storage URL
    pdf_url TEXT,     -- Storage URL
    featured BOOLEAN DEFAULT FALSE,
    downloads INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'archived')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CONTACT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL
);

-- Seed basic settings
INSERT INTO public.system_settings (key, value) VALUES
('library_name', 'WMO Imam Gazzali Academy Library Council')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- RLS POLICIES
-- ----------------------------------------------------

-- Categories Policies
CREATE POLICY "Allow public read-only access to categories" ON public.categories
    FOR SELECT USING (true);
CREATE POLICY "Allow admin insert to categories" ON public.categories
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );
CREATE POLICY "Allow admin update to categories" ON public.categories
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );
CREATE POLICY "Allow admin delete to categories" ON public.categories
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
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
CREATE POLICY "Allow admin to manage books" ON public.books
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Announcements Policies
CREATE POLICY "Allow public read-only access to announcements" ON public.announcements
    FOR SELECT USING (true);
CREATE POLICY "Allow admin to manage announcements" ON public.announcements
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Contact Messages Policies
CREATE POLICY "Allow anyone to insert contact messages" ON public.contact_messages
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin to read/manage contact messages" ON public.contact_messages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

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
  INSERT INTO public.users (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    CASE
      WHEN NEW.email = 'igalibrary@gmail.com' THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run handle_new_user on insert to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------
-- STORAGE BUCKETS (INSTRUCTIONS)
-- ----------------------------------------------------
-- Note: Create two public storage buckets in the Supabase console:
-- 1. 'covers' - For book cover images.
-- 2. 'pdfs' - For digital books PDF files.
-- Set appropriate access controls: Select (Public), Insert/Update/Delete (Authenticated with admin role).

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
INSERT INTO public.books (id, title, subtitle, author, category_id, isbn, publisher, publication_year, edition, pages, file_size, language, description, tags, cover_image, pdf_url, featured, downloads, views) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'The Alchemy of Happiness',
  'Kimiya-yi Sa''adat',
  'Al-Ghazali',
  'c0000000-0000-0000-0000-000000000001',
  '978-1597310031',
  'The Islamic Texts Society',
  2002,
  '1st Edition',
  320,
  '1.2 MB',
  'English',
  'A classic treatise on Sufi psychology and theology, exploring the path to spiritual fulfillment and knowledge of self and the Divine.',
  'sufism, philosophy, spirituality',
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
  null,
  true,
  18,
  125
),
(
  'b0000000-0000-0000-0000-000000000002',
  'Ihya Ulum al-Din (Arabic)',
  'Revival of religious sciences',
  'Al-Ghazali',
  'c0000000-0000-0000-0000-000000000001',
  '978-2745100000',
  'Dar Al-Kotob Al-Ilmiyah',
  1998,
  'Dar Al-Kotob Edition',
  1240,
  '8.5 MB',
  'Arabic',
  'The Revival of the Religious Sciences is widely regarded as the greatest work of Muslim spirituality and theology.',
  'theology, jurisprudence, spirituality',
  'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=400',
  null,
  true,
  24,
  180
),
(
  'b0000000-0000-0000-0000-000000000003',
  'Introduction to Algorithms',
  'Core Computer Science Algorithms Guide',
  'Thomas H. Cormen',
  'c0000000-0000-0000-0000-000000000003',
  '978-0262033848',
  'MIT Press',
  2009,
  '3rd Edition',
  1292,
  '12.4 MB',
  'English',
  'The standard reference text for algorithms, providing a comprehensive guide to data structures, algorithms design, and analysis.',
  'algorithms, programming, computer-science',
  'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&q=80&w=400',
  null,
  false,
  42,
  290
),
(
  'b0000000-0000-0000-0000-000000000004',
  'Aadujeevitham (Goat Days)',
  'A Novel of Exile and Survival',
  'Benyamin',
  'c0000000-0000-0000-0000-000000000004',
  '978-8126422739',
  'Green Books',
  2008,
  '10th Reprint',
  250,
  '2.1 MB',
  'Malayalam',
  'The poignant story of Najeeb, an Indian emigrant worker, who is forced into slavery as a goat herd in the remote deserts of Saudi Arabia.',
  'fiction, survival, malayalam-novel',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400',
  null,
  true,
  56,
  340
),
(
  'b0000000-0000-0000-0000-000000000005',
  'A Brief History of Time',
  'From the Big Bang to Black Holes',
  'Stephen Hawking',
  'c0000000-0000-0000-0000-000000000003',
  '978-0553380163',
  'Bantam Books',
  1998,
  'Updated Edition',
  220,
  '1.8 MB',
  'English',
  'Hawking writes in non-technical terms about the structure, origin, development, and eventual fate of the universe.',
  'cosmology, physics, science',
  'https://images.unsplash.com/photo-1618666012174-83b441c0bc76?auto=format&fit=crop&q=80&w=400',
  null,
  false,
  35,
  210
)
ON CONFLICT (id) DO NOTHING;

-- Seed announcements
INSERT INTO public.announcements (id, title, content, image) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  'Digital Library Portal Launched!',
  'WMO Imam Gazzali Academy Library Council is proud to launch its state-of-the-art Digital Library Management Portal. Scholars can now search the catalog, view book details, read digital E-Books, and download materials directly.',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600'
),
(
  'a0000000-0000-0000-0000-000000000002',
  'WMO Academy Book Fair 2026',
  'Join us for the Annual WMO Academy Book Fair on August 15-20, 2026. Major academic publishers will display textbooks, historical references, and regional literary works with student discounts.',
  'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=600'
)
ON CONFLICT (id) DO NOTHING;

-- Ensure igalibrary@gmail.com is set as administrator
UPDATE public.users
SET role = 'admin'
WHERE email = 'igalibrary@gmail.com';

-- 7. BORROWS TABLE
CREATE TABLE IF NOT EXISTS public.borrows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    borrowed_date TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    returned_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'returned', 'overdue')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WISHLIST TABLE
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.borrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Borrows Policies
CREATE POLICY "Allow users to read own borrows" ON public.borrows
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert borrow requests" ON public.borrows
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow admin to manage all borrows" ON public.borrows
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- Wishlist Policies
CREATE POLICY "Allow users to manage own wishlist" ON public.wishlist
    FOR ALL USING (auth.uid() = user_id);

-- Notifications Policies
CREATE POLICY "Allow users to manage own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);


