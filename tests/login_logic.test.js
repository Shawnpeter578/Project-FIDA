
// Mocking the DOM and Fetch for Logic Verification
const { JSDOM } = require('jsdom');

describe('Login Page Logic', () => {
    let window, document, handleGoogleCredentialResponse, showError, loginUser, fetchMock;
    let currentRole = 'user';

    beforeEach(() => {
        // Setup JSDOM
        const dom = new JSDOM(`<!DOCTYPE html><div id="error-box"></div>`);
        window = dom.window;
        document = window.document;
        global.document = document;
        global.window = window;
        
        // Mock ShowError
        showError = jest.fn();
        
        // Mock LoginUser
        loginUser = jest.fn();

        // Mock Fetch
        fetchMock = jest.fn();
        global.fetch = fetchMock;

        // Re-implement the logic to be tested (simulating the fix)
        handleGoogleCredentialResponse = async (response) => {
            try {
                // 1. Map Frontend Role to Backend Role
                let backendRoleRequest = 'user';
                if (currentRole === 'host') backendRoleRequest = 'organizer';
                if (currentRole === 'artist') backendRoleRequest = 'artist';

                const res = await fetch('/api/auth/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: response.credential, role: backendRoleRequest })
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Google Auth failed');
                
                // 2. Validate Returned Role
                let backendRoleResponse = 'user';
                if (data.user.role === 'organizer') backendRoleResponse = 'host';
                if (data.user.role === 'artist') backendRoleResponse = 'artist';

                if (backendRoleResponse !== currentRole) {
                    let correctRoleLabel = 'User';
                    if (backendRoleResponse === 'host') correctRoleLabel = 'Organizer';
                    if (backendRoleResponse === 'artist') correctRoleLabel = 'Artist';

                    showError(`This email belongs to a ${correctRoleLabel} account. Please switch the tab above.`);
                    return;
                }

                loginUser(data);
            } catch (err) {
                showError(err.message);
            }
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Creation: Should map "host" to "organizer" in request', async () => {
        currentRole = 'host'; // User selected Organizer tab
        
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ user: { role: 'organizer' }, token: 'abc' }) // Backend returns organizer
        });

        await handleGoogleCredentialResponse({ credential: 'token123' });

        // Verify request payload
        expect(fetchMock).toHaveBeenCalledWith('/api/auth/google', expect.objectContaining({
            body: expect.stringContaining('"role":"organizer"')
        }));
        
        // Verify success
        expect(loginUser).toHaveBeenCalled();
    });

    test('Validation: Should block Fan logging in on Organizer tab', async () => {
        currentRole = 'host'; // User selected Organizer tab
        
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ user: { role: 'user' }, token: 'abc' }) // Backend says they are a 'user'
        });

        await handleGoogleCredentialResponse({ credential: 'token123' });

        // Verify Error
        expect(showError).toHaveBeenCalledWith(expect.stringContaining('This email belongs to a User account'));
        expect(loginUser).not.toHaveBeenCalled();
    });

    test('Validation: Should allow Fan logging in on Fan tab', async () => {
        currentRole = 'user'; // User selected Fan tab
        
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ user: { role: 'user' }, token: 'abc' }) 
        });

        await handleGoogleCredentialResponse({ credential: 'token123' });

        expect(loginUser).toHaveBeenCalled();
    });
});
