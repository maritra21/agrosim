let currentConversationId = null;
let chatPollingInterval = null;

document.getElementById('chatBtn').addEventListener('click', (e) => {
  e.preventDefault();
  openChatModal();
});

async function openChatModal() {
  await loadConversations();
  await loadChatUnreadCount();
  document.getElementById('chatModal').classList.add('active');

  if (chatPollingInterval) {
    clearInterval(chatPollingInterval);
  }

  chatPollingInterval = setInterval(() => {
    if (document.getElementById('chatModal').classList.contains('active')) {
      loadConversations();
      if (currentConversationId) {
        loadMessages(currentConversationId);
      }
    }
  }, 5000);
}

function closeChatModal() {
  document.getElementById('chatModal').classList.remove('active');
  currentConversationId = null;

  if (chatPollingInterval) {
    clearInterval(chatPollingInterval);
    chatPollingInterval = null;
  }

  document.getElementById('chatPlaceholder').style.display = 'flex';
  document.getElementById('chatMessages').style.display = 'none';
  document.getElementById('chatInputContainer').style.display = 'none';
}

async function loadChatUnreadCount() {
  try {
    const response = await fetchWithAuth('/api/chat/unread-count');
    const data = await response.json();

    const badge = document.getElementById('chatBadge');
    if (data.count > 0) {
      badge.textContent = data.count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading chat unread count:', error);
  }
}

async function loadConversations() {
  try {
    const response = await fetchWithAuth('/api/chat/conversations');
    const conversations = await response.json();

    const container = document.getElementById('conversationsList');

    if (conversations.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-light);">No conversations yet</div>';
      return;
    }

    container.innerHTML = conversations.map(conv => {
      const otherUserName = user.role === 'farmer' ? conv.buyer_name : conv.farmer_name;
      const otherUserInfo = user.role === 'farmer' ? conv.buyer_phone : conv.village;

      return `
        <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" onclick="selectConversation(${conv.id})">
          <div class="conversation-name">
            ${otherUserName}
            ${conv.unread_count > 0 ? `<span class="conversation-badge">${conv.unread_count}</span>` : ''}
          </div>
          <div class="conversation-preview">${conv.last_message || 'Start a conversation'}</div>
          <div style="font-size: 11px; color: var(--text-light); margin-top: 4px;">${otherUserInfo || ''}</div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading conversations:', error);
  }
}

async function selectConversation(conversationId) {
  currentConversationId = conversationId;

  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.remove('active');
  });

  event.target.closest('.conversation-item').classList.add('active');

  document.getElementById('chatPlaceholder').style.display = 'none';
  document.getElementById('chatMessages').style.display = 'flex';
  document.getElementById('chatInputContainer').style.display = 'flex';

  await loadMessages(conversationId);
}

async function loadMessages(conversationId) {
  try {
    const response = await fetchWithAuth(`/api/chat/conversations/${conversationId}/messages`);
    const messages = await response.json();

    const container = document.getElementById('chatMessages');

    container.innerHTML = messages.map(msg => {
      const isSent = msg.sender_id === user.id;
      return `
        <div class="chat-message ${isSent ? 'sent' : 'received'}">
          <div class="message-bubble">
            ${!isSent ? `<div class="message-sender">${msg.sender_name}</div>` : ''}
            <div>${msg.message}</div>
            <div class="message-time">${formatDateTime(msg.created_at)}</div>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;

    await loadConversations();
    await loadChatUnreadCount();

  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

async function sendMessage() {
  if (!currentConversationId) {
    alert('Please select a conversation first');
    return;
  }

  const input = document.getElementById('chatMessageInput');
  const message = input.value.trim();

  if (!message) {
    return;
  }

  try {
    const response = await fetchWithAuth(`/api/chat/conversations/${currentConversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });

    if (response.ok) {
      input.value = '';
      await loadMessages(currentConversationId);
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to send message');
    }

  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message');
  }
}

document.getElementById('chatMessageInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

async function startChatWithFarmer(farmerId, farmerName) {
  try {
    const response = await fetchWithAuth('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ other_user_id: farmerId })
    });

    if (response.ok) {
      const result = await response.json();
      openChatModal();

      setTimeout(() => {
        selectConversation(result.conversationId);
      }, 500);
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to start conversation');
    }

  } catch (error) {
    console.error('Error starting chat:', error);
    alert('Failed to start conversation');
  }
}

setInterval(loadChatUnreadCount, 30000);
