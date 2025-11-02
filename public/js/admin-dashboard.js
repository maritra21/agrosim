if (!checkAuth()) {
  throw new Error('Not authenticated');
}

const user = getUser();
if (user.role !== 'admin') {
  window.location.href = '/';
}

document.getElementById('userName').textContent = user.name;

loadDashboardData();

document.getElementById('roleFilter').addEventListener('change', loadUsers);
document.getElementById('statusFilter').addEventListener('change', loadUsers);

async function loadDashboardData() {
  await loadStatistics();
  await loadUsers();
  await loadOrders();
  await loadBroadcasts();
}

async function loadStatistics() {
  try {
    const response = await fetchWithAuth('/api/admin/statistics');
    const stats = await response.json();

    document.getElementById('totalFarmers').textContent = stats.farmers;
    document.getElementById('totalBuyers').textContent = stats.buyers;
    document.getElementById('pendingUsers').textContent = stats.pendingUsers;
    document.getElementById('activeProducts').textContent = stats.activeProducts;
    document.getElementById('totalOrders').textContent = stats.totalOrders;
    document.getElementById('pendingOrders').textContent = stats.pendingOrders;
    document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue);

  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

async function loadUsers() {
  try {
    const role = document.getElementById('roleFilter').value;
    const status = document.getElementById('statusFilter').value;

    let url = '/api/admin/users?';
    if (role) url += `role=${role}&`;
    if (status) url += `status=${status}`;

    const response = await fetchWithAuth(url);
    const users = await response.json();

    const tableBody = document.getElementById('usersTableBody');

    if (users.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 32px; color: var(--text-light);">No users found</td></tr>';
      return;
    }

    tableBody.innerHTML = users.map(user => `
      <tr>
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td><span class="badge badge-info">${user.role}</span></td>
        <td>${user.village || '-'}</td>
        <td><span class="badge ${getStatusBadgeClass(user.status)}">${user.status}</span></td>
        <td>${formatDate(user.created_at)}</td>
        <td>
          ${user.status === 'pending' ? `
            <button class="btn btn-success btn-sm" onclick="updateUserStatus(${user.id}, 'active')">Approve</button>
            <button class="btn btn-danger btn-sm" onclick="updateUserStatus(${user.id}, 'suspended')">Reject</button>
          ` : user.status === 'active' ? `
            <button class="btn btn-danger btn-sm" onclick="updateUserStatus(${user.id}, 'suspended')">Suspend</button>
          ` : user.status === 'suspended' ? `
            <button class="btn btn-success btn-sm" onclick="updateUserStatus(${user.id}, 'active')">Activate</button>
          ` : ''}
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading users:', error);
  }
}

async function updateUserStatus(userId, status) {
  try {
    const response = await fetchWithAuth(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      alert('User status updated successfully');
      loadDashboardData();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to update user status');
    }

  } catch (error) {
    console.error('Error updating user status:', error);
    alert('Failed to update user status');
  }
}

async function loadOrders() {
  try {
    const response = await fetchWithAuth('/api/orders');
    const orders = await response.json();

    const tableBody = document.getElementById('ordersTableBody');

    if (orders.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-light);">No orders yet</td></tr>';
      return;
    }

    tableBody.innerHTML = orders.slice(0, 20).map(order => `
      <tr>
        <td>#${order.id}</td>
        <td>${order.buyer_name}</td>
        <td>${order.farmer_name}<br><small style="color: var(--text-light);">${order.village}</small></td>
        <td>${formatCurrency(order.total_amount)}</td>
        <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
        <td>${formatDate(order.created_at)}</td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

function openBroadcastModal() {
  document.getElementById('broadcastModal').classList.add('active');
}

function closeBroadcastModal() {
  document.getElementById('broadcastModal').classList.remove('active');
  document.getElementById('broadcastForm').reset();
}

document.getElementById('broadcastForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const broadcastData = {
    title: document.getElementById('broadcastTitle').value,
    message: document.getElementById('broadcastMessage').value,
    target_role: document.getElementById('broadcastTarget').value
  };

  try {
    const response = await fetchWithAuth('/api/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify(broadcastData)
    });

    if (response.ok) {
      const result = await response.json();
      alert(`Broadcast sent successfully to ${result.recipientCount} users!`);
      closeBroadcastModal();
      loadBroadcasts();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to send broadcast');
    }

  } catch (error) {
    console.error('Error sending broadcast:', error);
    alert('Failed to send broadcast');
  }
});

async function loadBroadcasts() {
  try {
    const response = await fetchWithAuth('/api/admin/broadcasts');
    const broadcasts = await response.json();

    const tableBody = document.getElementById('broadcastsTableBody');

    if (broadcasts.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--text-light);">No broadcasts sent yet</td></tr>';
      return;
    }

    tableBody.innerHTML = broadcasts.map(broadcast => `
      <tr>
        <td>${broadcast.title}</td>
        <td style="max-width: 300px;">${broadcast.message.substring(0, 100)}${broadcast.message.length > 100 ? '...' : ''}</td>
        <td><span class="badge badge-info">${broadcast.target_role}${broadcast.target_user_name ? ': ' + broadcast.target_user_name : ''}</span></td>
        <td>${broadcast.admin_name}</td>
        <td>${formatDateTime(broadcast.created_at)}</td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading broadcasts:', error);
  }
}
