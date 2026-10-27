import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

export const uploadFiles = (req: AuthRequest, res: Response): void => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No file was uploaded' });
      return;
    }

    const attachments = files.map((file) => ({
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
    }));

    res.status(200).json({
      message: `${files.length} file(s) uploaded successfully`,
      attachments,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Failed to process file upload' });
  }
};

export const deleteUploadedFile = (req: AuthRequest, res: Response): void => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.resolve(process.cwd(), 'uploads', safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(200).json({ message: 'File removed successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Failed to remove file' });
  }
};
