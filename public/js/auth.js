function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

async function fetchWithAuth(url, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    logout();
    return null;
  }

  return response;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatCurrency(amount) {
  return `BDT ${parseFloat(amount).toFixed(2)}`;
}

function getStatusBadgeClass(status) {
  const statusMap = {
    'active': 'badge-success',
    'available': 'badge-success',
    'confirmed': 'badge-success',
    'delivered': 'badge-success',
    'paid': 'badge-success',
    'pending': 'badge-warning',
    'out_of_stock': 'badge-warning',
    'suspended': 'badge-danger',
    'cancelled': 'badge-danger',
    'discontinued': 'badge-danger'
  };
  return statusMap[status] || 'badge-info';
}
