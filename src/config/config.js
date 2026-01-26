require('dotenv').config();


module.exports = {
	JWT_SECRET: process.env.JWT_SECRET || "default_test_secret",
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "YOUR_WEB_CLIENT_ID",
	dbUrl: process.env.DATABASE_URL || "mongodb://localhost:27017",

	cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "Chris's cloud",
	api_key: process.env.CLOUDINARY_API_KEY || "cloudy and a chance of meatballs",
	api_secret: process.env.CLOUDINARY_API_SECRET || "jimmy"
	
}