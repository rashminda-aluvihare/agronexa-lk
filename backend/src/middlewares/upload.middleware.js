const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const nicDir = 'uploads/nic/';
const listingDir = 'uploads/listings/';
const chatDir = 'uploads/chat/';

if (!fs.existsSync(nicDir)) {
  fs.mkdirSync(nicDir, { recursive: true });
}
if (!fs.existsSync(listingDir)) {
  fs.mkdirSync(listingDir, { recursive: true });
}
if (!fs.existsSync(chatDir)) {
  fs.mkdirSync(chatDir, { recursive: true });
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

module.exports = {
  uploadNic,
  uploadListings,
  uploadChat,
};
