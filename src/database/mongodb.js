const { dbUrl  } = require('../config/config.js');
//=============
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');//loaded dbUrl
<<<<<<< HEAD
const DATABASE_NAME = "clubspot";
=======
const DATABASE_NAME = "OSS";
>>>>>>> 1bcb82ba67ce002642a9633b5b71dcc091e11f0e
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

// Exported connection function
async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB successfully!");
        
        db = client.db(DATABASE_NAME);
        usersCollection = db.collection("users");
        eventsCollection = db.collection("events");
        await usersCollection.createIndex({ email: 1 }, { unique: true });
        return true;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        return false;
    }
}
// Helper functions to get the collections safely
function getUsersCollection() {
    if (!usersCollection) {
        throw new Error("Database not connected yet! Call connectToMongoDB first.");
    }
    return usersCollection;
}

function getEventsCollection() {
    if (!eventsCollection) {
        throw new Error("Database not connected yet!");
    }
    return eventsCollection;
}
async function closeMongoDB() {
    await client.close();
}

module.exports={
    connectToMongoDB, closeMongoDB, client, ObjectId, getUsersCollection, getEventsCollection
}