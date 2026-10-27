"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Use memory storage so file buffers can be saved directly to MongoDB GridFS
// and works across serverless / ephemeral containers (Render, Vercel, Heroku)
const storage = multer_1.default.memoryStorage();
const allowedExtensions = new Set([
    // PDF
    '.pdf',
    // Word
    '.doc',
    '.docx',
    // Excel & CSV
    '.xls',
    '.xlsx',
    '.csv',
    // Images
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.svg',
    '.bmp',
]);
const fileFilter = (req, file, cb) => {
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedExtensions.has(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error(`File format "${ext}" is not supported. Allowed formats: PDF (.pdf), Word (.doc, .docx), Excel (.xls, .xlsx, .csv), and Images (.jpg, .png, .webp, etc.).`));
    }
};
const multerInstance = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB max per file
        files: 10, // max 10 files
    },
});
const uploadMiddleware = (req, res, next) => {
    const uploadArray = multerInstance.array('files', 10);
    uploadArray(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                res.status(400).json({ message: 'File is too large. Maximum size is 25MB per file.' });
                return;
            }
            res.status(400).json({ message: `Upload error: ${err.message}` });
            return;
        }
        else if (err) {
            res.status(400).json({ message: err.message || 'File upload failed.' });
            return;
        }
        next();
    });
};
exports.uploadMiddleware = uploadMiddleware;
