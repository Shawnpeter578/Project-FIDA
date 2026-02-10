const express = require('express');
const router = express.Router();
const { getUsersCollection, getEventsCollection } = require('./database/mongodb');
const { ObjectId } = require('mongodb');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

// Middleware to check session
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.status(401).json({ error: "Unauthorized" });
};

// 1. POST /admin/login
router.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        return res.json({ success: true });
    }
    res.status(401).json({ error: "Invalid Password" });
});

// 2. GET /admin/auth-status
router.get('/auth-status', (req, res) => {
    res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// 3. POST /admin/logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 4. GET /admin/data
router.get('/data', requireAdmin, async (req, res) => {
    try {
        const users = await getUsersCollection().find({}).toArray();
        const events = await getEventsCollection().find({}).sort({ _id: -1 }).toArray();
        res.json({ users, events });
    } catch (e) {
        res.status(500).json({ error: "Fetch failed" });
    }
});

// 5. DELETE /admin/user/:id
router.delete('/user/:id', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        await getUsersCollection().deleteOne({ _id: new ObjectId(userId) });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Delete failed" });
    }
});

// 6. DELETE /admin/event/:id
router.delete('/event/:id', requireAdmin, async (req, res) => {
    try {
        const eventId = req.params.id;
        await getEventsCollection().deleteOne({ _id: new ObjectId(eventId) });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Delete failed" });
    }
});

module.exports = router;