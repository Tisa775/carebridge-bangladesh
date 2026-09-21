// CareBridge Bangladesh - Authentication Shared Functions

// Get currently authenticated user
window.getAuthUser = function() {
  try {
    const raw = localStorage.getItem('carebridge_auth');
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.isLoggedIn ? data : null;
  } catch (e) {
    return null;
  }
};

// Set authenticated user
window.setAuthUser = function(user) {
  const payload = {
    name: user.name || 'Argho Saha',
    email: user.email || 'argho@carebridge.org',
    role: user.role || 'Super Admin / Coordinator',
    avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    access_token: user.access_token || null,
    isLoggedIn: true,
    loginTime: new Date().toISOString()
  };
  localStorage.setItem('carebridge_auth', JSON.stringify(payload));
  return payload;
};

// One-click Demo Login (with live API support)
window.loginDemoUser = async function(role = 'Emergency Coordinator') {
  // Try connecting to live FastAPI backend first
  try {
    if (window.API && window.API.auth) {
      const res = await window.API.auth.login('argho@carebridge.org', 'demo123');
      if (res && res.access_token) {
        const liveUser = window.setAuthUser({
          name: res.user.name,
          email: res.user.email,
          role: res.user.role || role,
          avatar: res.user.avatar,
          access_token: res.access_token
        });
        window.showToast(`⚡ Welcome, ${liveUser.name}! Connected to Live Backend.`, 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 800);
        return;
      }
    }
  } catch (err) {
    console.warn('[CareBridge Auth] Live API login skipped, using local session:', err.message);
  }

  // Fallback demo user if API is offline
  const demoUser = window.setAuthUser({
    name: 'Argho Saha',
    email: 'argho@carebridge.org',
    role: role,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  });

  window.showToast(`⚡ Welcome, ${demoUser.name}! Logging in as Demo ${role}...`, 'success');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 900);
};

// Log out user
window.logoutUser = async function(redirectUrl = 'landing.html') {
  try {
    if (window.API && window.API.auth) {
      await window.API.auth.logout();
    }
  } catch (e) {}
  localStorage.removeItem('carebridge_auth');
  window.showToast('👋 You have been logged out. Redirecting to home...', 'info');
  setTimeout(() => {
    window.location.href = redirectUrl;
  }, 1000);
};

// Dashboard access guard
window.checkDashboardAuth = function() {
  // Check URL param for instant demo bypass e.g. ?demo=true
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('demo') === 'true') {
    window.setAuthUser({
      name: 'Argho Saha',
      email: 'argho@carebridge.org',
      role: 'Emergency Coordinator'
    });
    return true;
  }

  const user = window.getAuthUser();
  if (!user) {
    window.location.replace('landing.html');
    return false;
  }
  return true;
};

// Toggle password visibility
window.togglePassword = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = btn.querySelector('i');
  
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    if (icon) icon.className = 'fa-solid fa-eye';
  }
};

// Show toast notification
window.showToast = function(message, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  
  const toast = document.createElement('div');
  toast.className = `custom-toast ${type === 'error' ? 'toast-error' : type === 'warning' ? 'toast-warning' : ''}`;
  
  let icon = '<i class="fa-solid fa-circle-check" style="color:var(--primary, #059669); font-size:18px;"></i>';
  if (type === 'error') icon = '<i class="fa-solid fa-triangle-exclamation" style="color:var(--high-priority, #ef4444); font-size:18px;"></i>';
  if (type === 'info') icon = '<i class="fa-solid fa-circle-info" style="color:var(--low-priority, #3b82f6); font-size:18px;"></i>';
  
  toast.innerHTML = `
    ${icon}
    <div class="toast-message">
      <h6>${type === 'error' ? 'Emergency Alert' : type === 'warning' ? 'Warning' : type === 'info' ? 'CareBridge Notice' : 'Success'}</h6>
      <p>${message}</p>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
};