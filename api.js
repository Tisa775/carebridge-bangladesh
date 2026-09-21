/**
 * CareBridge Bangladesh – API Client Layer
 * =========================================
 * Central HTTP client for all backend API calls.
 * Handles authentication tokens, error handling, and response parsing.
 *
 * Base URL: http://localhost:8000
 * All API routes are prefixed with /api
 */

const CAREBRIDGE_API = (() => {
  const BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin.includes(':8000'))
    ? window.location.origin
    : 'http://127.0.0.1:8000';

  // ─── Token Management ──────────────────────────────────────────────────────
  function getToken() {
    try {
      const auth = localStorage.getItem('carebridge_auth');
      if (!auth) return null;
      const parsed = JSON.parse(auth);
      return parsed?.access_token || null;
    } catch { return null; }
  }

  function getAuthHeaders() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  // ─── Core HTTP Methods ─────────────────────────────────────────────────────
  async function apiGet(path, params = {}) {
    try {
      const url = new URL(`${BASE_URL}${path}`);
      Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined) url.searchParams.set(k, v);
      });
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[CareBridge API] GET ${path}:`, err.message);
      return null;
    }
  }

  async function apiPost(path, body = {}) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `POST ${path} failed: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`[CareBridge API] POST ${path}:`, err.message);
      throw err;
    }
  }

  async function apiPut(path, body = {}) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `PUT ${path} failed: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`[CareBridge API] PUT ${path}:`, err.message);
      throw err;
    }
  }

  async function apiDelete(path) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[CareBridge API] DELETE ${path}:`, err.message);
      throw err;
    }
  }

  // ─── Health Check ──────────────────────────────────────────────────────────
  async function checkHealth() {
    const result = await apiGet('/api/health');
    return result?.status === 'operational';
  }

  // ─── AUTH ──────────────────────────────────────────────────────────────────
  const auth = {
    async login(email, password) {
      return await apiPost('/api/auth/login', { email, password });
    },
    async signup(firstName, lastName, email, password, phone = null, organization = null) {
      return await apiPost('/api/auth/signup', {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        phone,
        organization,
      });
    },
    async me() {
      return await apiGet('/api/auth/me');
    },
    async logout() {
      try { await apiPost('/api/auth/logout'); } catch {}
    },
  };

  // ─── CASES ─────────────────────────────────────────────────────────────────
  const cases = {
    async list(filters = {}) {
      return await apiGet('/api/cases', filters) || [];
    },
    async create(data) {
      return await apiPost('/api/cases', data);
    },
    async get(id) {
      return await apiGet(`/api/cases/${id}`);
    },
    async update(id, data) {
      return await apiPut(`/api/cases/${id}`, data);
    },
    async resolve(id) {
      return await apiPut(`/api/cases/${id}`, { status: 'Resolved' });
    },
    async stats() {
      return await apiGet('/api/cases/stats/summary');
    },
  };

  // ─── NGOS ──────────────────────────────────────────────────────────────────
  const ngos = {
    async list(verified = null) {
      return await apiGet('/api/ngos', verified !== null ? { verified } : {}) || [];
    },
    async trusted() {
      return await apiGet('/api/ngos/trusted') || [];
    },
    async pending() {
      return await apiGet('/api/ngos/pending') || [];
    },
    async create(data) {
      return await apiPost('/api/ngos', data);
    },
    async verify(id, status) {
      return await apiPut(`/api/ngos/${id}/verify`, { verified_status: status });
    },
  };

  // ─── VOLUNTEERS ────────────────────────────────────────────────────────────
  const volunteers = {
    async list(filters = {}) {
      return await apiGet('/api/volunteers', filters) || [];
    },
    async create(data) {
      return await apiPost('/api/volunteers', data);
    },
    async dispatch(volunteerId, caseId) {
      return await apiPut(`/api/volunteers/${volunteerId}/dispatch?case_id=${encodeURIComponent(caseId)}`);
    },
  };

  // ─── ALERTS ────────────────────────────────────────────────────────────────
  const alerts = {
    async list(unreadOnly = false) {
      return await apiGet('/api/alerts', { unread_only: unreadOnly }) || [];
    },
    async create(data) {
      return await apiPost('/api/alerts', data);
    },
    async markRead(id) {
      return await apiPut(`/api/alerts/${id}/read`);
    },
    async markAllRead() {
      return await apiPut('/api/alerts/read-all');
    },
    async unreadCount() {
      const result = await apiGet('/api/alerts/count/unread');
      return result?.unread || 0;
    },
  };

  // ─── MESSAGES ──────────────────────────────────────────────────────────────
  const messages = {
    async threads() {
      return await apiGet('/api/messages/threads') || [];
    },
    async conversation(partnerId) {
      return await apiGet(`/api/messages/thread/${partnerId}`) || [];
    },
    // Alias used by communication hub
    async thread(partnerId) {
      return await apiGet(`/api/messages/thread/${partnerId}`) || [];
    },
    async send(receiverId, content) {
      return await apiPost('/api/messages/send', { receiver_id: receiverId, content });
    },
    async unreadCount() {
      const result = await apiGet('/api/messages/unread/count');
      return result?.unread || 0;
    },
  };

  // ─── ANALYTICS ─────────────────────────────────────────────────────────────
  const analytics = {
    async dashboard() {
      return await apiGet('/api/analytics/dashboard');
    },
    async responseTime(period = 'week') {
      return await apiGet('/api/analytics/response-time', { period });
    },
    async divisional() {
      return await apiGet('/api/analytics/divisional') || [];
    },
    async categoryShare() {
      return await apiGet('/api/analytics/category-share') || [];
    },
  };

  // ─── AI / COPILOT ──────────────────────────────────────────────────────────
  const ai = {
    async insights() {
      return await apiGet('/api/ai/insights');
    },
    async chat(query) {
      const result = await apiPost('/api/ai/chat', { query });
      return result?.reply || "I'm analyzing the field situation. Please try again.";
    },
  };

  // ─── Activity Log ──────────────────────────────────────────────────────────
  const activity = {
    async recent(limit = 7) {
      return await apiGet('/api/activity', { limit }) || [];
    },
  };

  // ─── Public API ────────────────────────────────────────────────────────────
  return {
    BASE_URL,
    checkHealth,
    auth,
    cases,
    ngos,
    volunteers,
    alerts,
    messages,
    analytics,
    ai,
    activity,
    exportReports: {
      casesCsvUrl: () => `${BASE_URL}/api/export/cases`,
      summaryPdfUrl: () => `${BASE_URL}/api/export/summary`,
      downloadCases: () => {
        window.open(`${BASE_URL}/api/export/cases`, '_blank');
      },
      downloadSummary: () => {
        window.open(`${BASE_URL}/api/export/summary`, '_blank');
      }
    },
    // Expose raw methods for custom calls
    get: apiGet, post: apiPost, put: apiPut, del: apiDelete,
  };
})();

// Make globally accessible
window.API = CAREBRIDGE_API;
