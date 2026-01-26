const { JWT_SECRET } = require('../config/config.js');
const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
    // 1. Check for Authorization header
    const authHeader = req.headers['authorization'];
    
    // 2. Format is usually "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId; 
        req.userName = decoded.name; 
        next();
    } catch (e) {
        return res.status(403).json({ error: "Forbidden: Invalid token" });
    }
};

const signTokenJWT = (userId, userName) =>{
	return jwt.sign({ userId: userId, name: userName }, JWT_SECRET, { expiresIn: '365d' });
}

module.exports = {
	signTokenJWT,
	authenticateJWT
}

//const { authenticateJWT, signTokenJWT } = require('./auth/middleware.js');
// signTokenJWT(userid, username)

