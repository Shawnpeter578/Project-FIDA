const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getUsersCollection } = require('./database/mongodb');
const { verifyGoogleToken } = require('./auth/google.auth');
const { signTokenJWT, authenticateJWT } = require('./auth/middleware');
const { GOOGLE_CLIENT_ID } = require('./config/config');
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const randomBytes = promisify(crypto.randomBytes);

// ==============================================================================
// POST PATHS
// ==============================================================================

router.get('/config', (req, res) => {
    res.json({ googleClientId: GOOGLE_CLIENT_ID });
});

router.post('/signup', async (req, res) => {
    try {
        const usersCollection = getUsersCollection();
        const { name, email, password, role } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const validRoles = ['user', 'artist', 'organizer'];
        const userRole = (role && validRoles.includes(role)) ? role : 'user';

        // Check if user exists
        const existingUser = await usersCollection.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already in use" });
        }

        // Hash password
        const salt = (await randomBytes(16)).toString('hex');
        const hash = (await scrypt(password, salt, 64)).toString('hex');

        const newUser = {
            name,
            email,
            password: hash,
            salt: salt,
            role: userRole,
            joinedEvents: [],
            createdAt: new Date(),
            picture: "https://via.placeholder.com/150" // Default placeholder
        };

        const result = await usersCollection.insertOne(newUser);
        
        // Generate Token
        const token = signTokenJWT(result.insertedId, newUser.name, newUser.role);

        res.status(201).json({
            success: true,
            token: token,
            user: { _id: result.insertedId, name: newUser.name, picture: newUser.picture, role: newUser.role, joinedEvents: newUser.joinedEvents }
        });

    } catch (e) {
        console.error("Signup Error:", e);
        res.status(500).json({ error: "Signup failed" });
    }
});

router.post('/login', async (req, res) => {
    try {
        const usersCollection = getUsersCollection();
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Missing email or password" });
        }

        const user = await usersCollection.findOne({ email: email });
        if (!user || !user.salt || !user.password) {
            // User not found or is a Google-only user (no password/salt)
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const hash = (await scrypt(password, user.salt, 64)).toString('hex');
        if (hash !== user.password) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate Token
        const token = signTokenJWT(user._id, user.name, user.role);

        res.status(200).json({
            success: true,
            token: token,
            user: { _id: user._id, name: user.name, picture: user.picture, role: user.role, joinedEvents: user.joinedEvents }
        });

    } catch (e) {
        console.error("Login Error:", e);
        res.status(500).json({ error: "Login failed" });
    }
});

router.post('/google', async (req, res) => {
    try {
        const usersCollection = getUsersCollection();
        const { token: googleToken, role } = req.body; // Accept role

        const googleUser = await verifyGoogleToken(googleToken);
        if (!googleUser) return res.status(401).json({ error: "Invalid Token" });

        // Validate role if provided
        const validRoles = ['user', 'artist', 'organizer'];
        const userRole = (role && validRoles.includes(role)) ? role : 'user';

        const result = await usersCollection.findOneAndUpdate(
            { email: googleUser.email },
            { 
                $set: { name: googleUser.name, picture: googleUser.picture, lastLogin: new Date() },
                $setOnInsert: { joinedEvents: [], createdAt: new Date(), role: userRole } // Only set role on creation
            },
            { upsert: true, returnDocument: 'after' } 
        );

        const user = result.value || result; 
        const token = signTokenJWT(user._id, user.name, user.role); // Sign with stored role

        res.status(200).json({ 
            success: true,
            token: token,
            user: { _id: user._id, name: user.name, picture: user.picture, role: user.role, joinedEvents: user.joinedEvents }
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
            { projection: { _id: 1, name: 1, picture: 1, joinedEvents: 1, role: 1 } }
        );
        if (!user) return res.status(401).json({ error: "User not found" });
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: "Session check failed" });
    }
});

module.exports = router;