const multer = require('multer');

// Store file in memory so we can stream it to Cloudinary later
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for file uploads
    }
});

module.exports = upload;