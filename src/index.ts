import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './db';
import { register, login } from './controllers/authController';
import { authMiddleware } from './middleware/auth';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  shareProject,
  removeCollaborator,
  addCategory,
} from './controllers/projectController';
import {
  getTransactionsByProject,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from './controllers/transactionController';
import { uploadMiddleware } from './middleware/upload';
import { uploadFiles, serveAttachment, deleteUploadedFile } from './controllers/uploadController';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5008;

// Middleware
app.use(cors({
  origin: '*', // We can restrict this in production (e.g. to our Next.js frontend URL)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Routes
// Public Auth Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

// Protected Project Routes
app.get('/api/projects', authMiddleware as any, getProjects as any);
app.get('/api/projects/:id', authMiddleware as any, getProject as any);
app.post('/api/projects', authMiddleware as any, createProject as any);
app.put('/api/projects/:id', authMiddleware as any, updateProject as any);
app.delete('/api/projects/:id', authMiddleware as any, deleteProject as any);
app.post('/api/projects/:id/share', authMiddleware as any, shareProject as any);
app.delete('/api/projects/:id/collaborators/:collaboratorId', authMiddleware as any, removeCollaborator as any);
app.post('/api/projects/:id/categories', authMiddleware as any, addCategory as any);

// Protected Transaction Routes
app.get('/api/transactions/project/:projectId', authMiddleware as any, getTransactionsByProject as any);
app.post('/api/transactions', authMiddleware as any, createTransaction as any);
app.put('/api/transactions/:id', authMiddleware as any, updateTransaction as any);
app.delete('/api/transactions/:id', authMiddleware as any, deleteTransaction as any);

// Protected File Upload Routes
app.post('/api/upload', authMiddleware as any, uploadMiddleware, uploadFiles as any);
app.delete('/api/upload/:filename', authMiddleware as any, deleteUploadedFile as any);

// Attachment Serving Routes (GridFS + local disk fallback)
// Accessible both publicly and within auth context for downloads & inline previews
app.get('/api/attachments/:id', serveAttachment as any);
app.get('/api/attachments/:id/:filename', serveAttachment as any);
app.get('/uploads/:filename', serveAttachment as any);
app.get('/api/uploads/:filename', serveAttachment as any);

// Static uploads fallback
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use('/api/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Connect to DB and start server
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
