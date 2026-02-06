const { JWT_SECRET } = require('../config/config.js');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getUsersCollection } = require('../database/mongodb');

const authenticateJWT = async (req, res, next) => {
    // 1. Check for Authorization header
    const authHeader = req.headers['authorization'];
    
    // 2. Format is usually "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Optional but recommended: Verify user still exists
        const usersCollection = getUsersCollection();
        const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });
        if (!user) {
            return res.status(401).json({ error: "Unauthorized: User no longer exists" });
        }

        req.userId = decoded.userId; 
        req.userName = decoded.name; 
        req.userRole = decoded.role || 'user'; // Default to 'user'
        next();
    } catch (e) {
        return res.status(403).json({ error: "Forbidden: Invalid or expired token" });
    }
};

const signTokenJWT = (userId, userName, role) =>{
	return jwt.sign({ userId: userId, name: userName, role: role || 'user' }, JWT_SECRET, { expiresIn: '1h' });
}

module.exports = {
	signTokenJWT,
	authenticateJWT
}

//const { authenticateJWT, signTokenJWT } = require('./auth/middleware.js');
// signTokenJWT(userid, username)

