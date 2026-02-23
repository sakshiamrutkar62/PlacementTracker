// Auto-detects the base URL so the app works both locally and on Vercel
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://localhost:${window.location.port || 3000}/api`
    : `${window.location.origin}/api`;

// Helper function to handle fetch with Auth Token automatically
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers
    });

    // Auto-logout if token is invalid
    if (response.status === 401 || response.status === 403) {
        alert("Session expired. Please login again.");
        localStorage.clear();
        window.location.href = 'index.html';
        return;
    }

    return response;
}