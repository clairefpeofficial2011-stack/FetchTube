let currentVideo = null;
let isLoggedIn = localStorage.getItem('yt_loggedIn') === 'true';
let userDisplayName = localStorage.getItem('yt_userName') || '';

document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();
    renderHistory();
    initGoogleAuth();
});

// Utility: Decodes Google's Identity JWT token safely
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Custom UI Notification Engine
function showCustomAlert(title, message) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerText = message;
    const actionsContainer = document.getElementById('modal-actions');
    actionsContainer.innerHTML = `<button class="modal-btn primary" onclick="closeCustomModal()">Okay</button>`;
    modal.classList.remove('hidden');
}

function showCustomConfirm(title, message, onConfirm) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-message').innerText = message;
    const actionsContainer = document.getElementById('modal-actions');
    actionsContainer.innerHTML = `
        <button class="modal-btn secondary" onclick="closeCustomModal()">Cancel</button>
        <button class="modal-btn danger" id="modal-confirm-action-btn">Clear All</button>
    `;
    document.getElementById('modal-confirm-action-btn').onclick = () => {
        onConfirm();
        closeCustomModal();
    };
    modal.classList.remove('hidden');
}

function closeCustomModal() {
    document.getElementById('custom-modal').classList.add('hidden');
}

// Initialize Google OAuth Sign In
function initGoogleAuth() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com", 
            callback: handleCredentialResponse
        });
        renderGoogleButton();
    }
}

function renderGoogleButton() {
    const container = document.getElementById("google-btn-container");
    if (container) {
        google.accounts.id.renderButton(container, { 
            theme: "dark", 
            size: "medium", 
            type: "standard", 
            shape: "rectangular" 
        });
    }
}

function handleCredentialResponse(response) {
    const responsePayload = parseJwt(response.credential);
    if (responsePayload && responsePayload.name) {
        userDisplayName = responsePayload.name;
        localStorage.setItem('yt_userName', userDisplayName);
    }
    
    isLoggedIn = true;
    localStorage.setItem('yt_loggedIn', 'true');
    updateAuthUI();
}

function handleSignOut() {
    isLoggedIn = false;
    userDisplayName = '';
    localStorage.setItem('yt_loggedIn', 'false');
    localStorage.removeItem('yt_userName');
    
    updateAuthUI();
    initGoogleAuth();
}

function updateAuthUI() {
    const googleBtnContainer = document.getElementById('google-btn-container');
    const signoutBtn = document.getElementById('signout-btn');
    const nameDisplay = document.getElementById('user-profile-name');

    if (isLoggedIn) {
        if(nameDisplay) {
            nameDisplay.innerText = userDisplayName || "Logged In";
            nameDisplay.classList.remove('hidden');
        }
        if(googleBtnContainer) googleBtnContainer.classList.add('hidden');
        if(signoutBtn) signoutBtn.classList.remove('hidden');
    } else {
        if(nameDisplay) nameDisplay.classList.add('hidden');
        if(googleBtnContainer) googleBtnContainer.classList.remove('hidden');
        if(signoutBtn) signoutBtn.classList.add('hidden');
    }
}

// Rewritten: Fetches details and immediately routes into an automated browser file attachment download
async function fetchVideoInfo() {
    const url = document.getElementById('video-url').value.trim();
    if (!url) return showCustomAlert('Input Required', 'Please paste a valid YouTube video link first.');
    const fetchBtn = document.getElementById('fetch-btn');
    fetchBtn.innerText = "Downloading...";

    try {
        const response = await fetch('/api/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // Instantly force a file download window prompt instead of drawing a video player/preview UI
        const downloadUrl = `/api/download?url=${encodeURIComponent(url)}`;
        window.location.href = downloadUrl;

        saveToHistory(data.title, 'FILE');
    } catch (err) {
        showCustomAlert('Error', err.message || 'Could not initiate download process.');
    } finally {
        fetchBtn.innerText = "Download Video";
    }
}

function saveToHistory(title, format) {
    let history = JSON.parse(localStorage.getItem('yt_history')) || [];
    const now = new Date();
    const currentDateTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const item = {
        id: Date.now(),
        title: title,
        format: format.toUpperCase(),
        date: currentDateTime
    };
    history.unshift(item);
    localStorage.setItem('yt_history', JSON.stringify(history));
    renderHistory();
}

// Unused legacy download format logic is cleanly removed

function renderHistory() {
    const historyList = document.getElementById('history-list');
    let history = JSON.parse(localStorage.getItem('yt_history')) || [];
    historyList.innerHTML = '';

    if(history.length === 0) {
        historyList.innerHTML = '<li style="color: #777; padding: 10px 0;">No download history found</li>';
        return;
    }

    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <span><strong>[${item.format}]</strong> ${item.title} <br><small style="color:#888; font-size: 0.75rem;">Downloaded on: ${item.date}</small></span>
            <button class="delete-btn" onclick="deleteHistoryItem(${item.id})">✕</button>
        `;
        historyList.appendChild(li);
    });
}

function deleteHistoryItem(id) {
    let history = JSON.parse(localStorage.getItem('yt_history')) || [];
    history = history.filter(item => item.id !== id);
    localStorage.setItem('yt_history', JSON.stringify(history));
    renderHistory();
}

function clearAllHistory() {
    showCustomConfirm(
        "Clear History", 
        "Are you absolutely sure you want to completely erase your download historical logs?", 
        () => {
            localStorage.removeItem('yt_history');
            renderHistory();
        }
    );
}
