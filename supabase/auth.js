// Supabase Authentication Helper Logic

const supabaseAuth = {
  // Login a user
  async signIn(email, password) {
    if (window.useMockData) {
      // Mock login for developer testing
      if ((email === 'admin@wmoigacademy.com' || email === 'igalibrary@gmail.com') && password === 'admin123') {
        localStorage.setItem('user_role', 'admin');
        localStorage.setItem('user_name', email === 'igalibrary@gmail.com' ? 'IGA Library Admin' : 'System Administrator');
        localStorage.setItem('user_email', email);
        localStorage.setItem('mock_session', 'true');
        return { success: true, user: { email, role: 'admin' } };
      } else {
        return { success: false, error: "Invalid credentials in offline mode. Use: admin@wmoigacademy.com or igalibrary@gmail.com / admin123" };
      }
    }

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
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('mock_session');

    if (window.useMockData) {
      return { success: true };
    }

    try {
      const { error } = await window.supabaseClient.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Signout error:", error.message);
      return { success: false, error: error.message };
    }
  },

  // Password reset request
  async resetPassword(email) {
    if (window.useMockData) {
      return { success: true };
    }

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
    if (window.useMockData) {
      return { success: true };
    }

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

  // Get current user and database profile
  async getCurrentUser() {
    if (window.useMockData) {
      const role = localStorage.getItem('user_role');
      const name = localStorage.getItem('user_name');
      const email = localStorage.getItem('user_email') || 'admin@wmoigacademy.com';
      if (role && name) {
        return {
          id: 'mock-admin-id',
          email: email,
          full_name: name,
          role: role
        };
      }
      return null;
    }

    try {
      const { data: { user }, error: authError } = await window.supabaseClient.auth.getUser();
      if (authError || !user) return null;

      // Fetch profile from public.users table
      let { data: profile, error: dbError } = await window.supabaseClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (dbError) {
        console.warn("DB user profile not found, syncing from auth user metadata.");
        const initialRole = user.email === 'igalibrary@gmail.com' ? 'admin' : (user.user_metadata?.role || 'student');
        const newProfile = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Guest User',
          phone: user.user_metadata?.phone || '',
          role: initialRole
        };
        
        try {
          await window.supabaseClient.from('users').insert(newProfile);
        } catch (insertErr) {
          console.error("Error creating user profile in database:", insertErr);
        }
        
        profile = newProfile;
      } else if (user.email === 'igalibrary@gmail.com' && profile.role !== 'admin') {
        // If user is igalibrary@gmail.com but role is not admin in database, update it!
        try {
          const { data: updatedProfile, error: updateErr } = await window.supabaseClient
            .from('users')
            .update({ role: 'admin' })
            .eq('id', user.id)
            .select()
            .single();
          if (!updateErr && updatedProfile) {
            profile = updatedProfile;
          } else {
            profile.role = 'admin';
          }
        } catch (updateErr) {
          console.error("Error updating admin role in DB:", updateErr);
          profile.role = 'admin';
        }
      }

      // Store in localStorage for fast synchronous checks
      const finalRole = user.email === 'igalibrary@gmail.com' ? 'admin' : profile.role;
      localStorage.setItem('user_role', finalRole);
      localStorage.setItem('user_name', profile.full_name);

      return { ...user, ...profile, role: finalRole };
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
      window.location.href = '/index.html?error=unauthorized';
      return null;
    }

    return user;
  }
};

window.supabaseAuth = supabaseAuth;
