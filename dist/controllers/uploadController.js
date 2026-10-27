"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUploadedFile = exports.serveAttachment = exports.uploadFiles = exports.getGridFSBucket = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const stream_1 = require("stream");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uploadsDir = path_1.default.resolve(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    try {
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    }
    catch (err) {
        // Ignore error if filesystem is read-only
    }
}
const getGridFSBucket = () => {
    if (!mongoose_1.default.connection.db) {
        throw new Error('Database connection not established');
    }
    return new mongoose_1.default.mongo.GridFSBucket(mongoose_1.default.connection.db, {
        bucketName: 'transaction_attachments',
    });
};
exports.getGridFSBucket = getGridFSBucket;
const uploadFiles = async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({ message: 'No file was uploaded' });
            return;
        }
        const bucket = (0, exports.getGridFSBucket)();
        const attachments = [];
        for (const file of files) {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            const baseName = path_1.default
                .basename(file.originalname, ext)
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .slice(0, 50);
            const safeFilename = `${baseName}-${uniqueSuffix}${ext}`;
            // 1. Upload to MongoDB GridFS for permanent cross-cloud persistence
            const uploadStream = bucket.openUploadStream(safeFilename, {
                contentType: file.mimetype || 'application/octet-stream',
                metadata: {
                    originalName: file.originalname,
                    size: file.size,
                    mimeType: file.mimetype,
                    uploadedAt: new Date(),
                },
            });
            const readable = stream_1.Readable.from(file.buffer);
            await new Promise((resolve, reject) => {
                readable.pipe(uploadStream)
                    .on('finish', () => resolve())
                    .on('error', (err) => reject(err));
            });
            // 2. Also save to local disk cache if writable
            try {
                const localFilePath = path_1.default.join(uploadsDir, safeFilename);
                fs_1.default.writeFileSync(localFilePath, file.buffer);
            }
            catch (e) {
                // Safe to ignore in read-only / ephemeral environments
            }
            attachments.push({
                name: file.originalname,
                url: `/api/attachments/${uploadStream.id}/${encodeURIComponent(file.originalname)}`,
                fileId: uploadStream.id.toString(),
                filename: safeFilename,
                size: file.size,
                mimeType: file.mimetype,
                uploadedAt: new Date(),
            });
        }
        res.status(200).json({
            message: `${files.length} file(s) uploaded successfully`,
            attachments,
        });
    }
    catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ message: 'Failed to process file upload' });
    }
};
exports.uploadFiles = uploadFiles;
const serveAttachment = async (req, res) => {
    try {
        const identifier = req.params.id || req.params.filename;
        if (!identifier) {
            res.status(400).send('File identifier missing');
            return;
        }
        const bucket = (0, exports.getGridFSBucket)();
        let fileDoc = null;
        // Check if identifier is a valid 24-hex ObjectId
        if (mongoose_1.default.Types.ObjectId.isValid(identifier)) {
            const files = await bucket.find({ _id: new mongoose_1.default.Types.ObjectId(identifier) }).toArray();
            if (files.length > 0) {
                fileDoc = files[0];
            }
        }
        // If not found by ObjectId, search by filename in GridFS
        if (!fileDoc) {
            const cleanFilename = path_1.default.basename(identifier);
            const files = await bucket.find({ filename: cleanFilename }).toArray();
            if (files.length > 0) {
                fileDoc = files[0];
            }
        }
        // If found in GridFS, stream directly to response
        if (fileDoc) {
            const mime = fileDoc.contentType || fileDoc.metadata?.mimeType || 'application/octet-stream';
            const displayName = fileDoc.metadata?.originalName || fileDoc.filename || 'download';
            res.setHeader('Content-Type', mime);
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(displayName)}"`);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            const downloadStream = bucket.openDownloadStream(fileDoc._id);
            downloadStream.pipe(res);
            return;
        }
        // Fallback: Check local disk in uploads/
        const safeFilename = path_1.default.basename(identifier);
        const diskPath = path_1.default.join(uploadsDir, safeFilename);
        if (fs_1.default.existsSync(diskPath)) {
            res.sendFile(diskPath);
            return;
        }
        res.status(404).send(`Cannot GET ${req.originalUrl}`);
    }
    catch (error) {
        console.error('Serve attachment error:', error);
        res.status(500).send('Error retrieving file');
    }
};
exports.serveAttachment = serveAttachment;
const deleteUploadedFile = async (req, res) => {
    try {
        const { filename } = req.params;
        const bucket = (0, exports.getGridFSBucket)();
        // 1. Try deleting by ObjectId from GridFS
        if (mongoose_1.default.Types.ObjectId.isValid(filename)) {
            try {
                await bucket.delete(new mongoose_1.default.Types.ObjectId(filename));
            }
            catch (err) { }
        }
        // 2. Try deleting by filename from GridFS
        try {
            const safeFilename = path_1.default.basename(filename);
            const files = await bucket.find({ filename: safeFilename }).toArray();
            for (const f of files) {
                await bucket.delete(f._id);
            }
        }
        catch (err) { }
        // 3. Delete from disk if present
        const diskPath = path_1.default.resolve(process.cwd(), 'uploads', path_1.default.basename(filename));
        if (fs_1.default.existsSync(diskPath)) {
            try {
                fs_1.default.unlinkSync(diskPath);
            }
            catch (err) { }
        }
        res.status(200).json({ message: 'File removed successfully' });
    }
    catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ message: 'Failed to remove file' });
    }
};
exports.deleteUploadedFile = deleteUploadedFile;
