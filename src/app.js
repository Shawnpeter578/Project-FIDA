const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || "default_test_secret"; // Fallback for testing

//=============
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dbUrl = process.env.DATABASE_URL || "mongodb://localhost:27017";
const DATABASE_NAME = "clubspot";
const client = new MongoClient(dbUrl, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
let db;
let usersCollection;
let eventsCollection;
//=============

//Cloudinary config ==========
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "Chris's cloud",
  api_key: process.env.CLOUDINARY_API_KEY || "cloudy and a chance of meatballs",
  api_secret: process.env.CLOUDINARY_API_SECRET || "jimmy"
});
async function uploadImageQuick(imageBinary) {
    try {
        if (imageBinary.startsWith('data:image')) {
            const result = await cloudinary.uploader.upload(imageBinary, {
                folder: 'chrisEventFolder',
                resource_type: 'auto'
            });
            return result.secure_url;
        }else if (imageBinary.startsWith('http')) {
            return imageBinary;
        }else {
            const result = await cloudinary.uploader.upload(imageBinary, {
                folder: 'event-images'
            });
            return result.secure_url;
        }
        console.log("Uploaded image successfully")
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        return "https://images.unsplash.com/photo-1540575467063-178a50c2df87";
    }
}
//=================

//Multer configuration
const multer = require('multer');
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        fields: 20 
    }
});
//===================

// --- Google Auth Setup ---
const { OAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_WEB_CLIENT_ID";
const g_client = new OAuth2Client(GOOGLE_CLIENT_ID);



const app = express();


app.use(cors({
  origin: [
    'http://localhost:5173',      // Your local dev URL
    'http://localhost:3000',      // Alternative local URL
    'https://independent-irita-clubspot-9e43f2fa.koyeb.app/api', // Your production URL
  ],
  // credentials: true, // Not strictly needed for Header-based auth, but harmless to keep
  methods: ['POST', 'PUT', 'GET', 'OPTIONS', 'HEAD', 'DELETE'],
}));

//for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.set('trust proxy', 1); 
app.use(express.json()); 
app.use(express.static(path.join(__dirname, '../dist')));




// Exported connection function
async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB successfully!");
        
        db = client.db(DATABASE_NAME);
        usersCollection = db.collection("users");
        eventsCollection = db.collection("events");
        
        // Indexes
        await usersCollection.createIndex({ email: 1 }, { unique: true });
        return true;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        return false;
    }
}

async function closeMongoDB() {
    await client.close();
}

async function verifyGoogleToken(token) {
    const ticket = await g_client.verifyIdToken({
         idToken: token,
         // The Gatekeeper shall now open for both the Web Lords and the Android Knights
         audience: [GOOGLE_CLIENT_ID],  
    });
    return ticket.getPayload();
}


// --- UPDATED AUTH MIDDLEWARE (HEADER BASED) ---
const authenticateJWT = (req, res, next) => {
    // 1. Check for Authorization header
    const authHeader = req.headers['authorization'];
    
    // 2. Format is usually "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.userId = decoded.userId; 
        req.userName = decoded.name; 
        next();
    } catch (e) {
        return res.status(403).json({ error: "Forbidden: Invalid token" });
    }
};

// ==========================================
// API Routes
// ==========================================

// 1. Google Auth (UPDATED: Returns Token in Body)
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token: googleToken } = req.body;

        const googleUser = await verifyGoogleToken(googleToken);
        if (!googleUser) {
            return res.status(401).json({ error: "Invalid Token" });
        }

        const result = await usersCollection.findOneAndUpdate(
            { email: googleUser.email },
            { $set: { name: googleUser.name, picture: googleUser.picture, lastLogin: new Date() },
              $setOnInsert: { joinedEvents: [], createdAt: new Date() } },
            { upsert: true, returnDocument: 'after' } 
        );

        const user = result.value || result; 

        // Generate JWT
        const token = jwt.sign({ userId: user._id, name: user.name }, SECRET_KEY, { expiresIn: '365d' });

        // CHANGED: Instead of setting a cookie, we send the token back in the JSON
        res.status(200).json({ 
            success: true,
            token: token, // <--- Sent to frontend
            user: {
                _id: user._id, 
                name: user.name, 
                picture: user.picture, 
                joinedEvents: user.joinedEvents
            }
        });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Authentication failed" });
    }
});
app.post('/api/auth/logout', (req, res) => {
    // No cookie to clear server-side needed for JWT (unless using a blacklist)
    res.status(200).json({ success: true, message: "Logged out successfully" });
});
app.get('/api/auth/me', authenticateJWT, async (req, res) => {
    try {
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

app.get('/api/events', async (req, res) => {
    try {
        const events = await eventsCollection.find({}).sort({ date: 1 }).toArray();
        res.status(200).json(events);
    } catch (e) {
        res.status(500).json({ error: "Fetch failed" });
    }
});


app.post('/api/events', authenticateJWT, upload.single('image'), // Handle single file upload
    async (req, res) => {
    try {
        const {
            title,
            description,
            date,
            time,
            location,
            price,
            mode,
            category
        } = req.body;
        
        const creatorId = req.userId;
        const creatorName = req.userName;
        const maxAttendees = parseInt(req.body.maxAttendees, 10);
        let imageUrl = "chris.jpg";

        if (!title || !date) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        
        console.log("attempting upload");
        
        // Process file if uploaded
        if (req.file) {
            // Convert buffer to base64 for Cloudinary
            const imageBuffer = req.file.buffer;
            const imageBase64 = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;
            
            // Upload to Cloudinary
            imageUrl = await uploadImageQuick(imageBase64);
        }
        
        const newEvent = {
            title, date, time, location, category, description, 
            maxAttendees: maxAttendees === 'Infinity' ? Infinity : parseInt(maxAttendees), 
            mode, 
            price: parseFloat(price), 
            creatorId, 
            creatorName, 
            image: imageUrl,
            attendees: [],
            comments: [],
            createdAt: new Date(),
            checkedIn: []
        };

        const result = await eventsCollection.insertOne(newEvent);
        res.status(201).json({ success: true, eventId: result.insertedId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Creation failed" });
    }
});

// 5. Delete Event 
app.delete('/api/events/:id', authenticateJWT, async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.userId;

        const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) });

        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        if (event.creatorId !== userId) {
            return res.status(403).json({ error: "Unauthorized: You can only delete your own events" });
        }

        await eventsCollection.deleteOne({ _id: new ObjectId(eventId) });
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Delete failed" });
    }
});

app.post('/api/events/join', authenticateJWT, async (req, res) => {
    try {
        const userId = req.userId; 
        const { eventId } = req.body;
        if (!eventId) return res.status(400).json({ error: "Missing Event ID" });

        // 1. Attempt to update the event ONLY if it's not full
        const eventUpdate = await eventsCollection.updateOne(
            { 
                _id: new ObjectId(eventId),
                // Condition 1: Must have space
                $expr: { $lt: [{ $size: "$attendees" }, { $toInt: "$maxAttendees" }] },
                // Condition 2: User must NOT already be in the list
                attendees: { $ne: userId },

                //condiiton 3: Creator may not join their own event
                creatorId: { $ne: userId }
            },
            { $addToSet: { attendees: userId } }
        );
        console.log(eventUpdate.matchedCount)

        // 2. Check if the update actually happened
        if (eventUpdate.matchedCount === 0) {
            // Either the event doesn't exist, or it's full
            return res.status(400).json({ error: "Can't join this event, nub" });
        }

        // 3. If successful, link the event to the user
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

app.post('/api/events/comment', authenticateJWT, async (req, res) => {
    try {
        const userId = req.userId; 
        const { eventId, text } = req.body;
        if (!eventId || !text.trim()) return res.status(400).json({ error: "Missing data" });

        const userDoc = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { name: 1 } });
        if (!userDoc) return res.status(404).json({ error: "User not found" });
        const userName = userDoc.name;

        const comment = {
            _id: new ObjectId(),
            userId,
            userName,
            text,
            timestamp: new Date()
        };

        await eventsCollection.updateOne(
            { _id: new ObjectId(eventId) },
            { $push: { comments: comment } }
        );

        res.status(200).json({ success: true });
    } catch (e) { 
        res.status(500).json({ error: "Comment failed" });
    }
});

// 6. Delete Comment
app.delete('/api/events/:eventId/comments/:commentId', authenticateJWT, async (req, res) => {
    try {
        const { eventId, commentId } = req.params;
        const userId = req.userId;

        const result = await eventsCollection.updateOne(
            { _id: new ObjectId(eventId) },
            { 
                $pull: { 
                    comments: { 
                        _id: new ObjectId(commentId),
                        userId: userId 
                    } 
                } 
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(403).json({ error: "Failed to delete: Comment not found or unauthorized" });
        }

        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Comment deletion failed" });
    }
});

// SPA Fallback
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Export everything needed
module.exports = { app, connectToMongoDB, closeMongoDB, client };