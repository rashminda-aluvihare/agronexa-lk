const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist under the project root uploads directory
const uploadsRoot = path.join(__dirname, '../../..', 'uploads');
const nicDir = path.join(uploadsRoot, 'nic/');
const listingDir = path.join(uploadsRoot, 'listings/');
const chatDir = path.join(uploadsRoot, 'chat/');
const profileDir = path.join(uploadsRoot, 'profile/');

if (!fs.existsSync(nicDir)) {
  fs.mkdirSync(nicDir, { recursive: true });
}
if (!fs.existsSync(listingDir)) {
  fs.mkdirSync(listingDir, { recursive: true });
}
if (!fs.existsSync(chatDir)) {
  fs.mkdirSync(chatDir, { recursive: true });
}
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

// Storage for NIC documents
const nicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, nicDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Storage for marketplace listings
const listingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, listingDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Storage for chat attachments
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadNic = multer({
  storage: nicStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadListings = multer({
  storage: listingStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadChat = multer({
  storage: chatStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Storage for profile photos
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadProfilePhoto = multer({
  storage: profileStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

module.exports = {
  uploadNic,
  uploadListings,
  uploadChat,
  uploadProfilePhoto,
};
