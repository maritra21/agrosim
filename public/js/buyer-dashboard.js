if (!checkAuth()) {
  throw new Error('Not authenticated');
}

const user = getUser();
if (user.role !== 'buyer') {
  window.location.href = '/';
}

document.getElementById('userName').textContent = user.name;

let cart = [];
let allProducts = [];

loadDashboardData();
loadNotifications();
setInterval(loadNotifications, 30000);

document.getElementById('searchInput').addEventListener('input', filterProducts);
document.getElementById('categoryFilter').addEventListener('change', filterProducts);

async function loadDashboardData() {
  await loadProducts();
  await loadOrders();
}

async function loadProducts() {
  try {
    const response = await fetchWithAuth('/api/products');
    allProducts = await response.json();

    document.getElementById('availableProducts').textContent = allProducts.length;

    filterProducts();

  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function filterProducts() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;

  const filtered = allProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search) ||
                         (product.description && product.description.toLowerCase().includes(search));
    const matchesCategory = !category || product.category === category;
    return matchesSearch && matchesCategory;
  });

  displayProducts(filtered);
}

function displayProducts(products) {
  const container = document.getElementById('productsContainer');

  if (products.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No products found</p></div>';
    return;
  }

  container.innerHTML = products.map(product => `
    <div class="product-card">
      <div class="product-image">🌱</div>
      <div class="product-content">
        <h3>${product.name}</h3>
        <div class="product-price">${formatCurrency(product.price_per_kg)}/kg</div>
        <div class="product-meta">Available: ${product.available_quantity} ${product.unit}</div>
        <div class="product-meta">
          Farmer: ${product.farmer_name}
          <button class="btn btn-sm" style="padding: 2px 8px; margin-left: 8px;" onclick="startChatWithFarmer(${product.farmer_id}, '${product.farmer_name}')">Chat</button>
        </div>
        <div class="product-meta">Village: ${product.village}</div>
        ${product.description ? `<p style="font-size: 14px; color: var(--text-medium); margin-top: 8px;">${product.description}</p>` : ''}
        <div class="product-actions">
          <input type="number" id="qty-${product.id}" min="0.1" step="0.1" max="${product.available_quantity}" value="1" style="width: 80px; padding: 6px; border: 1px solid var(--border); border-radius: 4px;">
          <button class="btn btn-primary btn-sm" onclick="addToCart(${product.id})">Add to Cart</button>
        </div>
      </div>
    </div>
  `).join('');
}

function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  const quantity = parseFloat(document.getElementById(`qty-${productId}`).value);

  if (!product || quantity <= 0 || quantity > product.available_quantity) {
    alert('Invalid quantity');
    return;
  }

  const existingItem = cart.find(item => item.product_id === productId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      product_id: productId,
      quantity: quantity,
      product: product
    });
  }

  updateCartBadge();
  alert('Product added to cart!');
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (cart.length > 0) {
    badge.textContent = cart.length;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

document.getElementById('cartBtn').addEventListener('click', (e) => {
  e.preventDefault();
  openCartModal();
});

function openCartModal() {
  const container = document.getElementById('cartItemsContainer');

  if (cart.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><p>Your cart is empty</p></div>';
    document.getElementById('cartTotal').textContent = formatCurrency(0);
  } else {
    let total = 0;

    container.innerHTML = cart.map((item, index) => {
      const subtotal = item.quantity * item.product.price_per_kg;
      total += subtotal;

      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--border);">
          <div>
            <h4>${item.product.name}</h4>
            <p style="color: var(--text-medium); font-size: 14px;">
              ${item.quantity} kg × ${formatCurrency(item.product.price_per_kg)}
            </p>
            <p style="color: var(--text-light); font-size: 12px;">Farmer: ${item.product.farmer_name}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 600; margin-bottom: 8px;">${formatCurrency(subtotal)}</div>
            <button class="btn btn-danger btn-sm" onclick="removeFromCart(${index})">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('cartTotal').textContent = formatCurrency(total);
  }

  document.getElementById('deliveryAddress').value = user.address || '';
  document.getElementById('cartModal').classList.add('active');
}

function closeCartModal() {
  document.getElementById('cartModal').classList.remove('active');
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartBadge();
  openCartModal();
}

async function placeOrder() {
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }

  const deliveryAddress = document.getElementById('deliveryAddress').value;
  const deliveryDate = document.getElementById('deliveryDate').value;
  const notes = document.getElementById('orderNotes').value;

  if (!deliveryAddress) {
    alert('Please enter delivery address');
    return;
  }

  const orderData = {
    items: cart.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity
    })),
    delivery_address: deliveryAddress,
    delivery_date: deliveryDate || null,
    notes: notes
  };

  try {
    const response = await fetchWithAuth('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });

    if (response.ok) {
      const result = await response.json();
      alert('Order placed successfully!');
      cart = [];
      updateCartBadge();
      closeCartModal();
      loadDashboardData();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to place order');
    }

  } catch (error) {
    console.error('Error placing order:', error);
    alert('Failed to place order');
  }
}

async function loadOrders() {
  try {
    const response = await fetchWithAuth('/api/orders');
    const orders = await response.json();

    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalSpent = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    document.getElementById('totalSpent').textContent = formatCurrency(totalSpent);

    const tableBody = document.getElementById('ordersTableBody');

    if (orders.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-light);">No orders yet</td></tr>';
      return;
    }

    tableBody.innerHTML = orders.slice(0, 10).map(order => `
      <tr>
        <td>#${order.id}</td>
        <td>${order.farmer_name}<br><small style="color: var(--text-light);">${order.village}</small></td>
        <td>${formatCurrency(order.total_amount)}</td>
        <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
        <td>${formatDate(order.created_at)}</td>
        <td>
          ${order.status === 'pending' ? `
            <button class="btn btn-danger btn-sm" onclick="cancelOrder(${order.id})">Cancel</button>
          ` : '-'}
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order?')) {
    return;
  }

  try {
    const response = await fetchWithAuth(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' })
    });

    if (response.ok) {
      alert('Order cancelled successfully');
      loadOrders();
    }

  } catch (error) {
    console.error('Error cancelling order:', error);
    alert('Failed to cancel order');
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
