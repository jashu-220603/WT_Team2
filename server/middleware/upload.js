const multer = require('multer');
const path = require('path');
const fs = require('fs');


/*
------------------------------------------
Ensure Uploads Folder Exists
------------------------------------------
*/
const uploadDir = 'uploads/';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}


/*
------------------------------------------
Storage Configuration
------------------------------------------
*/
const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {

    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1E9)
      + path.extname(file.originalname);

    cb(null, uniqueName);

  }

});


/*
------------------------------------------
File Filter (Images Only)
------------------------------------------
*/
const fileFilter = (req, file, cb) => {

  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image and document files are allowed'));
  }

};


/*
------------------------------------------
Upload Middleware
------------------------------------------
*/
const upload = multer({

  storage,

  fileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }

});


module.exports = upload;