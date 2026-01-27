
const { cloud_name, api_key, api_secret } = require('../config/config.js');
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: cloud_name,
  api_key: api_key,
  api_secret: api_secret
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

module.exports={
  uploadImageQuick
}