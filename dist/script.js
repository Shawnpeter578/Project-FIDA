/* =========================================
   FIDA: API SERVICE (Backend Communication)
   ========================================= */
FidaAPI = {
    // URL Configuration
    BASE_URL: 'https://independent-irita-clubspot-9e43f2fa.koyeb.app/api',

    // Helper: Get Auth Headers
    getHeaders(isFormData = false) {
        const token = localStorage.getItem('fida_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    },

    // --- AUTHENTICATION ---
    
    auth: {
        async googleLogin(googleToken) {
            const res = await fetch(`${FidaAPI.BASE_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: googleToken })
            });
            return await res.json();
        },

        async getMe() {
            const token = localStorage.getItem('fida_token');
            if (!token) throw new Error('No token found');

            const res = await fetch(`${FidaAPI.BASE_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Session invalid');
            return await res.json();
        }
    },

    // --- EVENTS ---

    events: {
        async getAll() {
            const res = await fetch(`${FidaAPI.BASE_URL}/events`);
            return await res.json();
        },

        async create(formData) {
            // Note: Do not set Content-Type for FormData; browser sets boundary automatically
            const res = await fetch(`${FidaAPI.BASE_URL}/events`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('fida_token')}` },
                body: formData
            });
            return await res.json();
        },

        async join(eventId) {
            const res = await fetch(`${FidaAPI.BASE_URL}/events/join`, {
                method: 'POST',
                headers: FidaAPI.getHeaders(),
                body: JSON.stringify({ eventId })
            });
            return await res.json();
        }
    },

    profile: {
        async loadDetails(){
            return {phone: '9999', city: 'pune'}
        }
    }
};

