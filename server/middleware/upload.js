const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const cloudinaryStorage = require('multer-storage-cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let storage;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  // Use Cloudinary for persistent storage (Production/Render)
  if (CloudinaryStorage) {
    storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'citizen_portal_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif', 'pdf'],
        public_id: (req, file) => Date.now() + '-' + Math.round(Math.random() * 1E9),
      },
    });
  } else {
    storage = cloudinaryStorage({
      cloudinary: require('cloudinary'),
      folder: 'citizen_portal_uploads',
      allowedFormats: ['jpg', 'png', 'jpeg', 'webp', 'gif', 'pdf'],
      filename: function (req, file, cb) {
        cb(undefined, Date.now() + '-' + Math.round(Math.random() * 1E9));
      }
    });
  }
  console.log('Using Cloudinary for file storage.');
} else {
  // Fallback to local storage (Development) - Warning: Wipe on redeploy!
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, uniqueName);
    }
  });
  console.warn('WARNING: Using local storage. Files will be deleted on redeploy. Set Cloudinary env vars for persistent storage.');
}

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image and document files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

module.exports = upload;