/* =========================================
     LOGIC CORE (CONNECTED)
   ========================================= */

const API_URL = 'https://sour-loralee-sfdgs-4f800a41.koyeb.app/api'; // Change to your production URL when deploying
let currentUser = null;
let currentEvents = []; // Cache for events to support filtering/scanning locally
let joinedEventIds = [];
let html5QrcodeScanner = null;
let currentSearch = '';

// --- INITIALIZATION ---
window.addEventListener('load', () => {
    // Splash Screen
    setTimeout(() => document.getElementById('splashScreen').style.opacity = '0', 1200);
    setTimeout(() => document.getElementById('splashScreen').style.visibility = 'hidden', 1800);

    // Initialize UI Handlers
    initCreateHandle();
    document.querySelectorAll('.overlay').forEach(o => {
        o.addEventListener('click', e => { if (e.target === o) o.classList.remove('visible'); });
    });

    // Initialize Google Auth (New)
    initGoogleAuth();
    
    // Check for existing session
    checkAuth();
});

function initGoogleAuth() {
    // This function assumes the Google Script is loaded in index.html
    // We will initialize it dynamically if needed or rely on the HTML attributes
    // But since we need to handle the credential response in JS:
    if(window.google) {
        google.accounts.id.initialize({
            client_id: "611302719944-4fn2hr7i1l9tn2chvu9719pngbcpgrau.apps.googleusercontent.com", // REPLACE THIS
            callback: handleGoogleResponse
        });
        google.accounts.id.renderButton(
            document.getElementById("googleBtnContainer"),
            { theme: "outline", size: "large", width: "100%" }
        );
    }
}

// --- AUTHENTICATION ---

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
            toast(`Welcome, ${data.user.name}`);
            checkAuth();
        } else {
            toast('Login Failed');
        }
    } catch(e) {
        console.error(e);
        toast('Connection Error');
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
            joinedEventIds = currentUser.joinedEvents || []; // Sync joined events
            hideAuthScreen();
            updateUserUI();
            fetchAndRenderFeed();
        } else {
            // Token invalid
            logout();
        }
    } catch (e) {
        console.error(e);
        // If network error, maybe keep them logged in or show offline mode? 
        // For now, let's show auth screen
        showAuthScreen();
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
    
    // Reset View
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById('viewHome').classList.add('active');
    
    showAuthScreen();
    
    // Re-render Google Button if necessary
    if(window.google) {
        google.accounts.id.renderButton(
            document.getElementById("googleBtnContainer"),
            { theme: "outline", size: "large", width: "100%" }
        );
    }
}

function updateUserUI() {
    if (!currentUser) return;
    const firstName = currentUser.name.split(' ')[0].toUpperCase();
    document.getElementById('headerName').innerText = firstName;
    
    const avatarHtml = currentUser.picture 
        ? `<img src="${currentUser.picture}">` 
        : firstName.charAt(0);
        
    document.getElementById('headerAvatar').innerHTML = avatarHtml;
    
    // Settings Page
    document.getElementById('settingsName').innerText = currentUser.name;
    document.getElementById('settingsEmail').innerText = currentUser.email || 'Google Account'; // Google Auth might not always return email in the 'me' object depending on scope, but usually does in token
    document.getElementById('settingsAvatar').innerHTML = currentUser.picture 
        ? `<img src="${currentUser.picture}" style="width:100%;height:100%;object-fit:cover;">` 
        : firstName.charAt(0);
}

// --- DATA FETCHING & RENDERING ---

async function fetchAndRenderFeed() {
    try {
        const res = await fetch(`${API_URL}/events`);
        const data = await res.json();
        currentEvents = data; // Cache for other views
        renderFeed();
    } catch (e) {
        console.error("Failed to fetch events", e);
        toast("Could not load feed");
    }
}

function renderFeed() {
    const c = document.getElementById('clubsContainer'); 
    c.innerHTML = '';
    
    // Filter
    let data = currentEvents.filter(item => 
        item.title.toLowerCase().includes(currentSearch) || 
        (item.location && item.location.toLowerCase().includes(currentSearch))
    );

    if(data.length === 0) {
        c.innerHTML = `<div class="empty-state">NO SIGNALS FOUND</div>`;
        return;
    }

    data.forEach(item => {
        // Note: MongoDB uses _id, frontend mock used id. We map _id to id for consistency if needed, or just use _id.
        const id = item._id; 
        const isJoined = joinedEventIds.includes(id);
        
        // Format Date
        const dateObj = new Date(item.date);
        const dateStr = dateObj.toLocaleDateString('en-US', {month:'short', day:'numeric'});
        
        const html = `
        <div class="ticket ${isJoined ? 'joined' : ''}" onclick="openDetail('${id}')">
            <div class="ticket-inner">
                <div class="ticket-status-bar"></div>
                <div class="ticket-content">
                    <div class="ticket-bg-num">${id.toString().substring(id.toString().length - 2)}</div>
                    <div class="t-header">
                        <h3 class="t-title">${item.title}</h3>
                        <div class="t-loc">
                            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 
                            ${item.location || 'Unknown Loc'}
                        </div>
                    </div>
                    <p class="t-desc">${item.description || ''}</p>
                    <div class="t-info-grid">
                        <div class="t-cell"><label>DATE</label><div>${dateStr}</div></div>
                        <div class="t-cell"><label>TIME</label><div>${item.time}</div></div>
                        <div class="t-cell t-price">${item.category || 'Event'}</div>
                    </div>
                </div>
                <div class="ticket-rip"><div class="rip-line"></div></div>
                <div class="ticket-stub">
                    <div class="ticket-stub-inner" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <div class="stub-code">*${id.toString().substring(0,4).toUpperCase()}*</div>
                        <button class="btn-action" onclick="event.stopPropagation(); ${isJoined ? `openDetail('${id}')` : `joinClub('${id}')`}">${isJoined ? 'View Pass' : 'Join Drop'}</button>
                    </div>
                </div>
            </div>
        </div>`;
        c.insertAdjacentHTML('beforeend', html);
    });
}

function renderPasses() {
    const c = document.getElementById('passesContainer'); c.innerHTML = '';
    const data = currentEvents.filter(x => joinedEventIds.includes(x._id));
    
    if(data.length === 0) {
        c.innerHTML = `<div class="empty-state">NO PASSES ACQUIRED<br>Join events to populate this grid.</div>`;
        return;
    }

    data.forEach(item => {
        const id = item._id;
        const html = `
        <div class="ticket joined" onclick="openDetail('${id}')">
            <div class="ticket-inner">
                <div class="ticket-status-bar"></div>
                <div class="ticket-content">
                    <div class="ticket-bg-num">${id.toString().substring(id.toString().length-2)}</div>
                    <h3 class="t-title">${item.title}</h3>
                    <div class="t-loc">${item.location || 'Unknown Loc'}</div>
                    <div style="margin-top:20px; text-align:center; padding:10px; background:var(--bg-card-sub); border-radius:12px; border:1px dashed var(--border-strong);">
                            <div style="font-family:var(--font-barcode); font-size:1.5rem; opacity:0.5;">${id.toString().toUpperCase()}</div>
                            <div style="font-size:0.8rem; font-weight:700; color:var(--accent);">ACCESS GRANTED</div>
                    </div>
                </div>
            </div>
        </div>`;
        c.insertAdjacentHTML('beforeend', html);
    });
}

function renderHostDashboard() {
    const c = document.getElementById('hostContainer'); c.innerHTML = '';
    
    // Filter events where creatorId matches current user ID
    if(!currentUser) return;
    
    const hostedEvents = currentEvents.filter(x => x.creatorId === currentUser._id);

    if(hostedEvents.length === 0) {
        c.innerHTML = `<div class="empty-state">NO HOSTED EVENTS<br>Create a drop to track attendees here.</div>`;
        return;
    }

    hostedEvents.forEach(item => {
        const html = `
        <div class="ticket" onclick="openHostDetail('${item._id}')">
            <div class="ticket-inner">
                <div class="ticket-content">
                    <h3 class="t-title">${item.title}</h3>
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:10px;">
                        <div>
                            <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">DATE</div>
                            <div style="font-family:var(--font-mono); font-weight:600;">${item.date}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:2.5rem; font-weight:700; color:var(--text-main); line-height:1;">${item.attendees ? item.attendees.length : 0}</div>
                            <div style="font-size:0.8rem; color:var(--accent); font-weight:700;">MEMBERS JOINED</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        c.insertAdjacentHTML('beforeend', html);
    });
}

// --- ACTIONS (CREATE, JOIN) ---

async function handleCreate(e) {
    e.preventDefault();
    const token = localStorage.getItem('fida_token');
    
    const payload = {
        title: document.getElementById('cName').value,
        description: document.getElementById('cDesc').value,
        date: document.getElementById('cDate').value,
        time: document.getElementById('cTime').value,
        location: document.getElementById('cLoc').value,
        category: document.getElementById('cPrice').value || 'General', // Using price input for category or price text
        image: document.getElementById('cImagePreview').src || null
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
            toast('Drop Published');
            closeCreateModal();
            e.target.reset();
            document.getElementById('cImagePreview').style.display='none';
            // Refresh Feed
            fetchAndRenderFeed();
            // Switch to host view
            switchView('host', document.querySelectorAll('.dock-item')[3]);
        } else {
            toast(data.error || 'Creation Failed');
        }
    } catch(err) {
        toast('Network Error');
    }
}

async function joinClub(id) {
    const token = localStorage.getItem('fida_token');
    if(joinedEventIds.includes(id)) return;

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
            joinedEventIds.push(id); // Optimistic UI update
            
            // Refetch to ensure backend sync
            checkAuth(); // This refreshes currentUser and joinedEvents
            
            toast('Pass Generated');
            if(document.getElementById('detailsModal').classList.contains('visible')) openDetail(id);
            else renderFeed();
        } else {
            toast(data.error || 'Join Failed');
        }
    } catch(err) {
        toast('Network Error');
    }
}

// Note: Backend does not explicitly support "Leaving" an event in the provided app.js
// So we will hide the "Unjoin" button or implement it only if backend supports it.
// For now, we will just show "Joined" state.

// --- DETAILS & MODALS ---

function openDetail(id) {
    const item = currentEvents.find(x => x._id === id);
    if(!item) return;

    const isJoined = joinedEventIds.includes(id);
    // QR Code format: eventId-userId
    const qrData = `${id}-${currentUser._id}`;
    const qrUrl = isJoined ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}` : '';
    
    document.getElementById('detailsContent').innerHTML = `
        ${item.image ? `<img src="${item.image}" class="detail-cover">` : ''}
        <h1 style="font-size:2.2rem; font-weight:800; line-height:1; margin-bottom:16px; letter-spacing: -0.04em;">${item.title}</h1>
        <p style="color:var(--text-sec); line-height:1.6; margin-bottom:32px; font-size:1.05rem;">${item.description || 'No details provided.'}</p>
        
        <div style="background:var(--bg-card-sub); padding:20px; border-radius:20px; border:1px solid var(--border-strong); margin-bottom:32px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                <span style="color:var(--text-muted); font-weight:600; font-size:0.9rem;">LOCATION</span>
                <span style="font-weight:600; font-family:var(--font-mono);">${item.location || 'TBA'}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted); font-weight:600; font-size:0.9rem;">START TIME</span>
                <span style="font-weight:600; font-family:var(--font-mono);">${item.time}</span>
            </div>
        </div>

        ${isJoined ? `
            <div style="text-align:center; padding:24px; border:1px dashed var(--accent); background:rgba(255, 42, 42, 0.04); border-radius:24px; margin-bottom:32px;">
                <div style="background:white; padding:10px; border-radius:12px; display:inline-block; margin-bottom:12px;">
                    <img src="${qrUrl}" style="width:140px; height:140px; display:block;">
                </div>
                <div style="font-family:var(--font-barcode); font-size:2rem; opacity:0.8; letter-spacing:0.05em;">ENTRY PASS</div>
                <div style="font-size:0.8rem; color:var(--text-sec); margin-top:8px; font-weight:600;">SHOW TO HOST</div>
            </div>
            ` : `
            <div style="text-align:center; padding:20px; color:var(--text-sec); font-size:0.9rem; margin-bottom:20px;">Join to reveal entry code.</div>
            <button class="btn-main" onclick="joinClub('${id}')">JOIN DROP • ${item.category || 'Free'}</button>
        `}
    `;
    document.getElementById('detailsModal').classList.add('visible');
}

function openHostDetail(id) {
    const item = currentEvents.find(x => x._id === id);
    if(!item) return;

    // Backend doesn't return full user details in "attendees" array (it returns IDs).
    // In a real app, we would need a backend endpoint like /api/events/:id/attendees
    // For this strict integration, we can only show the count unless we fetch users.
    // Displaying count for now.
    
    document.getElementById('hostDetailContent').innerHTML = `
        <h2 style="font-size:1.5rem; font-weight:800; margin-bottom:4px;">${item.title}</h2>
        <div style="color:var(--text-sec); margin-bottom:24px;">Guest List</div>
        <div style="padding:20px; text-align:center; border:1px dashed var(--border-strong); border-radius:12px;">
            <div style="font-size:2rem; font-weight:700;">${item.attendees ? item.attendees.length : 0}</div>
            <div style="color:var(--text-muted);">Total Attendees</div>
            <div style="font-size:0.8rem; margin-top:10px; color:var(--text-muted);">Detailed guest list requires backend expansion.</div>
        </div>
    `;
    document.getElementById('hostDetailModal').classList.add('visible');
}

// --- UTILS & UI HELPERS (Unchanged mostly) ---

function switchView(viewName, el) {
    document.querySelectorAll('.dock-item').forEach(i => i.classList.remove('active'));
    if(el) el.classList.add('active');
    
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    
    if(viewName === 'home') {
        document.getElementById('viewHome').classList.add('active');
        renderFeed();
    } else if (viewName === 'passes') {
        document.getElementById('viewPasses').classList.add('active');
        renderPasses();
    } else if (viewName === 'host') {
        document.getElementById('viewHost').classList.add('active');
        renderHostDashboard();
    } else if (viewName === 'settings') {
        document.getElementById('viewSettings').classList.add('active');
        updateUserUI();
    }
    window.scrollTo({top:0, behavior:'smooth'});
}

function handleSearch(val) {
    currentSearch = val.toLowerCase();
    renderFeed();
}

function openCreateModal() { document.getElementById('createModal').classList.add('visible'); }
function closeCreateModal() {
    const m = document.getElementById('createModal');
    m.classList.remove('visible');
    setTimeout(() => {
        const s = m.querySelector('.sheet');
        s.classList.remove('expanded');
        s.classList.remove('maximized');
    }, 500);
}
function previewImage(inpt) {
    if(inpt.files[0]) {
        const r = new FileReader();
        r.onload = e => {
            document.getElementById('cImagePreview').src = e.target.result;
            document.getElementById('cImagePreview').style.display = 'block';
        };
        r.readAsDataURL(inpt.files[0]);
    }
}
function toast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}
function updateAvatar(input) {
    // Backend doesn't support avatar update yet, only Google avatar
    toast("Avatar managed by Google Account");
}

// --- SCANNER (Client-Side Verification Logic) ---
// Note: This verifies the QR code format, but cannot verify if the user *actually* exists 
// without an endpoint to check "is User X in Event Y".
// We will do a basic check against the pattern.

function startScanner() {
    document.getElementById('scannerModal').classList.add('visible');
    if(!html5QrcodeScanner) html5QrcodeScanner = new Html5Qrcode("reader");
    
    html5QrcodeScanner.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        (err) => {}
    ).catch(err => toast("Camera error"));
}

function stopScanner() {
    if(html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => {
            document.getElementById('scannerModal').classList.remove('visible');
        }).catch(err => document.getElementById('scannerModal').classList.remove('visible'));
    } else {
        document.getElementById('scannerModal').classList.remove('visible');
    }
}

function onScanSuccess(decodedText, decodedResult) {
    // Expected: eventId-userId
    const splitIndex = decodedText.indexOf('-');
    if(splitIndex === -1) {
        showScanResult('error', 'Invalid Ticket');
        return;
    }
    
    const eventId = decodedText.substring(0, splitIndex);
    const userId = decodedText.substring(splitIndex + 1);
    
    // Check if I am the host of this event
    const event = currentEvents.find(c => c._id === eventId);
    
    if (!event) {
        showScanResult('error', 'Event Not Found');
        return;
    }
    
    if (event.creatorId !== currentUser._id) {
        showScanResult('error', 'Wrong Event Host');
        return;
    }
    
    // Check if scanned user is in attendees list
    if (event.attendees.includes(userId)) {
         showScanResult('success', 'ACCESS GRANTED');
    } else {
        showScanResult('error', 'Not on Guest List');
    }
}

function showScanResult(status, msg) {
    if(html5QrcodeScanner) try{ html5QrcodeScanner.pause(); }catch(e){}
    
    const m = document.getElementById('scanResultModal');
    const icon = document.getElementById('scanIcon');
    const txt = document.getElementById('scanStatus');
    const sub = document.getElementById('scanName');
    
    m.classList.add('visible');
    sub.innerText = msg;
    
    if(status === 'success') {
        icon.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
        icon.style.color = 'var(--success)';
        icon.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        txt.innerText = 'VALID';
        txt.style.color = 'var(--success)';
    } else {
        icon.style.backgroundColor = 'rgba(230, 25, 25, 0.2)';
        icon.style.color = 'var(--accent)';
        icon.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        txt.innerText = 'INVALID';
        txt.style.color = 'var(--accent)';
    }
}

function closeResultAndScan() {
    document.getElementById('scanResultModal').classList.remove('visible');
    startScanner();
}

// Drag handle logic
function initCreateHandle() {
    const cHandle = document.getElementById('createHandle');
    const cSheet = document.querySelector('#createModal .sheet');
    if(!cHandle || !cSheet) return;
    
    let startY;
    cHandle.addEventListener('touchstart', e => startY = e.touches[0].clientY, {passive:true});
    cHandle.addEventListener('touchend', e => {
        const diff = startY - e.changedTouches[0].clientY;
        if(diff > 50) cSheet.classList.add('expanded');
        else if(diff < -50) closeCreateModal();
    }, {passive:true});

}
