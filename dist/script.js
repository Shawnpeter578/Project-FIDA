/* =========================================
     PROJECT FIDA: LOGIC CORE (CONNECTED)
   ========================================= */

const API_URL = 'http://localhost:3000/api'; // Ensure this matches your backend
let currentUser = null;
let currentEvents = []; 
let joinedEventIds = [];
let html5QrcodeScanner = null;
let currentSearch = '';

// INIT
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        splash.style.opacity = '0';
        setTimeout(() => splash.classList.add('hidden'), 600);
    }, 1200);

    initCreateHandle();

    document.querySelectorAll('.overlay').forEach(o => {
        o.addEventListener('click', e => { if (e.target === o) o.classList.remove('visible'); });
    });

    if(window.google) {
        google.accounts.id.initialize({
            client_id: "611302719944-4fn2hr7i1l9tn2chvu9719pngbcpgrau.apps.googleusercontent.com", // IMPORTANT: Add your actual Client ID
            callback: handleGoogleResponse
        });
        // Render the button inside the new UI container
        const btnContainer = document.getElementById("googleBtnContainer");
        if(btnContainer) {
            google.accounts.id.renderButton(
                btnContainer,
                { theme: "outline", size: "large", width: "100%", shape: "pill" }
            );
        }
    }
    
    checkAuth();
});

// Ahh yes, authentication

async function handleGoogleResponse(response) {
    try {
        const res = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });
        
        const data = await res.json();
        
        if(data.success) {
            localStorage.setItem('fida_token', data.token);
            showToast(`Welcome, ${data.user.name}`);
            checkAuth();
        } else {
            showToast('Login Failed');
        }
    } catch(e) {
        console.error(e);
        showToast('Connection Error');
    }
}

async function checkAuth() {
    const token = localStorage.getItem('fida_token');
    
    if (!token) {
        showAuthScreen();
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            currentUser = await res.json();
            // Ensure joinedEvents is an array of strings (IDs)
            joinedEventIds = currentUser.joinedEvents || []; 
            
            hideAuthScreen();
            updateUserUI();
            fetchAndRenderFeed();
            // Switch to home view by default
            switchView('home', document.querySelector('.dock-item:first-child'));
        } else {
            logout(); // Token invalid
        }
    } catch (e) {
        console.error(e);
        showAuthScreen(); // Network error / offline
    }
}

function showAuthScreen() {
    document.getElementById('authScreen').classList.remove('hide');
}

function hideAuthScreen() {
    document.getElementById('authScreen').classList.add('hide');
}

function logout() {
    localStorage.removeItem('fida_token');
    currentUser = null;
    joinedEventIds = [];
    showAuthScreen();
    // Re-render button if needed
    location.reload(); 
}//logs tf out

function updateUserUI() {
    if (!currentUser) return;
    document.getElementById('headerName').innerText = currentUser.name.split(' ')[0].toUpperCase();
    const avatarImg = currentUser.picture ? `<img src="${currentUser.picture}">` : currentUser.name.charAt(0);
    document.getElementById('headerAvatar').innerHTML = avatarImg;
    
    // Settings Page
    document.getElementById('settingsName').innerText = currentUser.name;
    document.getElementById('settingsEmail').innerText = currentUser.email;
    document.getElementById('settingsAvatar').innerHTML = avatarImg;
}

// --- DATA & RENDERING ---

async function fetchAndRenderFeed() {
    try {
        const res = await fetch(`${API_URL}/events`);
        const data = await res.json();
        currentEvents = data;
        
        renderFeed();
        renderPasses();
        renderHostDashboard();
    } catch (e) {
        console.error("Failed to fetch events", e);
        showToast("Could not load feed");
    }
}

function renderFeed() {
    const container = document.getElementById('clubsContainer'); 
    container.innerHTML = '';
    
    const filtered = currentEvents.filter(item => 
        item.title.toLowerCase().includes(currentSearch) || 
        (item.location && item.location.toLowerCase().includes(currentSearch))
    );

    if(filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">NO SIGNALS FOUND</div>`;
        return;
    }

    filtered.forEach(event => {
        // Handle ID mapping (MongoDB _id vs local id)
        const id = event._id || event.id;
        const isJoined = joinedEventIds.includes(id);
        
        // Safety checks for new fields
        const attendeesCount = event.attendees ? event.attendees.length : 0;
        const maxAttendees = event.maxAttendees || Infinity;
        const isSoldOut = attendeesCount >= maxAttendees;
        const isOnline = event.mode === 'online';
        const locIcon = isOnline ? '🌐' : '📍';
        const priceDisplay = (!event.price || event.price === 0) ? 'FREE' : `$${event.price}`;
        
        // Badge Logic
        let badgeHtml = '';
        if (isSoldOut && !isJoined) {
            badgeHtml = '<div style="background:var(--text-main); color:var(--bg-body); font-size:0.7rem; font-weight:800; padding:4px 8px; border-radius:4px; position:absolute; top:20px; right:20px;">SOLD OUT</div>';
        }

        const html = `
            <div class="ticket ${isJoined ? 'joined' : ''}" onclick="openDetail('${id}')">
                <div class="ticket-inner">
                    <div class="ticket-status-bar"></div>
                    ${badgeHtml}
                    <div class="ticket-bg-num">0${id.toString().substring(id.toString().length-2)}</div>
                    <div class="ticket-content">
                        <div class="t-header">
                            <div class="t-title">${event.title}</div>
                            <div class="t-loc">${locIcon} ${event.location || 'TBA'}</div>
                        </div>
                        <div class="t-desc">${event.description || ''}</div>
                        <div class="t-info-grid">
                            <div class="t-cell"><label>Date</label><div>${formatDate(event.date)}</div></div>
                            <div class="t-cell"><label>Time</label><div>${event.time}</div></div>
                            <div class="t-cell t-price"><div>${priceDisplay}</div></div>
                        </div>
                    </div>
                    <div class="ticket-rip"><div class="rip-line"></div></div>
                    <div class="ticket-stub">
                        <div class="stub-code">129394</div>
                        <button class="btn-action ${isSoldOut && !isJoined ? 'sold-out' : ''}" onclick="event.stopPropagation(); ${isJoined ? `openDetail('${id}')` : `joinClub('${id}')`}">
                             ${isJoined ? 'GOT PASS' : (isSoldOut ? 'FULL' : 'GET PASS')}
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

function renderPasses() {
    const container = document.getElementById('passesContainer'); 
    container.innerHTML = '';
    
    // Filter events user has joined
    const myEvents = currentEvents.filter(e => joinedEventIds.includes(e._id || e.id));
    
    if(myEvents.length === 0) {
        container.innerHTML = '<div class="empty-state">No active passes.<br>Find an event in the feed.</div>';
        return;
    }

    myEvents.forEach(event => {
        const id = event._id || event.id;
        
        // Determine check-in status (mock logic for client side display, real logic requires attendee object)
        // We assume 'currentUser._id' is in 'event.attendees' if joined.
        // For status, we'd need the backend to return { userId, status } objects in attendees array.
        // Fallback:
        const statusText = 'SCAN ENTRY'; 
        const statusClass = '';

        const isOnline = event.mode === 'online';
        const locIcon = isOnline ? '🌐' : '📍';

        const html = `
            <div class="ticket joined ${statusClass}" onclick="openDetail('${id}')">
                <div class="ticket-inner">
                    <div class="ticket-status-bar"></div>
                     <div class="ticket-content">
                        <div class="t-header">
                            <div class="t-title">${event.title}</div>
                            <div class="t-loc">${locIcon} ${event.location}</div>
                        </div>
                        <div style="text-align:center; padding:20px 0;">
                            <button class="btn-action" style="width:100%; border:2px solid var(--text-main); color:var(--text-main); background:transparent;" onclick="event.stopPropagation(); showUserQR('${id}', '${event.title.replace(/'/g, "\\'")}')">
                                SHOW QR CODE
                            </button>
                            <div style="font-size:0.9rem; letter-spacing:0.1em; font-weight:700; color:var(--text-muted); margin-top:12px;">${statusText}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

function renderHostDashboard() {
    const container = document.getElementById('hostContainer'); 
    container.innerHTML = '';
    
    if(!currentUser) return;
    const hostedEvents = currentEvents.filter(x => x.creatorId === currentUser._id); // Ensure backend returns creatorId

    if(hostedEvents.length === 0) {
        container.innerHTML = '<div class="empty-state">You haven\'t dropped any events.<br>Tap + to create.</div>';
        return;
    }

    hostedEvents.forEach(event => {
        const count = event.attendees ? event.attendees.length : 0;
        const html = `
            <div class="ticket" onclick="openHostDetail('${event._id}')">
                <div class="ticket-inner">
                     <div class="ticket-content">
                        <div class="t-header">
                            <div class="t-title">${event.title}</div>
                            <div class="t-loc">Guest List: ${count}</div>
                        </div>
                        <div class="t-desc">Tap to manage access & verify tickets.</div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}



async function handleCreate(e) {//Shaun wanted more settings. Take more settings niga
    e.preventDefault();
    const token = localStorage.getItem('fida_token');
    
    
    const maxInput = document.getElementById('cMax').value;
    const maxAttendees = maxInput ? parseInt(maxInput) : Infinity;
    const mode = document.getElementById('cMode').value || 'offline';
    const category = document.getElementById('cCategory').value || 'PARTY';

    const payload = {
        title: document.getElementById('cName').value,
        description: document.getElementById('cDesc').value,
        date: document.getElementById('cDate').value,
        time: document.getElementById('cTime').value,
        location: document.getElementById('cLoc').value,
        price: document.getElementById('cPrice').value || 0,
        image: document.getElementById('cImagePreview').src || null,
        mode: mode,
        maxAttendees: maxAttendees,
        category: category
    };

    try {
        const res = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if(data.success) {
            showToast('Drop Published');
            closeCreateModal();
            e.target.reset();
            document.getElementById('cImagePreview').style.display = 'none';
            // Refetch
            fetchAndRenderFeed();
            switchView('host', document.querySelectorAll('.dock-item')[3]);
        } else {
            showToast(data.error || 'Creation Failed');
        }
    } catch(err) {
        showToast('Network Error');
    }
}

async function joinClub(id) {
    const token = localStorage.getItem('fida_token');
    
    try {
        const res = await fetch(`${API_URL}/events/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ eventId: id })
        });
        
        const data = await res.json();
        if(data.success) {
            // Optimistic Update
            joinedEventIds.push(id);
            showToast('Pass Granted');
            
            // Refresh Data to sync counts
            fetchAndRenderFeed();
            
            // If details modal is open, refresh it
            if(document.getElementById('detailsModal').classList.contains('visible')) {
                openDetail(id);
            }
        } else {
            showToast(data.error || 'Join Failed');
        }
    } catch(err) {
        showToast('Network Error');
    }
}



function openDetail(id) {
    const event = currentEvents.find(e => (e._id || e.id) === id);
    if(!event) return;
    
    const isJoined = joinedEventIds.includes(id);
    const modal = document.getElementById('detailsModal');
    const content = document.getElementById('detailsContent');
    
    const count = event.attendees ? event.attendees.length : 0;
    const max = event.maxAttendees || Infinity;
    const isSoldOut = count >= max;
    const priceDisplay = (!event.price) ? 'FREE' : `$${event.price}`;

    content.innerHTML = `
        <img src="${event.image || ''}" class="detail-cover" style="${!event.image ? 'display:none' : ''}">
        <h2 style="font-size:2rem; font-weight:800; line-height:1; margin-bottom:8px;">${event.title}</h2>
        <div style="display:flex; gap:12px; margin-bottom:24px;">
            <span class="t-loc">${event.location}</span>
            <span class="t-loc">${formatDate(event.date)} @ ${event.time}</span>
        </div>
        
        <div style="background:var(--bg-card-sub); padding:16px; border-radius:16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:700; color:var(--text-sec); font-size:0.9rem;">Spots Left</span>
            <span style="font-weight:700; font-family:var(--font-mono);">${max === Infinity ? 'Unlimited' : (max - count) + ' / ' + max}</span>
        </div>

        <p style="color:var(--text-sec); line-height:1.6; margin-bottom:32px;">${event.description || 'No description.'}</p>
        <button class="btn-main ${isSoldOut && !isJoined ? 'sold-out' : ''}" onclick="${isJoined ? '' : `joinClub('${id}')`}">
            ${isJoined ? 'ALREADY JOINED' : (isSoldOut ? 'SOLD OUT' : `GET PASS • ${priceDisplay}`)}
        </button>
    `;
    
    modal.classList.add('visible');
}

function openHostDetail(id) {
    const event = currentEvents.find(e => (e._id || e.id) === id);
    if(!event) return;
    
    // In a real implementation, you would fetch the list of users here
    // For now we just show the dashboard structure
    const content = document.getElementById('hostDetailContent');
    
    content.innerHTML = `
        <div style="margin-bottom:20px; text-align:center;">
            <h2 style="font-size:1.8rem; font-weight:800; margin-bottom:4px;">${event.title}</h2>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px;">
            <div style="background:var(--bg-card-sub); padding:16px; border-radius:16px; text-align:center;">
                <div style="font-size:1.5rem; font-weight:700;">${event.attendees ? event.attendees.length : 0}</div>
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600;">SOLD</div>
            </div>
            <div style="background:var(--bg-card-sub); padding:16px; border-radius:16px; text-align:center;">
                <div style="font-size:1.5rem; font-weight:700; color:var(--success);">--</div>
                <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600;">CHECKED IN</div>
            </div>
        </div>
        <div class="empty-state" style="padding:20px 0;">Use the Scanner button on the Host Dashboard to check people in.</div>
    `;
    
    document.getElementById('hostDetailModal').classList.add('visible');
}

function showUserQR(eventId, eventTitle) {
    const modal = document.getElementById('qrDisplayModal');
    const target = document.getElementById('qrModalTarget');
    const title = document.getElementById('qrModalTitle');
    const codeText = document.getElementById('qrModalCodeText');
    
    target.innerHTML = ''; 
    title.textContent = eventTitle;
    
    // Payload: EventID-UserID
    const payload = `${eventId}-${currentUser._id}`;
    codeText.textContent = payload;
    
    new QRCode(target, {
        text: payload,
        width: 250,
        height: 250,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
    
    modal.classList.add('visible');
}

// --- SCANNER ---

function startScanner() {
    document.getElementById('scannerModal').classList.add('visible');
    if(!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5Qrcode("reader");
    }
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrcodeScanner.start(
        { facingMode: "environment" }, 
        config, 
        onScanSuccess
    ).catch(err => {
        console.error("Scanner Error", err);
        showToast("Camera Access Denied");
    });
}

function stopScanner() {
    document.getElementById('scannerModal').classList.remove('visible');
    if(html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            html5QrcodeScanner.clear();
        }).catch(err => console.log(err));
    }
}

function onScanSuccess(decodedText, decodedResult) {
    // Pause scanning
    if(html5QrcodeScanner) html5QrcodeScanner.pause();
    document.getElementById('scannerModal').classList.remove('visible');
    
    // Parse Payload: EventId-UserId
    const splitIndex = decodedText.indexOf('-');
    if(splitIndex === -1) {
        showScanResult('error', 'Invalid Format', 'Unknown');
        return;
    }
    
    const eventId = decodedText.substring(0, splitIndex);
    const userId = decodedText.substring(splitIndex + 1);
    
    // Logic: verify I own this event, and user is in it.
    // 1. Find Event
    const event = currentEvents.find(e => (e._id || e.id) === eventId);
    
    if(!event) {
        showScanResult('error', 'Event Not Found', userId);
        return;
    }
    
    if(event.creatorId !== currentUser._id) {
        showScanResult('error', 'Wrong Host', 'This is not your event');
        return;
    }
    
    // 2. Check Attendees List (Assuming attendees is array of userIDs string)
    // Note: If backend returns object array, this needs logic adjustment
    // We will assume backend returns array of IDs for this check
    if(event.attendees && event.attendees.includes(userId)) {
        // TODO: Call Backend API to mark as checked-in
        // await fetch(`${API_URL}/events/checkin`, ...)
        showScanResult('success', 'ACCESS GRANTED', userId);
    } else {
        showScanResult('error', 'Not on List', userId);
    }
}

function showScanResult(type, title, sub) {
    const modal = document.getElementById('scanResultModal');
    const icon = document.getElementById('scanIcon');
    const status = document.getElementById('scanStatus');
    const name = document.getElementById('scanName');
    
    modal.classList.add('visible');
    status.textContent = title;
    name.textContent = sub;
    
    if(type === 'success') {
        icon.style.color = 'var(--success)';
        icon.style.border = '2px solid var(--success)';
        icon.innerHTML = '✓';
        status.style.color = 'var(--success)';
    } else {
        icon.style.color = 'var(--accent)';
        icon.style.border = '2px solid var(--accent)';
        icon.innerHTML = '✕';
        status.style.color = 'var(--accent)';
    }
}

// --- UTILITIES ---

function switchView(viewName, el) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    const targetId = viewName === 'home' ? 'viewHome' : 
                     viewName === 'passes' ? 'viewPasses' :
                     viewName === 'host' ? 'viewHost' : 'viewSettings';
    document.getElementById(targetId).classList.add('active');
    
    document.querySelectorAll('.dock-item').forEach(i => i.classList.remove('active'));
    if(el) el.classList.add('active');
    window.scrollTo(0,0);
}

function handleSearch(val) {
    currentSearch = val.toLowerCase();
    renderFeed();
}

function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function formatDate(dateStr) {
    if(!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helpers for create form
function setEventMode(mode) {
    document.getElementById('cMode').value = mode;
    document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
    
    if(mode === 'online') {
        document.getElementById('btnOnline').classList.add('active');
        document.getElementById('cLoc').placeholder = "Server URL";
    } else {
        document.getElementById('btnOffline').classList.add('active');
        document.getElementById('cLoc').placeholder = "Location";
    }
}

function selectCategory(el, val) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('cCategory').value = val;
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Note: Simplification - skipping Cropper.js for backend integration for now
            // You can add it back if you wish
            const img = document.getElementById('cImagePreview');
            img.src = e.target.result;
            img.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function openCreateModal() { document.getElementById('createModal').classList.add('visible'); }
function closeCreateModal() { document.getElementById('createModal').classList.remove('visible'); }

function initCreateHandle() {
    const handle = document.getElementById('createHandle');
    const sheet = document.querySelector('#createModal .sheet');
    if(!handle || !sheet) return;
    
    let startY;
    handle.addEventListener('touchstart', e => startY = e.touches[0].clientY, {passive:true});
    handle.addEventListener('touchend', e => {
        if(startY - e.changedTouches[0].clientY < -50) closeCreateModal();
    }, {passive:true});
}