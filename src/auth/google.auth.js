const { OAuth2Client } = require("google-auth-library");
const { GOOGLE_CLIENT_ID } = require('../config/config.js');

// Google auth===
const g_client = new OAuth2Client(GOOGLE_CLIENT_ID);
async function verifyGoogleToken(token) {
    const ticket = await g_client.verifyIdToken({
         idToken: token,
         // The Gatekeeper shall now open for both the Web Lords and the Android Knights
         audience: [GOOGLE_CLIENT_ID],  
    });
    return ticket.getPayload();
}

module.exports = { verifyGoogleToken };

//how to use ? 
/*
> const { verifyGoogleToken } = require('./auth/google.auth.js');

> const { token: googleToken } = req.body;
> const googleUser = await verifyGoogleToken(googleToken);

Google verifies the token provided by the client */