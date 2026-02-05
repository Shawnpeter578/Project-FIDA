/* =========================================
   FIDA: API SERVICE (Backend Communication)
   ========================================= */
FidaAPI = {
    // URL Configuration
    BASE_URL: 'http://localhost:3000/api',

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
        async getAll(page = 1, limit = 10) {
            const res = await fetch(`${FidaAPI.BASE_URL}/events?page=${page}&limit=${limit}`);
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
            // Re-use auth.getMe as it now returns full profile details
            return await FidaAPI.auth.getMe();
        },
        
        async update(data) {
            const res = await fetch(`${FidaAPI.BASE_URL}/auth/me`, {
                method: 'PUT',
                headers: FidaAPI.getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Update failed');
            return await res.json();
        }
    }
};

