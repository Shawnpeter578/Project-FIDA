const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb'); 
const { getEventsCollection, getUsersCollection } = require('./database/mongodb');

const { uploadImageQuick } = require('./database/cloudinary');
const { authenticateJWT } = require('./auth/middleware');
const multer = require('multer');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { razor_key, razor_secret_key } = require('./config/config');

const razorpay = new Razorpay({
    key_id: razor_key,
    key_secret: razor_secret_key,
});

// Multer Config (Use disk storage to avoid memory issues)
const fs = require('fs');
const upload = multer({ dest: 'uploads/', limits: { fileSize: 5 * 1024 * 1024 } });

// ==============================================================================
// GET PATHS
// ==============================================================================

router.get('/', async (req, res) => {
    try {
        const eventsCollection = getEventsCollection();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const events = await eventsCollection.find({})
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

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
        if (req.userRole !== 'organizer') {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: "Only organizers can create events" });
        }

        const eventsCollection = getEventsCollection();
        const { title, description, date, time, location, price, mode, category, allowArtistApplications } = req.body;
        
        // Logic: Handle "Infinity" attendees safely
        let maxAttendees = req.body.maxAttendees;
        if (maxAttendees === 'Infinity') {
            maxAttendees = 8000000000; 
        } else {
            maxAttendees = parseInt(maxAttendees, 10);
            if (isNaN(maxAttendees)) maxAttendees = 100;
        }

        if (!title || !date || !price) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: "Missing required fields (title, date, price)" });
        }
        
        // Logic: Image Upload
        let imageUrl = "chris.jpg";
        if (req.file) {
            try {
                imageUrl = await uploadImageQuick(req.file.path);
            } finally {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            }
        }
        
        const newEvent = {
            title, date, time, location, category, description, 
            maxAttendees, mode, 
            price: parseFloat(price), 
            creatorId: req.userId, 
            creatorName: req.userName, 
            image: imageUrl,
            attendees: [], comments: [], createdAt: new Date(), checkedIn: [],
            allowArtistApplications: allowArtistApplications === 'true' || allowArtistApplications === true,
            artistApplications: [],
            confirmedArtists: []
        };

        const result = await eventsCollection.insertOne(newEvent);
        res.status(201).json({ success: true, eventId: result.insertedId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Creation failed" });
    }
});

router.post('/checkin', authenticateJWT, async (req, res) => {
    try {
        const eventsCollection = getEventsCollection();
        const { eventId, userId } = req.body;
        
        if (!eventId || !userId) {
            return res.status(400).json({ error: "Missing eventId or userId" });
        }

        const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });
        if (!event) return res.status(404).json({ error: "Event not found" });

        // Allow Organizer Role OR the Event Creator
        if (req.userRole !== 'organizer' && event.creatorId !== req.userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const result = await eventsCollection.updateOne(
            { _id: new ObjectId(eventId), "attendees.userId": userId },
            { $set: { "attendees.$.status": "checked-in" } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Guest not found in list" });
        }

        res.status(200).json({ success: true, message: "Check-in successful" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Check-in failed" });
    }
});

router.post('/create-order', authenticateJWT, async (req, res) => {
    try {
        if (req.userRole !== 'user') return res.status(403).json({ error: "Only users can join events" });

        const { eventId } = req.body;
        if (!eventId) return res.status(400).json({ error: "Missing Event ID" });

        const eventsCollection = getEventsCollection();
        const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });

        if (!event) return res.status(404).json({ error: "Event not found" });

        // Check if already joined
        const alreadyJoined = event.attendees.some(a => a.userId === req.userId);
        if (alreadyJoined) return res.status(400).json({ error: "Already joined" });

        // Check capacity
        if (event.attendees.length >= event.maxAttendees) {
            return res.status(400).json({ error: "Event is full" });
        }

        const options = {
            amount: Math.round(event.price * 100), // amount in paise
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        res.status(200).json({ 
            success: true, 
            orderId: order.id, 
            amount: options.amount, 
            key: razor_key,
            eventTitle: event.title,
            userName: req.userName
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Order creation failed" });
    }
});

router.post('/verify-payment', authenticateJWT, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventId } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", razor_secret_key)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: "Invalid payment signature" });
        }

        // Payment verified, now join the event
        const usersCollection = getUsersCollection();
        const eventsCollection = getEventsCollection();
        const userId = req.userId;

        const eventUpdate = await eventsCollection.updateOne(
            { 
                _id: new ObjectId(eventId),
                $expr: { $lt: [{ $size: "$attendees" }, "$maxAttendees"] },
                "attendees.userId": { $ne: userId },
                creatorId: { $ne: userId }
            },
            { 
                $push: { 
                    attendees: { 
                        userId, 
                        name: req.userName, 
                        status: 'paid', // Mark as paid
                        joinedAt: new Date(),
                        paymentId: razorpay_payment_id,
                        orderId: razorpay_order_id
                    } 
                } 
            }
        );

        if (eventUpdate.matchedCount === 0) {
            return res.status(400).json({ error: "Join failed: Event full or already joined." });
        }

        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $addToSet: { joinedEvents: eventId } }
        );

        res.status(200).json({ success: true, message: "Payment verified and joined!" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Payment verification failed" });
    }
});

router.post('/join', authenticateJWT, async (req, res) => {
    try {
        if (req.userRole !== 'user') return res.status(403).json({ error: "Only users can join events" });

        const usersCollection = getUsersCollection();
        const eventsCollection = getEventsCollection();
        const userId = req.userId; 
        const { eventId } = req.body;

        if (!eventId) return res.status(400).json({ error: "Missing Event ID" });

        // Enforce payment: Check if event has a price
        const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });
        if (!event) return res.status(404).json({ error: "Event not found" });
        if (event.price > 0) {
            return res.status(402).json({ error: "Payment required for this event" });
        }

        const eventUpdate = await eventsCollection.updateOne(
            { 
                _id: new ObjectId(eventId),
                // BUG FIX: Removed $toInt crash. Direct comparison is safer.
                $expr: { $lt: [{ $size: "$attendees" }, "$maxAttendees"] },
                "attendees.userId": { $ne: userId },
                creatorId: { $ne: userId }
            },
            { 
                $push: { 
                    attendees: { 
                        userId, 
                        name: req.userName, 
                        status: 'pending',
                        joinedAt: new Date()
                    } 
                } 
            }
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

router.post('/apply', authenticateJWT, async (req, res) => {
    try {
        if (req.userRole !== 'artist') return res.status(403).json({ error: "Only artists can apply" });

        const eventsCollection = getEventsCollection();
        const usersCollection = getUsersCollection();
        const userId = req.userId;
        const { eventId } = req.body;

        if (!eventId) return res.status(400).json({ error: "Missing Event ID" });

        const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });
        if (!event) return res.status(404).json({ error: "Event not found" });

        if (!event.allowArtistApplications) {
            return res.status(400).json({ error: "This event does not accept artist applications" });
        }

        // Check if already applied
        const alreadyApplied = event.artistApplications && event.artistApplications.some(app => app.artistId === userId);
        if (alreadyApplied) return res.status(400).json({ error: "Already applied" });

        const application = {
            artistId: userId,
            artistName: req.userName,
            status: 'pending',
            appliedAt: new Date()
        };

        await eventsCollection.updateOne(
            { _id: new ObjectId(eventId) },
            { $push: { artistApplications: application } }
        );

        // Optional: Update user's appliedEvents
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $addToSet: { appliedEvents: eventId } }
        );

        res.status(200).json({ success: true, message: "Application submitted" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Application failed" });
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