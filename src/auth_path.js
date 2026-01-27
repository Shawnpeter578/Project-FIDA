const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getUsersCollection } = require('./database/mongodb');
const { verifyGoogleToken } = require('./auth/google.auth');
const { signTokenJWT, authenticateJWT } = require('./auth/middleware');

// ==============================================================================
// POST PATHS
// ==============================================================================

router.post('/google', async (req, res) => {
    try {
        const usersCollection = getUsersCollection();
        const { token: googleToken } = req.body;

        const googleUser = await verifyGoogleToken(googleToken);
        if (!googleUser) return res.status(401).json({ error: "Invalid Token" });

        const result = await usersCollection.findOneAndUpdate(
            { email: googleUser.email },
            { $set: { name: googleUser.name, picture: googleUser.picture, lastLogin: new Date() },
              $setOnInsert: { joinedEvents: [], createdAt: new Date() } },
            { upsert: true, returnDocument: 'after' } 
        );

        const user = result.value || result; 
        const token = signTokenJWT(user._id, user.name);

        res.status(200).json({ 
            success: true,
            token: token,
            user: { _id: user._id, name: user.name, picture: user.picture, joinedEvents: user.joinedEvents }
        });
    } catch (e) { 
        res.status(500).json({ error: "Authentication failed" });
    }
});

router.post('/logout', (req, res) => {
    res.status(200).json({ success: true, message: "Logged out successfully" });
});

// ==============================================================================
// GET PATHS
// ==============================================================================

router.get('/me', authenticateJWT, async (req, res) => {
    try {
        const usersCollection = getUsersCollection();
        const user = await usersCollection.findOne(
            { _id: new ObjectId(req.userId) }, 
            { projection: { _id: 1, name: 1, picture: 1, joinedEvents: 1 } }
        );
        if (!user) return res.status(401).json({ error: "User not found" });
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: "Session check failed" });
    }
});

module.exports = router;