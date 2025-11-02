if (!checkAuth()) {
  throw new Error('Not authenticated');
}

const user = getUser();
if (user.role !== 'farmer') {
  window.location.href = '/';
}

document.getElementById('userName').textContent = user.name;

loadDashboardData();
loadNotifications();
setInterval(loadNotifications, 30000);

async function loadDashboardData() {
  await loadProducts();
  await loadOrders();
}

async function loadProducts() {
  try {
    const response = await fetchWithAuth(`/api/products?farmer_id=${user.id}`);
    const products = await response.json();

    document.getElementById('totalProducts').textContent = products.length;

    const container = document.getElementById('productsContainer');

    if (products.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><p>No products yet. Add your first product to get started!</p></div>';
      return;
    }

    container.innerHTML = products.map(product => `
      <div class="product-card">
        <div class="product-image">🌱</div>
        <div class="product-content">
          <h3>${product.name}</h3>
          <span class="badge ${getStatusBadgeClass(product.status)}">${product.status}</span>
          <div class="product-price">${formatCurrency(product.price_per_kg)}/kg</div>
          <div class="product-meta">Available: ${product.available_quantity} ${product.unit}</div>
          <div class="product-meta">Category: ${product.category || 'N/A'}</div>
          <div class="product-actions">
            <button class="btn btn-secondary btn-sm" onclick="openEditProductModal(${product.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct(${product.id})">Delete</button>
          </div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error loading products:', error);
  }
}

async function loadOrders() {
  try {
    const response = await fetchWithAuth('/api/orders');
    const orders = await response.json();

    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalEarnings = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    document.getElementById('totalEarnings').textContent = formatCurrency(totalEarnings);

    const tableBody = document.getElementById('ordersTableBody');

    if (orders.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-light);">No orders yet</td></tr>';
      return;
    }

    tableBody.innerHTML = orders.slice(0, 10).map(order => `
      <tr>
        <td>#${order.id}</td>
        <td>${order.buyer_name}<br><small style="color: var(--text-light);">${order.buyer_phone}</small></td>
        <td>${formatCurrency(order.total_amount)}</td>
        <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
        <td>${formatDate(order.created_at)}</td>
        <td>
          ${order.status === 'pending' ? `
            <button class="btn btn-success btn-sm" onclick="updateOrderStatus(${order.id}, 'confirmed')">Confirm</button>
            <button class="btn btn-danger btn-sm" onclick="updateOrderStatus(${order.id}, 'cancelled')">Cancel</button>
          ` : order.status === 'confirmed' ? `
            <button class="btn btn-success btn-sm" onclick="updateOrderStatus(${order.id}, 'delivered')">Mark Delivered</button>
          ` : '-'}
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    const response = await fetchWithAuth(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      alert('Order status updated successfully');
      loadOrders();
    }

  } catch (error) {
    console.error('Error updating order status:', error);
    alert('Failed to update order status');
  }
}

function openAddProductModal() {
  document.getElementById('addProductModal').classList.add('active');
}

function closeAddProductModal() {
  document.getElementById('addProductModal').classList.remove('active');
  document.getElementById('addProductForm').reset();
}

document.getElementById('addProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const productData = {
    name: document.getElementById('productName').value,
    category: document.getElementById('productCategory').value,
    description: document.getElementById('productDescription').value,
    price_per_kg: parseFloat(document.getElementById('productPrice').value),
    available_quantity: parseFloat(document.getElementById('productQuantity').value),
    harvest_date: document.getElementById('harvestDate').value || null,
    unit: 'kg'
  };

  try {
    const response = await fetchWithAuth('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });

    if (response.ok) {
      alert('Product added successfully!');
      closeAddProductModal();
      loadProducts();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to add product');
    }

  } catch (error) {
    console.error('Error adding product:', error);
    alert('Failed to add product');
  }
});

async function openEditProductModal(productId) {
  try {
    const response = await fetchWithAuth(`/api/products/${productId}`);
    const product = await response.json();

    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductCategory').value = product.category || 'Vegetables';
    document.getElementById('editProductDescription').value = product.description || '';
    document.getElementById('editProductPrice').value = product.price_per_kg;
    document.getElementById('editProductQuantity').value = product.available_quantity;
    document.getElementById('editProductStatus').value = product.status;
    document.getElementById('editHarvestDate').value = product.harvest_date ? product.harvest_date.split('T')[0] : '';

    document.getElementById('editProductModal').classList.add('active');

  } catch (error) {
    console.error('Error loading product:', error);
    alert('Failed to load product details');
  }
}

function closeEditProductModal() {
  document.getElementById('editProductModal').classList.remove('active');
  document.getElementById('editProductForm').reset();
}

document.getElementById('editProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const productId = document.getElementById('editProductId').value;

  const productData = {
    name: document.getElementById('editProductName').value,
    category: document.getElementById('editProductCategory').value,
    description: document.getElementById('editProductDescription').value,
    price_per_kg: parseFloat(document.getElementById('editProductPrice').value),
    available_quantity: parseFloat(document.getElementById('editProductQuantity').value),
    status: document.getElementById('editProductStatus').value,
    harvest_date: document.getElementById('editHarvestDate').value || null,
    unit: 'kg'
  };

  try {
    const response = await fetchWithAuth(`/api/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });

    if (response.ok) {
      alert('Product updated successfully!');
      closeEditProductModal();
      loadProducts();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to update product');
    }

  } catch (error) {
    console.error('Error updating product:', error);
    alert('Failed to update product');
  }
});

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) {
    return;
  }

  try {
    const response = await fetchWithAuth(`/api/products/${productId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('Product deleted successfully!');
      loadProducts();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to delete product');
    }

  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Failed to delete product');
  }
}

async function loadNotifications() {
  try {
    const response = await fetchWithAuth('/api/notifications/unread-count');
    const data = await response.json();

    const badge = document.getElementById('notificationBadge');
    if (data.count > 0) {
      badge.textContent = data.count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }

  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

document.getElementById('notificationBtn').addEventListener('click', async (e) => {
  e.preventDefault();

  try {
    const response = await fetchWithAuth('/api/notifications');
    const notifications = await response.json();

    const container = document.getElementById('notificationsContainer');

    if (notifications.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔔</div><p>No notifications</p></div>';
    } else {
      container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${!notif.is_read ? 'unread' : ''}" onclick="markAsRead(${notif.id})">
          <div class="notification-title">${notif.title}</div>
          <div>${notif.message}</div>
          <div class="notification-time">${formatDateTime(notif.created_at)}</div>
        </div>
      `).join('');
    }

    document.getElementById('notificationModal').classList.add('active');

  } catch (error) {
    console.error('Error loading notifications:', error);
  }
});

function closeNotificationModal() {
  document.getElementById('notificationModal').classList.remove('active');
  loadNotifications();
}

async function markAsRead(notificationId) {
  try {
    await fetchWithAuth(`/api/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}
