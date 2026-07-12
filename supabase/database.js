// Supabase Database Helper Logic

const supabaseDb = {
  // --- CATEGORIES ---
  async getCategories() {
    try {
      const { data, error } = await window.supabaseClient
        .from('categories')
        .select('*')
        .order('category_name', { ascending: true });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching categories:", error.message);
      return [];
    }
  },

  // --- BOOKS ---
  async getBooks({ search = '', categoryId = null, language = '', author = '', sortBy = 'title', order = 'asc', page = 1, limit = 12 } = {}) {
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
      if (search) {
        query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,isbn.ilike.%${search}%,publisher.ilike.%${search}%`);
      }

      // Hide archived books for public
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

  // --- BORROW SYSTEM ---
  async requestBorrow(bookId, userId, durationDays = 14) {
    try {
      // 1. Check if user already borrowed this book and it's active
      const { data: existing, error: checkError } = await window.supabaseClient
        .from('borrowed_books')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .in('status', ['pending', 'approved', 'overdue']);

      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        return { success: false, error: "You already have a pending or active borrow request for this book." };
      }

      // 2. Check book availability
      const book = await this.getBookDetails(bookId);
      if (!book || book.available_quantity <= 0 || book.status !== 'available') {
        return { success: false, error: "This book is currently out of stock or unavailable." };
      }

      // 3. Check user borrow limits
      const { count: activeBorrows, error: limitError } = await window.supabaseClient
        .from('borrowed_books')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['approved', 'overdue']);

      if (limitError) throw limitError;
      const maxLimit = await this.getSystemSetting('max_borrow_limit', '3');
      if (activeBorrows >= parseInt(maxLimit)) {
        return { success: false, error: `You have reached your maximum active borrowing limit (${maxLimit} books).` };
      }

      // 4. Create borrow entry
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + parseInt(durationDays));

      const { data, error } = await window.supabaseClient
        .from('borrowed_books')
        .insert({
          user_id: userId,
          book_id: bookId,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'pending'
        })
        .select();

      if (error) throw error;

      // Create system notification for admins/librarians (optional, but let's notify user too)
      await this.createNotification(userId, "Borrow Request Submitted", `Your request to borrow "${book.title}" is pending approval.`);

      return { success: true, borrow: data[0] };
    } catch (error) {
      console.error("Borrow request error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getUserBorrows(userId) {
    try {
      const { data, error } = await window.supabaseClient
        .from('borrowed_books')
        .select('*, books(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching user borrows:", error.message);
      return [];
    }
  },

  // --- REVIEWS & WISHLIST ---
  async getBookReviews(bookId) {
    try {
      const { data, error } = await window.supabaseClient
        .from('book_reviews')
        .select('*, users(full_name, profile_image)')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching reviews:", error.message);
      return [];
    }
  },

  async addReview(bookId, userId, rating, reviewText) {
    try {
      const { data, error } = await window.supabaseClient
        .from('book_reviews')
        .upsert({ book_id: bookId, user_id: userId, rating, review_text: reviewText })
        .select();
      if (error) throw error;
      return { success: true, review: data[0] };
    } catch (error) {
      console.error("Error adding review:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getWishlist(userId) {
    try {
      const { data, error } = await window.supabaseClient
        .from('wishlist')
        .select('*, books(*)')
        .eq('user_id', userId);
      if (error) throw error;
      return data.map(item => item.books).filter(book => book !== null);
    } catch (error) {
      console.error("Error fetching wishlist:", error.message);
      return [];
    }
  },

  async toggleWishlist(userId, bookId) {
    try {
      const { data: existing, error: checkError } = await window.supabaseClient
        .from('wishlist')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        // Remove
        const { error: deleteError } = await window.supabaseClient
          .from('wishlist')
          .delete()
          .eq('user_id', userId)
          .eq('book_id', bookId);
        if (deleteError) throw deleteError;
        return { success: true, action: 'removed' };
      } else {
        // Add
        const { error: insertError } = await window.supabaseClient
          .from('wishlist')
          .insert({ user_id: userId, book_id: bookId });
        if (insertError) throw insertError;
        return { success: true, action: 'added' };
      }
    } catch (error) {
      console.error("Wishlist toggle error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async isWishlisted(userId, bookId) {
    try {
      const { data, error } = await window.supabaseClient
        .from('wishlist')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId);
      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      return false;
    }
  },

  // --- ANNOUNCEMENTS & MESSAGES ---
  async getAnnouncements(limit = 5) {
    try {
      const { data, error } = await window.supabaseClient
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching announcements:", error.message);
      return [];
    }
  },

  async sendContactMessage(name, email, subject, message) {
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

  // --- NOTIFICATIONS ---
  async getNotifications(userId) {
    try {
      const { data, error } = await window.supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching notifications:", error.message);
      return [];
    }
  },

  async markNotificationRead(notificationId) {
    try {
      const { error } = await window.supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
      return true;
    } catch (error) {
      return false;
    }
  },

  async createNotification(userId, title, message) {
    try {
      const { error } = await window.supabaseClient
        .from('notifications')
        .insert({ user_id: userId, title, message });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error creating notification:", error.message);
      return false;
    }
  },

  // --- SYSTEM SETTINGS ---
  async getSystemSetting(key, defaultValue = '') {
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

  // --- COUNTERS ---
  async incrementDownload(bookId) {
    try {
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
  }
};

window.supabaseDb = supabaseDb;
