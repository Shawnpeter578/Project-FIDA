/* =========================================
   FIDA: MERGED APP LOGIC (Frontend + API)
   ========================================= */

FidaAPI = {
    // URL Configuration
    BASE_URL: window.location.hostname.includes('koyeb.app') 
        ? 'https://independent-irita-clubspot-9e43f2fa.koyeb.app/api' 
        : 'http://localhost:3000/api',

    getHeaders(isFormData = false) {
        const token = localStorage.getItem('fida_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        if (!isFormData) headers['Content-Type'] = 'application/json';
        return headers;
    },

    auth: {
        async getMe() {
            const token = localStorage.getItem('fida_token');
            if (!token) throw new Error('No token found');
            const res = await fetch(`${FidaAPI.BASE_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Session invalid');
            return await res.json();
        }
    },

    events: {
        async getAll(page = 1, limit = 10) {
            const res = await fetch(`${FidaAPI.BASE_URL}/events?page=${page}&limit=${limit}`);
            return await res.json();
        },
        async create(formData) {
            const res = await fetch(`${FidaAPI.BASE_URL}/events`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('fida_token')}` },
                body: formData
            });
            return await res.json();
        },
        async createOrder(eventId) {
            const res = await fetch(`${FidaAPI.BASE_URL}/events/create-order`, {
                method: 'POST',
                headers: FidaAPI.getHeaders(),
                body: JSON.stringify({ eventId })
            });
            return await res.json();
        },
        async verifyPayment(paymentData) {
            const res = await fetch(`${FidaAPI.BASE_URL}/events/verify-payment`, {
                method: 'POST',
                headers: FidaAPI.getHeaders(),
                body: JSON.stringify(paymentData)
            });
            return await res.json();
        },
        async checkin(eventId, userId) {
            const res = await fetch(`${FidaAPI.BASE_URL}/events/checkin`, {
                method: 'POST',
                headers: FidaAPI.getHeaders(),
                body: JSON.stringify({ eventId, userId })
            });
            return await res.json();
        }
    },

    profile: {
        async loadDetails() {
            const res = await fetch(`${FidaAPI.BASE_URL}/auth/me`, { headers: FidaAPI.getHeaders() });
            return res.ok ? await res.json() : null;
        },
        async update(data) {
            const res = await fetch(`${FidaAPI.BASE_URL}/auth/me`, {
                method: 'PUT',
                headers: FidaAPI.getHeaders(),
                body: JSON.stringify(data)
            });
            return await res.json();
        }
    }
};

// --- GLOBAL STATE ---
let currentUser = null;
let currentEvents = []; 
let joinedEventIds = [];
let html5QrcodeScanner = null;
let currentSearch = '';
let currentFilter = 'ALL';
let currentSlide = 0;
let carouselInterval;
let obStep = 0;
let manualCodeInput = "";
let currentScanningEventId = null;

// --- INITIALIZATION ---
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.classList.add('hidden'), 600);
        }
    }, 1200);

    initCreateHandle();
    startCarousel();

    document.querySelectorAll('.overlay').forEach(o => {
        o.addEventListener('click', e => { if (e.target === o) o.classList.remove('visible'); });
    });
    
    checkAuth();
});

async function checkAuth() {
    const token = localStorage.getItem('fida_token');
    if (!token) { window.location.href = 'login.html'; return; }
    try {
        currentUser = await FidaAPI.auth.getMe();
        joinedEventIds = currentUser.joinedEvents || []; 
        updateUserUI();
        fetchAndRenderFeed();
        if(joinedEventIds.length === 0) setTimeout(() => showOnboarding(), 500);
        switchView('home', document.querySelector('.dock-item:first-child'));
    } catch (e) {
        logout();
    }
}

function logout() {
    localStorage.removeItem('fida_token');
    window.location.href = 'login.html';
}

function updateUserUI() {
    if (!currentUser) return;
    document.getElementById('headerName').innerText = currentUser.name.split(' ')[0].toUpperCase();
    const avatarImg = currentUser.picture ? `<img src="${currentUser.picture}">` : currentUser.name.charAt(0);
    document.getElementById('headerAvatar').innerHTML = avatarImg;
    document.getElementById('settingsAvatarDisplay').innerHTML = avatarImg;
    
    const isOrg = currentUser.role === 'organizer';
    document.getElementById('createBtn').style.display = isOrg ? 'flex' : 'none';
    document.getElementById('hostTab').style.display = isOrg ? 'flex' : 'none';

    document.getElementById('pName').value = currentUser.name || '';
    document.getElementById('pEmail').value = currentUser.email || '';
    document.getElementById('pPhone').value = currentUser.phone || '';
    document.getElementById('pCity').value = currentUser.city || '';
}

// --- FEED & RENDERING ---
let currentPage = 1;
const itemsPerPage = 10;
let isLoadingMore = false;
let hasMoreEvents = true;

async function fetchAndRenderFeed() { await loadFeed(true); }

async function loadFeed(reset = false) {
    if (isLoadingMore) return;
    isLoadingMore = true;
    if (reset) { currentPage = 1; hasMoreEvents = true; currentEvents = []; }

    try {
        const data = await FidaAPI.events.getAll(currentPage, itemsPerPage);
        hasMoreEvents = data.length === itemsPerPage;
        currentEvents = reset ? data : [...currentEvents, ...data];
        renderFeed();
        if (reset) { renderPasses(); renderHostDashboard(); }
    } catch (e) {
        showToast("Could not load feed");
    } finally {
        isLoadingMore = false;
    }
}

function renderFeed() {
    const container = document.getElementById('clubsContainer');
    container.innerHTML = '';
    
    let filtered = currentEvents.filter(item => 
        (item.title.toLowerCase().includes(currentSearch) || 
        (item.location && item.location.toLowerCase().includes(currentSearch)))
    );
    if (currentFilter !== 'ALL') filtered = filtered.filter(item => item.category === currentFilter);

    if(filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">NO SIGNALS FOUND</div>`;
        return;
    }

    filtered.forEach(event => {
        const id = event._id || event.id;
        const isJoined = joinedEventIds.includes(id);
        const isHost = (currentUser && event.creatorId === currentUser._id);
        const isSoldOut = (event.attendees?.length || 0) >= (event.maxAttendees || Infinity);
        
        const priceDisplay = (!event.price || event.price === 0) ? 'FREE' : `₹${event.price}`;
        let btnLabel = isJoined ? 'GOT PASS' : (isSoldOut ? 'FULL' : 'GET PASS');
        let btnAction = `event.stopPropagation(); ${isJoined ? `openDetail('${id}')` : `joinClub('${id}')`}`;
        let btnClass = isSoldOut && !isJoined ? 'sold-out' : '';

        if (isHost) {
            btnLabel = 'MANAGE DROP';
            btnAction = `event.stopPropagation(); switchView('host', document.getElementById('hostTab')); openHostDetail('${id}')`;
            btnClass = 'host-btn';
        }

        container.insertAdjacentHTML('beforeend', `
            <div class="ticket ${isJoined ? 'joined' : ''}" onclick="openDetail('${id}')">
                <div class="ticket-inner">
                    <div class="ticket-status-bar"></div>
                    <div class="ticket-bg-num">0${id.toString().slice(-2)}</div>
                    <div class="ticket-content">
                        <div class="t-header">
                            <div class="t-title">${event.title}</div>
                            <div style="display:flex; gap:6px;">
                                <div class="t-loc">${event.mode === 'online' ? '🌐' : '📍'} ${event.location || 'TBA'}</div>
                                <div class="t-loc" style="background:var(--border);">${event.category || 'EVENT'}</div>
                            </div>
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
                        <button ${isSoldOut && !isJoined && !isHost ? 'disabled' : ''} class="btn-action ${btnClass}" onclick="${btnAction}">${btnLabel}</button>
                    </div>
                </div>
            </div>
        `);
    });
}

function renderPasses() {
    const container = document.getElementById('passesContainer');
    container.innerHTML = '';
    const myEvents = currentEvents.filter(e => joinedEventIds.includes(e._id || e.id));
    if(myEvents.length === 0) {
        container.innerHTML = '<div class="empty-state">No active passes.</div>';
        return;
    }
    myEvents.forEach(event => {
        const id = event._id || event.id;
        container.insertAdjacentHTML('beforeend', `
            <div class="pass-card" onclick="openDetail('${id}')">
                <div class="pass-top-row">
                    <div class="pass-date">${formatDate(event.date)} • ${event.time}</div>
                    <div class="pass-status-pill">ACTIVE</div>
                </div>
                <div>
                    <div class="pass-title">${event.title}</div>
                    <div class="pass-loc">${event.mode === 'online' ? '🌐' : '📍'} ${event.location}</div>
                </div>
                <div class="pass-actions">
                    <button class="btn-pass-action" onclick="event.stopPropagation(); showUserQR('${id}', '${event.title.replace(/'/g, "\\'")}')">
                        <svg class="icon-sm" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        SCAN ENTRY
                    </button>
                </div>
            </div>
        `);
    });
}

function renderHostDashboard() {
    const container = document.getElementById('hostContainer');
    container.innerHTML = '';
    if(!currentUser) return;
    const hostedEvents = currentEvents.filter(x => x.creatorId === currentUser._id);
    if(hostedEvents.length === 0) {
        container.innerHTML = '<div class="empty-state">No drops found.</div>';
        return;
    }
    hostedEvents.forEach(event => {
        container.insertAdjacentHTML('beforeend', `
            <div class="ticket" onclick="openHostDetail('${event._id}')">
                <div class="ticket-inner"><div class="ticket-content">
                    <div class="t-header"><div class="t-title">${event.title}</div><div class="t-loc">Guests: ${event.attendees?.length || 0}</div></div>
                    <div class="t-desc">Tap to manage access.</div>
                </div></div>
            </div>
        `);
    });
}

// --- ACTIONS ---

function openDetail(id) {

    const event = currentEvents.find(e => (e._id || e.id) === id);

    if(!event) return;

    

    const isJoined = joinedEventIds.includes(id);

    const modal = document.getElementById('detailsModal') || createModal('detailsModal');

    const content = modal.querySelector('.sheet-body') || modal;

    

    const priceDisplay = (!event.price) ? 'FREE' : `₹${event.price}`;

    const hostName = event.creatorName || 'Unknown';



    content.innerHTML = `

        <img src="${event.image || ''}" class="detail-cover" style="${!event.image ? 'display:none' : ''}">

        <h2 style="font-size:2rem; font-weight:800; margin-bottom:8px;">${event.title}</h2>

        <div style="display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap;">

            <span class="t-loc">📍 ${event.location || 'TBA'}</span>

            <span class="t-loc">📅 ${formatDate(event.date)} @ ${event.time}</span>

            <span class="t-loc">👤 ${hostName}</span>

        </div>

        <p style="color:var(--text-sec); line-height:1.6; margin-bottom:32px;">${event.description || 'No description provided.'}</p>

        <button class="btn-main" onclick="${isJoined ? `switchView('passes', document.querySelectorAll('.dock-item')[1])` : `joinClub('${id}')`}">

            ${isJoined ? 'VIEW PASS' : `GET PASS • ${priceDisplay}`}

        </button>

    `;

    modal.classList.add('visible');

}



function showUserQR(id, title) {

    const modal = document.getElementById('qrDisplayModal') || createModal('qrDisplayModal');

    const target = document.getElementById('qrModalTarget');

    target.innerHTML = '';

    

    const payload = `${id}-${currentUser._id}`;

    new QRCode(target, {

        text: payload,

        width: 200,

        height: 200,

        colorDark : "#000000",

        colorLight : "#ffffff",

        correctLevel : QRCode.CorrectLevel.H

    });

    

    document.getElementById('qrPassTitle').innerText = title;

    document.getElementById('qrPassUser').innerText = currentUser.name.toUpperCase();

    modal.classList.add('visible');

}



function startScanner() {

    document.getElementById('scannerModal').classList.add('visible');

    if(!html5QrcodeScanner) {

        html5QrcodeScanner = new Html5Qrcode("reader");

    }

    const config = { fps: 15, qrbox: { width: 250, height: 250 } };

    html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess)

        .catch(() => showToast("Camera Error"));

}



function stopScanner() {

    if(html5QrcodeScanner) {

        html5QrcodeScanner.stop().then(() => html5QrcodeScanner.clear()).catch(console.log);

    }

    document.getElementById('scannerModal').classList.remove('visible');

}



async function onScanSuccess(decodedText) {

    stopScanner();

    const [eventId, userId] = decodedText.split('-');

    if(!eventId || !userId) return showToast("Invalid QR");

    

    const res = await FidaAPI.events.checkin(eventId, userId);

    if(res.success) {

        showToast("ACCESS GRANTED");

        fetchAndRenderFeed();

    } else showToast(res.error);

}



// --- UTILS ---

function startCarousel() {

    const track = document.getElementById('heroTrack');

    if(!track) return;

    

    const slides = track.querySelectorAll('.hero-slide');

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if(entry.isIntersecting) {

                const index = Array.from(slides).indexOf(entry.target);

                currentSlide = index;

                slides.forEach(s => s.classList.remove('in-view'));

                entry.target.classList.add('in-view');

            }

        });

    }, { threshold: 0.6 });

    slides.forEach(s => observer.observe(s));



    carouselInterval = setInterval(() => {

        currentSlide = (currentSlide + 1) % slides.length;

        track.scrollTo({ left: track.offsetWidth * currentSlide, behavior: 'smooth' });

    }, 5000);

}



function initCreateHandle() {

    const handle = document.getElementById('createHandle');

    if(!handle) return;

    let startY;

    handle.addEventListener('touchstart', e => startY = e.touches[0].clientY);

    handle.addEventListener('touchend', e => {

        if(startY - e.changedTouches[0].clientY < -50) closeCreateModal();

    });

}



function createModal(id) {

    // Helper if modal missing from DOM (fallback)

    const m = document.createElement('div');

    m.id = id; m.className = 'overlay';

    m.innerHTML = '<div class="sheet"><div class="sheet-handle"></div><div class="sheet-body"></div></div>';

    document.body.appendChild(m);

    m.addEventListener('click', e => { if(e.target === m) m.classList.remove('visible'); });

    return m;
}

/* --- RESTORED UTILS --- */

function switchView(viewName, btnEl) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));

    const target = document.getElementById('view' + viewName.charAt(0).toUpperCase() + viewName.slice(1));
    if (target) target.classList.add('active');
    
    if (btnEl) btnEl.classList.add('active');
    
    if (viewName === 'home') fetchAndRenderFeed(false);
    if (viewName === 'passes') renderPasses();
    if (viewName === 'host') renderHostDashboard();
}

function handleSearch(val) {
    currentSearch = val.toLowerCase();
    renderFeed();
}

function openFilterModal() {
    const m = document.getElementById('filterModal');
    if(m) m.classList.add('visible');
    else showToast("Filter unavailable");
}

function closeCreateModal() {
    const m = document.getElementById('createModal');
    if(m) m.classList.remove('visible');
}

function showToast(msg, type='info') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerText = msg;
    document.body.appendChild(t);
    
    // Inline styles for reliability
    Object.assign(t.style, {
        position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '12px 24px',
        borderRadius: '30px', zIndex: '9999', opacity: '0', transition: 'opacity 0.3s',
        fontFamily: 'var(--font-main, sans-serif)', fontSize: '0.9rem'
    });
    
    requestAnimationFrame(() => t.style.opacity = '1');
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

async function saveProfile(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';

    const data = {
        name: document.getElementById('pName').value,
        phone: document.getElementById('pPhone').value,
        city: document.getElementById('pCity').value
    };

    try {
        const res = await FidaAPI.profile.update(data);
        if(res.success) {
            currentUser = res.user;
            localStorage.setItem('fida_user', JSON.stringify(currentUser));
            updateUserUI();
            showToast('Profile Updated');
        } else {
            showToast(res.error || 'Update failed');
        }
    } catch(err) {
        showToast('Network Error');
    }
    btn.innerText = originalText;
}

function formatDate(dStr) {
    if(!dStr) return '';
    const options = { month: 'short', day: 'numeric' };
    return new Date(dStr).toLocaleDateString('en-US', options);
}

// Global Expose
window.switchView = switchView;
window.handleSearch = handleSearch;
window.saveProfile = saveProfile;
window.showToast = showToast;
window.closeCreateModal = closeCreateModal;
window.openFilterModal = openFilterModal;
window.formatDate = formatDate;
