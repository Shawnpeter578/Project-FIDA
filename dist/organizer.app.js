/**
 * GigByCity Pro Console
 * Core Logic for Organizer Dashboard
 */

class OrganizerConsole {
    constructor() {
        this.token = localStorage.getItem('fida_token');
        this.user = JSON.parse(localStorage.getItem('fida_user') || '{}');
        this.events = [];
        this.activeEventId = null;
        this.scanner = null;
        this.isScanning = false;

        this.init();
    }

    async init() {
        // 1. Security Check
        if (!this.token || this.user.role !== 'organizer') {
            window.location.href = '/login.html';
            return;
        }

        // 2. Setup UI
        this.setupNavigation();
        this.setupCreateForm();
        this.setupImagePreview();

        // 3. Load Data
        await this.fetchData();
        this.renderDashboard();
    }

    // --- DATA LAYER ---

    async fetchData() {
        try {
            const res = await fetch('/api/events', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (!res.ok) throw new Error('Failed to load events');
            
            const allEvents = await res.json();
            // Filter for events created by this user
            this.events = allEvents.filter(e => e.creatorId === this.user._id);
        } catch (e) {
            console.error(e);
            this.showToast('Network Error', 'error');
        }
    }

    // --- UI RENDERING ---

    setupNavigation() {
        // Tab Switching
        window.switchTab = (tabName, btn) => {
            // Update Nav
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            if(btn) btn.classList.add('active');

            // Update Views
            document.querySelectorAll('section').forEach(el => el.style.display = 'none');
            const target = document.getElementById(`tab-${tabName}`);
            if(target) target.style.display = 'block';

            // Specific Renderers
            if (tabName === 'events') this.renderEvents();
            if (tabName === 'dashboard') this.renderDashboard();
        };

        // Modal Logic
        window.openCreateModal = () => document.getElementById('create-modal').classList.add('active');
        window.closeModal = () => document.getElementById('create-modal').classList.remove('active');
        window.toggleScanner = () => this.toggleScanner();
        
        // Settings
        window.openAboutModal = () => document.getElementById('about-modal').classList.add('active');
    }

    renderDashboard() {
        let revenue = 0;
        let ticketsSold = 0;
        let recentActivity = [];

        this.events.forEach(e => {
            const attendeeCount = e.attendees ? e.attendees.length : 0;
            ticketsSold += attendeeCount;
            revenue += (attendeeCount * (e.price || 0));

            // Aggregated Activity Logic
            if (e.attendees && e.attendees.length > 0) {
                 const groups = {};
                 e.attendees.forEach(a => {
                    // Use paymentId for grouping transactions. 
                    // If paymentId is missing (free event or old data), fall back to unique ticketId.
                    const key = a.paymentId || a.ticketId || `single_${Math.random()}`;
                    
                    if (!groups[key]) {
                        groups[key] = {
                            name: a.name || 'Guest',
                            count: 0,
                            time: a.joinedAt || new Date(),
                            isPaid: !!a.paymentId,
                            eventTitle: e.title
                        };
                    }
                    groups[key].count++;
                 });

                 Object.values(groups).forEach(g => {
                    let text = '';
                    if (g.count > 1) {
                        text = `${g.name} bought <span style="color:var(--text-main); font-weight:700;">${g.count} tickets</span> for ${g.eventTitle}`;
                    } else {
                        text = `${g.name} ${g.isPaid ? 'bought a ticket for' : 'joined'} ${g.eventTitle}`;
                    }

                    recentActivity.push({
                        text: text,
                        time: g.time
                    });
                 });
            }
        });

        // Sort activity by time desc
        recentActivity.sort((a,b) => new Date(b.time) - new Date(a.time));

        // Animate & Update
        this.animateValue('dashRev', revenue, '$');
        this.animateValue('dashTix', ticketsSold, '');

        // Render Feed
        const feedContainer = document.getElementById('activity-feed');
        if (recentActivity.length === 0) {
            feedContainer.innerHTML = '<div class="text-sec text-sm" style="text-align:center;">No recent activity.</div>';
        } else {
            feedContainer.innerHTML = recentActivity.slice(0, 5).map(act => `
                <div class="list-card" style="padding:12px; cursor:default;">
                    <div style="width:32px; height:32px; background:var(--input-bg); border-radius:50%; display:flex; align-items:center; justify-content:center;">🔔</div>
                    <div class="list-info">
                        <div class="list-title" style="font-size:0.9rem;">${act.text}</div>
                        <div class="list-sub">${new Date(act.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    renderEvents() {
        const list = document.getElementById('event-list-container');
        if (this.events.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-ter);">No events yet. Create one!</div>`;
            return;
        }

        list.innerHTML = this.events.map(e => `
            <div class="list-card" onclick="app.goToEventGuests('${e._id}')">
                <img src="${e.image || ''}" class="list-thumb" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect width=%221%22 height=%221%22 fill=%22%23ddd%22/></svg>'">
                <div class="list-info">
                    <div class="list-title">${e.title}</div>
                    <div class="list-sub">${new Date(e.date).toLocaleDateString()} • ${e.attendees ? e.attendees.length : 0} Guests</div>
                </div>
                <div style="color:var(--text-ter);">→</div>
            </div>
        `).join('');
    }

    goToEventGuests(eventId) {
        this.activeEventId = eventId;
        const evt = this.events.find(e => e._id === eventId);
        
        document.getElementById('guest-event-title').innerText = evt.title;
        document.getElementById('guest-subtitle').innerText = "Managing Guest List";
        
        // Manually switch tab to 'guests'
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-item')[3].classList.add('active'); // Index 3 is Guests
        
        document.querySelectorAll('section').forEach(el => el.style.display = 'none');
        document.getElementById('tab-guests').style.display = 'block';

        this.renderGuests();
    }

    renderGuests(filterText = '') {
        const container = document.getElementById('guest-list-container');
        if (!this.activeEventId) return;

        const evt = this.events.find(e => e._id === this.activeEventId);
        const attendees = evt.attendees || [];
        
        // Filter
        const filtered = attendees.filter(a => {
            const searchStr = (a.name + a.userId).toLowerCase();
            return searchStr.includes(filterText.toLowerCase());
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-ter);">No guests found.</div>`;
            return;
        }

        container.innerHTML = filtered.map(a => {
            const isChecked = a.status === 'checked-in';
            const initials = (a.name || 'G').charAt(0).toUpperCase();
            
            return `
            <div class="list-card" style="cursor:default">
                <div style="width:40px; height:40px; background:var(--border); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem;">${initials}</div>
                <div class="list-info">
                    <div class="list-title" style="font-size:0.95rem;">${a.name || 'Unknown Guest'}</div>
                    <div class="list-sub">ID: ...${a.userId.slice(-4)}</div>
                </div>
                <button style="border:none; background:${isChecked ? 'var(--input-bg)' : 'var(--primary)'}; color:${isChecked ? 'var(--text-ter)' : 'var(--primary-inv)'}; padding:8px 16px; border-radius:20px; font-size:0.8rem; font-weight:600;" onclick="app.manualCheckin('${a.userId}', '${a.name}')">
                    ${isChecked ? 'Arrived' : 'Check In'}
                </button>
            </div>`;
        }).join('');
    }

    async manualCheckin(userId, userName) {
        // Optimistic UI update could happen here, but lets stick to source of truth
        const res = await this.performCheckin(this.activeEventId, userId);
        if (res.success) {
            await this.fetchData();
            this.renderGuests(); // Re-render to show updated status
            this.showToast(`Checked in ${userName}`, 'success');
        } else {
            this.showToast(res.error, 'error');
        }
    }

    // --- ACTIONS ---

    setupCreateForm() {
        window.handleCreate = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = 'Creating...';
            btn.disabled = true;

            const formData = new FormData();
            formData.append('title', document.getElementById('cTitle').value);
            formData.append('description', document.getElementById('cDesc').value);
            formData.append('location', document.getElementById('cLoc').value);
            formData.append('date', document.getElementById('cDate').value);
            formData.append('time', document.getElementById('cTime').value);
            formData.append('price', document.getElementById('cPrice').value || 0);
            formData.append('maxAttendees', document.getElementById('cMax').value || 100);
            formData.append('category', 'PARTY');
            formData.append('mode', 'offline');

            const imgData = document.getElementById('cImgData').value;
            if (imgData) {
                const blob = await (await fetch(imgData)).blob();
                formData.append('image', blob, 'cover.jpg');
            }

            try {
                const res = await fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.token}` },
                    body: formData
                });
                
                if (res.ok) {
                    window.closeModal();
                    e.target.reset();
                    document.getElementById('preview-final').style.display = 'none';
                    document.getElementById('upload-placeholder').style.display = 'flex';
                    await this.fetchData();
                    this.renderDashboard();
                    this.showToast('Event Created Successfully', 'success');
                } else {
                    const data = await res.json();
                    this.showToast(data.error || 'Failed to create', 'error');
                }
            } catch (err) {
                this.showToast('Server connection error', 'error');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        };
        
        // Search Handler
        window.filterGuests = (val) => this.renderGuests(val);
    }

    setupImagePreview() {
        window.onImageSelect = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const img = document.getElementById('preview-final');
                    img.src = evt.target.result;
                    img.style.display = 'block';
                    document.getElementById('upload-placeholder').style.display = 'none';
                    document.getElementById('cImgData').value = evt.target.result; // Simple pass-through, no crop logic in this simplified version
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // --- SCANNER ---

    toggleScanner() {
        const overlay = document.getElementById('scanner-overlay');
        if (this.isScanning) {
            // Stop
            this.isScanning = false;
            overlay.classList.remove('active');
            if (this.scanner) {
                this.scanner.stop().then(() => this.scanner.clear());
            }
        } else {
            // Start
            this.isScanning = true;
            overlay.classList.add('active');
            
            this.scanner = new Html5Qrcode("reader");
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            
            this.scanner.start(
                { facingMode: "environment" },
                config,
                (decodedText) => this.onScanSuccess(decodedText)
            ).catch(err => {
                this.isScanning = false;
                overlay.classList.remove('active');
                this.showToast('Camera access denied', 'error');
            });
        }
    }

    async onScanSuccess(decodedText) {
        if (!this.isScanning) return;
        
        // Pause to prevent double scan
        this.scanner.pause();

        const [eid, uid] = decodedText.split('-');
        
        // Call backend with ID directly
        const res = await this.performCheckin(eid, uid);
        
        this.showScanResult(res.success, res.message || res.error);
        
        // Resume after delay
        setTimeout(() => {
            document.getElementById('scan-pop').classList.remove('show');
            if (this.isScanning) this.scanner.resume();
        }, 2000);
    }

    async performCheckin(eventId, userId) {
        try {
            const res = await fetch('/api/events/checkin', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ eventId, userId })
            });
            const data = await res.json();
            if (res.ok) {
                // Update local state
                await this.fetchData();
                return { success: true, message: 'Access Granted' };
            } else {
                return { success: false, error: data.error || 'Check-in Failed' };
            }
        } catch (e) {
            return { success: false, error: 'Network Error' };
        }
    }

    showScanResult(success, msg) {
        const pop = document.getElementById('scan-pop');
        const title = document.getElementById('res-title');
        const desc = document.getElementById('res-msg');
        
        title.innerText = success ? 'Verified' : 'Error';
        title.style.color = success ? '#059669' : '#DC2626';
        desc.innerText = msg;
        
        pop.classList.add('show');
    }

    // --- UTILS ---

    showToast(msg, type='info') {
        // Simple alert for now or custom toast if UI existed
        // We will just log it or alert if error
        if(type === 'error') alert(msg);
        else console.log(msg);
    }

    animateValue(id, end, prefix='') {
        const obj = document.getElementById(id);
        if(!obj) return;
        // Simple set for now
        obj.innerText = prefix + end.toLocaleString();
    }
}

// Start App
const app = new OrganizerConsole();
window.app = app; // Expose for HTML event handlers
