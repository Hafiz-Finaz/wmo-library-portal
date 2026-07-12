// Supabase Authentication Helper Logic

const supabaseAuth = {
  // Sign up a new user
  async signUp(email, password, fullName, phone, role = 'student') {
    try {
      const { data, error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: role
          }
        }
      });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Signup error:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Login a user
  async signIn(email, password) {
    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });
      if (error) throw error;
      return { success: true, session: data.session, user: data.user };
    } catch (error) {
      console.error("Login error:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Log out current user
  async signOut() {
    try {
      const { error } = await window.supabaseClient.auth.signOut();
      if (error) throw error;
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_name');
      return { success: true };
    } catch (error) {
      console.error("Signout error:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Password reset request
  async resetPassword(email) {
    try {
      const { data, error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login.html?type=recovery'
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Password reset error:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Update password
  async updatePassword(newPassword) {
    try {
      const { data, error } = await window.supabaseClient.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Password update error:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Update profile metadata
  async updateProfile(fullName, phone, profileImageUrl = null) {
    try {
      const userRes = await window.supabaseClient.auth.getUser();
      if (userRes.error) throw userRes.error;
      const user = userRes.data.user;

      const updates = {
        id: user.id,
        full_name: fullName,
        phone: phone,
        updated_at: new Date()
      };

      if (profileImageUrl) {
        updates.profile_image = profileImageUrl;
      }

      const { data, error } = await window.supabaseClient
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Update auth user meta data as well
      await window.supabaseClient.auth.updateUser({
        data: { full_name: fullName, phone: phone }
      });

      localStorage.setItem('user_name', fullName);

      return { success: true, data };
    } catch (error) {
      console.error("Profile update error:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Get current user and database profile
  async getCurrentUser() {
    try {
      const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
      if (authError || !user) return null;

      // Fetch profile from public.users table
      const { data: profile, error: dbError } = await window.supabaseClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (dbError) {
        console.warn("DB user profile not found, syncing from auth user metadata.");
        return {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'Guest User',
          phone: user.user_metadata?.phone || '',
          role: user.user_metadata?.role || 'student'
        };
      }

      // Store in localStorage for fast synchronous checks
      localStorage.setItem('user_role', profile.role);
      localStorage.setItem('user_name', profile.full_name);

      return { ...user, ...profile };
    } catch (error) {
      console.error("Get user error:", error.message);
      return null;
    }
  },

  // Check if current user has access, otherwise redirect
  async requireAuth(allowedRoles = []) {
    const user = await this.getCurrentUser();
    if (!user) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      if (user.role === 'admin' || user.role === 'librarian') {
        window.location.href = '/admin/index.html';
      } else {
        window.location.href = '/dashboard.html?error=unauthorized';
      }
      return null;
    }

    return user;
  }
};

window.supabaseAuth = supabaseAuth;
