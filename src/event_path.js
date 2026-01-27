const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb'); 
const { getEventsCollection, getUsersCollection } = require('./database/mongodb');

const { uploadImageQuick } = require('./database/cloudinary');
const { authenticateJWT } = require('./auth/middleware');
const multer = require('multer');

// Multer Config (Local to this file because only events use it)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ==============================================================================
// GET PATHS
// ==============================================================================

router.get('/', async (req, res) => {
    try {
        const eventsCollection = getEventsCollection();
        const events = await eventsCollection.find({}).toArray();
        res.status(200).json(events);
    } catch (e) {
        res.status(500).json({ error: "Fetch failed" });
    }
});

// ==============================================================================
// POST PATHS
// ==============================================================================

router.post('/', authenticateJWT, upload.single('image'), async (req, res) => {
    try {
        const eventsCollection = getEventsCollection();
        const { title, description, date, time, location, price, mode, category } = req.body;
        
        // Logic: Handle "Infinity" attendees safely
        let maxAttendees = req.body.maxAttendees;
        if (maxAttendees === 'Infinity') {
<<<<<<< HEAD
            maxAttendees = 8000000000; 
=======
            maxAttendees = Infinity; 
>>>>>>> 1bcb82ba67ce002642a9633b5b71dcc091e11f0e
        } else {
            maxAttendees = parseInt(maxAttendees, 10);
        }

        if (!title || !date) return res.status(400).json({ error: "Missing required fields" });
        
        // Logic: Image Upload
        let imageUrl = "chris.jpg";
        if (req.file) {
            const imageBuffer = req.file.buffer;
            const imageBase64 = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;
            imageUrl = await uploadImageQuick(imageBase64);
        }
        
        const newEvent = {
            title, date, time, location, category, description, 
            maxAttendees, mode, 
            price: parseFloat(price), 
            creatorId: req.userId, 
            creatorName: req.userName, 
            image: imageUrl,
            attendees: [], comments: [], createdAt: new Date(), checkedIn: []
        };

        const result = await eventsCollection.insertOne(newEvent);
        res.status(201).json({ success: true, eventId: result.insertedId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Creation failed" });
    }
});

router.post('/join', authenticateJWT, async (req, res) => {
    try {
        const usersCollection = getUsersCollection();
        const eventsCollection = getEventsCollection();
        const userId = req.userId; 
        const { eventId } = req.body;

        if (!eventId) return res.status(400).json({ error: "Missing Event ID" });

        const eventUpdate = await eventsCollection.updateOne(
            { 
                _id: new ObjectId(eventId),
                // BUG FIX: Removed $toInt crash. Direct comparison is safer.
                $expr: { $lt: [{ $size: "$attendees" }, "$maxAttendees"] },
                attendees: { $ne: userId },
                creatorId: { $ne: userId }
            },
            { $addToSet: { attendees: userId } }
        );

        if (eventUpdate.matchedCount === 0) return res.status(400).json({ error: "Can't join: Full, joined, or owner." });

        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $addToSet: { joinedEvents: eventId } }
        );

        res.status(200).json({ success: true, message: "Successfully joined!" });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Join failed" });
    }
});

router.post('/comment', authenticateJWT, async (req, res) => {
    try {
        const usersCollection = getUsersCollection();
        const eventsCollection = getEventsCollection();
        const userId = req.userId; 
        const { eventId, text } = req.body;

        if (!eventId || !text.trim()) return res.status(400).json({ error: "Missing data" });

        const userDoc = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { name: 1 } });
        const comment = { _id: new ObjectId(), userId, userName: userDoc.name, text, timestamp: new Date() };

        await eventsCollection.updateOne({ _id: new ObjectId(eventId) }, { $push: { comments: comment } });
        res.status(200).json({ success: true });
    } catch (e) { 
        res.status(500).json({ error: "Comment failed" });
    }
});

// ==============================================================================
// DELETE PATHS
// ==============================================================================

router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
        const usersCollection = getUsersCollection();
        const eventsCollection = getEventsCollection();
        const eventId = req.params.id;
        const userId = req.userId;

        const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });
        if (!event) return res.status(404).json({ error: "Event not found" });
        if (event.creatorId !== userId) return res.status(403).json({ error: "Unauthorized" });

        await usersCollection.updateMany(
            { joinedEvents: eventId }, 
            { $pull: { joinedEvents: eventId } }
        );
        await eventsCollection.deleteOne({ _id: new ObjectId(eventId) });
        res.status(200).json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Delete failed" });
    }
});

router.delete('/:eventId/comments/:commentId', authenticateJWT, async (req, res) => {
    try {
        const eventsCollection = getEventsCollection();
        const { eventId, commentId } = req.params;
        const result = await eventsCollection.updateOne(
            { _id: new ObjectId(eventId) },
            { $pull: { comments: { _id: new ObjectId(commentId), userId: req.userId } } }
        );
        if (result.modifiedCount === 0) return res.status(403).json({ error: "Failed to delete" });
        res.status(200).json({ success: true });
    } catch (e){
        res.status(500).json({ error: "Comment deletion failed" });
    }
});

module.exports = router;