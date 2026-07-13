// Supabase Database Helper Logic

// MOCK SEED DATA FOR OFFLINE DEVELOPMENT MODE
const MOCK_CATEGORIES = [
  { id: '1', category_name: 'Theology', icon: 'fa-bible' },
  { id: '2', category_name: 'History', icon: 'fa-landmark' },
  { id: '3', category_name: 'Science', icon: 'fa-flask' },
  { id: '4', category_name: 'Languages', icon: 'fa-language' }
];

const MOCK_BOOKS = [
  {
    id: '101',
    title: 'The Guidance of the Soul',
    subtitle: 'Ihya Ulum al-Din Selection',
    author: 'Imam al-Ghazali',
    category_id: '1',
    isbn: '978-0935782516',
    publisher: 'Fons Vitae',
    publication_year: 2005,
    edition: '2nd Edition',
    pages: 412,
    file_size: '3.4 MB',
    language: 'English',
    status: 'available',
    tags: 'theology, philosophy, spirituality',
    featured: true,
    views: 142,
    downloads: 57,
    description: 'A masterpiece on Islamic theology and spirituality, focusing on inner self-purification and ethical guidance.',
    cover_image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: '102',
    title: 'Medieval Wayanad',
    subtitle: 'A Regional Historiography',
    author: 'K. R. Menon',
    category_id: '2',
    isbn: '978-8120612984',
    publisher: 'Asian Educational Services',
    publication_year: 1998,
    edition: '1st Edition',
    pages: 285,
    file_size: '4.1 MB',
    language: 'English',
    status: 'available',
    tags: 'history, regional, kerala',
    featured: true,
    views: 89,
    downloads: 24,
    description: 'An in-depth study of the historical changes, trade guilds, and social structure of medieval Wayanad, Kerala.',
    cover_image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400',
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: '103',
    title: 'Modern Physics',
    subtitle: 'For Undergraduates',
    author: 'Dr. A. P. J. Abdul Kalam',
    category_id: '3',
    isbn: '978-8173711466',
    publisher: 'Universities Press',
    publication_year: 2012,
    edition: '3rd Edition',
    pages: 512,
    file_size: '6.2 MB',
    language: 'English',
    status: 'available',
    tags: 'physics, science, academic',
    featured: false,
    views: 241,
    downloads: 88,
    description: 'A comprehensive academic textbook explaining concepts of modern physics, quantum mechanics, and space science.',
    cover_image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=400',
    pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];

// Initialize Mock Data in LocalStorage if not exists
if (window.useMockData) {
  if (!localStorage.getItem('mock_categories')) {
    localStorage.setItem('mock_categories', JSON.stringify(MOCK_CATEGORIES));
  }
  if (!localStorage.getItem('mock_books')) {
    localStorage.setItem('mock_books', JSON.stringify(MOCK_BOOKS));
  }
  if (!localStorage.getItem('mock_messages')) {
    localStorage.setItem('mock_messages', JSON.stringify([]));
  }
}

const supabaseDb = {
  // --- CATEGORIES ---
  async getCategories() {
    if (window.useMockData) {
      return JSON.parse(localStorage.getItem('mock_categories') || '[]');
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching categories:", error.message);
      return [];
    }
  },

  // --- BOOKS ---
  async getBooks({ search = '', categoryId = null, language = '', author = '', sortBy = 'title', order = 'asc', page = 1, limit = 12, featured = null } = {}) {
    if (window.useMockData) {
      let books = JSON.parse(localStorage.getItem('mock_books') || '[]');
      const categories = JSON.parse(localStorage.getItem('mock_categories') || '[]');

      // Attach categories names
      books = books.map(b => ({
        ...b,
        categories: categories.find(c => c.id === b.category_id) || { category_name: 'General' }
      }));

      // Apply filters
      if (categoryId && categoryId !== 'all') {
        books = books.filter(b => b.category_id === categoryId);
      }
      if (language && language !== 'all') {
        books = books.filter(b => b.language === language);
      }
      if (author) {
        books = books.filter(b => b.author.toLowerCase().includes(author.toLowerCase()));
      }
      if (featured !== null) {
        books = books.filter(b => b.featured === featured);
      }
      if (search) {
        const query = search.toLowerCase();
        books = books.filter(b => 
          b.title.toLowerCase().includes(query) ||
          (b.subtitle && b.subtitle.toLowerCase().includes(query)) ||
          b.author.toLowerCase().includes(query) ||
          (b.isbn && b.isbn.toLowerCase().includes(query)) ||
          (b.publisher && b.publisher.toLowerCase().includes(query)) ||
          (b.tags && b.tags.toLowerCase().includes(query))
        );
      }

      // Hide archived books
      books = books.filter(b => b.status !== 'archived');

      // Sorting
      books.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
      });

      // Pagination
      const count = books.length;
      const from = (page - 1) * limit;
      const pagedBooks = books.slice(from, from + limit);

      return { books: pagedBooks, total: count };
    }

    try {
      let query = window.supabaseClient
        .from('books')
        .select('*, categories(category_name)', { count: 'exact' });

      // Apply filters
      if (categoryId && categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
      }
      if (language && language !== 'all') {
        query = query.eq('language', language);
      }
      if (author) {
        query = query.ilike('author', `%${author}%`);
      }
      if (featured !== null) {
        query = query.eq('featured', featured);
      }
      if (search) {
        query = query.or(`title.ilike.%${search}%,subtitle.ilike.%${search}%,author.ilike.%${search}%,isbn.ilike.%${search}%,publisher.ilike.%${search}%,tags.ilike.%${search}%`);
      }

      // Hide archived books for public view
      query = query.neq('status', 'archived');

      // Sorting
      let asc = order === 'asc';
      query = query.order(sortBy, { ascending: asc });

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      return { books: data, total: count };
    } catch (error) {
      console.error("Error fetching books:", error.message);
      return { books: [], total: 0 };
    }
  },

  async getBookDetails(bookId) {
    if (window.useMockData) {
      const books = JSON.parse(localStorage.getItem('mock_books') || '[]');
      const categories = JSON.parse(localStorage.getItem('mock_categories') || '[]');
      const book = books.find(b => b.id === bookId);
      if (!book) return null;
      return {
        ...book,
        categories: categories.find(c => c.id === book.category_id) || { category_name: 'General' }
      };
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('books')
        .select('*, categories(category_name)')
        .eq('id', bookId)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching book details:", error.message);
      return null;
    }
  },

  async getRelatedBooks(categoryId, currentBookId, limit = 4) {
    if (window.useMockData) {
      const books = JSON.parse(localStorage.getItem('mock_books') || '[]');
      return books
        .filter(b => b.category_id === categoryId && b.id !== currentBookId && b.status !== 'archived')
        .slice(0, limit);
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('books')
        .select('*')
        .eq('category_id', categoryId)
        .neq('id', currentBookId)
        .neq('status', 'archived')
        .limit(limit);
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching related books:", error.message);
      return [];
    }
  },

  // --- ANNOUNCEMENTS ---
  async getAnnouncements(limit = 5) {
    return []; // announcements no longer used
  },

  // --- CONTACT MESSAGES ---
  async sendContactMessage(name, email, subject, message) {
    if (window.useMockData) {
      const messages = JSON.parse(localStorage.getItem('mock_messages') || '[]');
      messages.push({
        id: String(Date.now()),
        name,
        email,
        subject,
        message,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('mock_messages', JSON.stringify(messages));
      return { success: true };
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('contact_messages')
        .insert({ name, email, subject, message })
        .select();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error sending contact message:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getContactMessages() {
    if (window.useMockData) {
      const messages = JSON.parse(localStorage.getItem('mock_messages') || '[]');
      return messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting contact messages:", error.message);
      return [];
    }
  },

  async deleteContactMessage(messageId) {
    if (window.useMockData) {
      let messages = JSON.parse(localStorage.getItem('mock_messages') || '[]');
      messages = messages.filter(m => m.id !== messageId);
      localStorage.setItem('mock_messages', JSON.stringify(messages));
      return { success: true };
    }

    try {
      const { error } = await window.supabaseClient
        .from('contact_messages')
        .delete()
        .eq('id', messageId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error deleting contact message:", error.message);
      return { success: false, error: error.message };
    }
  },

  // --- SYSTEM SETTINGS ---
  async getSystemSetting(key, defaultValue = '') {
    if (window.useMockData) {
      return localStorage.getItem(`setting_${key}`) || defaultValue;
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();
      if (error) return defaultValue;
      return data.value;
    } catch (error) {
      return defaultValue;
    }
  },

  // --- STORAGE UPLOADS ---
  async uploadFile(bucket, filePath, fileObj) {
    if (window.useMockData) {
      // Mock File Upload (generate a locally loadable image/PDF placeholder)
      if (fileObj.type.startsWith('image/')) {
        return { success: true, url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400' };
      }
      return { success: true, url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' };
    }

    try {
      const { data, error } = await window.supabaseClient.storage
        .from(bucket)
        .upload(filePath, fileObj, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = window.supabaseClient.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error("File upload error:", error.message);
      return { success: false, error: error.message };
    }
  },

  // --- VIEWS & DOWNLOADS COUNTERS ---
  async incrementBookViews(bookId) {
    if (window.useMockData) {
      const books = JSON.parse(localStorage.getItem('mock_books') || '[]');
      const idx = books.findIndex(b => b.id === bookId);
      if (idx !== -1) {
        books[idx].views = (books[idx].views || 0) + 1;
        localStorage.setItem('mock_books', JSON.stringify(books));
      }
      return true;
    }

    try {
      // Fetch current view count
      const { data: book, error: fetchErr } = await window.supabaseClient
        .from('books')
        .select('views')
        .eq('id', bookId)
        .single();

      if (fetchErr) throw fetchErr;

      const { error: updateErr } = await window.supabaseClient
        .from('books')
        .update({ views: (book.views || 0) + 1 })
        .eq('id', bookId);

      if (updateErr) throw updateErr;
      return true;
    } catch (error) {
      console.error("Increment views error:", error.message);
      return false;
    }
  },

  async incrementBookDownloads(bookId) {
    if (window.useMockData) {
      const books = JSON.parse(localStorage.getItem('mock_books') || '[]');
      const idx = books.findIndex(b => b.id === bookId);
      if (idx !== -1) {
        books[idx].downloads = (books[idx].downloads || 0) + 1;
        localStorage.setItem('mock_books', JSON.stringify(books));
      }
      return true;
    }

    try {
      // Fetch current download count
      const { data: book, error: fetchErr } = await window.supabaseClient
        .from('books')
        .select('downloads')
        .eq('id', bookId)
        .single();

      if (fetchErr) throw fetchErr;

      const { error: updateErr } = await window.supabaseClient
        .from('books')
        .update({ downloads: (book.downloads || 0) + 1 })
        .eq('id', bookId);

      if (updateErr) throw updateErr;
      return true;
    } catch (error) {
      console.error("Increment downloads error:", error.message);
      return false;
    }
  },

  async saveBook(id, payload) {
    if (window.useMockData) {
      const books = JSON.parse(localStorage.getItem('mock_books') || '[]');
      if (id) {
        // Edit mode
        const idx = books.findIndex(b => b.id === id);
        if (idx !== -1) {
          books[idx] = { ...books[idx], ...payload, updated_at: new Date().toISOString() };
        }
      } else {
        // New mode
        const newBook = {
          ...payload,
          id: String(Date.now()),
          views: 0,
          downloads: 0,
          created_at: new Date().toISOString()
        };
        books.push(newBook);
      }
      localStorage.setItem('mock_books', JSON.stringify(books));
      return { success: true };
    }

    try {
      if (id) {
        const { error } = await window.supabaseClient.from('books').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await window.supabaseClient.from('books').insert(payload);
        if (error) throw error;
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteBook(bookId) {
    if (window.useMockData) {
      let books = JSON.parse(localStorage.getItem('mock_books') || '[]');
      books = books.filter(b => b.id !== bookId);
      localStorage.setItem('mock_books', JSON.stringify(books));
      return { success: true };
    }

    try {
      const { error } = await window.supabaseClient.from('books').delete().eq('id', bookId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async addCategory(name, icon) {
    if (window.useMockData) {
      const categories = JSON.parse(localStorage.getItem('mock_categories') || '[]');
      categories.push({
        id: String(Date.now()),
        category_name: name,
        icon: icon || 'fa-book'
      });
      localStorage.setItem('mock_categories', JSON.stringify(categories));
      return { success: true };
    }

    try {
      const { error } = await window.supabaseClient.from('categories').insert({ category_name: name, icon: icon || 'fa-book' });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteCategory(catId) {
    if (window.useMockData) {
      let categories = JSON.parse(localStorage.getItem('mock_categories') || '[]');
      categories = categories.filter(c => c.id !== catId);
      localStorage.setItem('mock_categories', JSON.stringify(categories));
      return { success: true };
    }

    try {
      const { error } = await window.supabaseClient.from('categories').delete().eq('id', catId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

window.supabaseDb = supabaseDb;
