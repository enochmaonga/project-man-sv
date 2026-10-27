"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const authController_1 = require("./controllers/authController");
const auth_1 = require("./middleware/auth");
const projectController_1 = require("./controllers/projectController");
const transactionController_1 = require("./controllers/transactionController");
const upload_1 = require("./middleware/upload");
const uploadController_1 = require("./controllers/uploadController");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5008;
// Middleware
app.use((0, cors_1.default)({
    origin: '*', // We can restrict this in production (e.g. to our Next.js frontend URL)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
// Routes
// Public Auth Routes
app.post('/api/auth/register', authController_1.register);
app.post('/api/auth/login', authController_1.login);
// Protected Project Routes
app.get('/api/projects', auth_1.authMiddleware, projectController_1.getProjects);
app.get('/api/projects/:id', auth_1.authMiddleware, projectController_1.getProject);
app.post('/api/projects', auth_1.authMiddleware, projectController_1.createProject);
app.put('/api/projects/:id', auth_1.authMiddleware, projectController_1.updateProject);
app.delete('/api/projects/:id', auth_1.authMiddleware, projectController_1.deleteProject);
app.post('/api/projects/:id/share', auth_1.authMiddleware, projectController_1.shareProject);
app.delete('/api/projects/:id/collaborators/:collaboratorId', auth_1.authMiddleware, projectController_1.removeCollaborator);
app.post('/api/projects/:id/categories', auth_1.authMiddleware, projectController_1.addCategory);
// Protected Transaction Routes
app.get('/api/transactions/project/:projectId', auth_1.authMiddleware, transactionController_1.getTransactionsByProject);
app.post('/api/transactions', auth_1.authMiddleware, transactionController_1.createTransaction);
app.put('/api/transactions/:id', auth_1.authMiddleware, transactionController_1.updateTransaction);
app.delete('/api/transactions/:id', auth_1.authMiddleware, transactionController_1.deleteTransaction);
// Protected File Upload Routes
app.post('/api/upload', auth_1.authMiddleware, upload_1.uploadMiddleware, uploadController_1.uploadFiles);
app.delete('/api/upload/:filename', auth_1.authMiddleware, uploadController_1.deleteUploadedFile);
// Attachment Serving Routes (GridFS + local disk fallback)
// Accessible both publicly and within auth context for downloads & inline previews
app.get('/api/attachments/:id', uploadController_1.serveAttachment);
app.get('/api/attachments/:id/:filename', uploadController_1.serveAttachment);
app.get('/uploads/:filename', uploadController_1.serveAttachment);
app.get('/api/uploads/:filename', uploadController_1.serveAttachment);
// Static uploads fallback
app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'uploads')));
app.use('/api/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'uploads')));
// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});
// Connect to DB and start server
(0, db_1.connectDB)().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
});
