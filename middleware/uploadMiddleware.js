const multer = require('multer');
// Store file in memory so we can stream it to Cloudinary later
const upload = multer({ storage: multer.memoryStorage() });
module.exports = upload;