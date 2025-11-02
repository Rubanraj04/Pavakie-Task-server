const express = require('express');
const multer = require('multer');
const { auth } = require('../middleware/auth');
const { extractKeywordsFromResume } = require('../services/resumeParser');
const { uploadFile } = require('../services/gridfsService');
const Resume = require('../models/Resume');
const User = require('../models/User');

const router = express.Router();

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (increased for local storage)
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOC/DOCX files are allowed.'));
    }
  },
});

/**
 * Upload resume to MongoDB GridFS
 * POST /api/upload/resume
 */
router.post('/resume', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user._id;
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;
    const fileSize = req.file.size;

    // Check if user already has a resume
    const existingResume = await Resume.findOne({ userId });

    // Upload file to GridFS
    const uploadResult = await uploadFile(
      fileBuffer,
      fileName,
      fileType,
      { userId: userId.toString() }
    );

    // Extract keywords from resume
    let keywords = [];
    try {
      keywords = await extractKeywordsFromResume(fileBuffer, fileType);
    } catch (parseError) {
      console.error('Error parsing resume:', parseError);
    }

    // Delete old resume if exists
    if (existingResume) {
      const { deleteFile } = require('../services/gridfsService');
      try {
        await deleteFile(existingResume.gridFSFileId);
      } catch (deleteError) {
        console.error('Error deleting old resume:', deleteError);
      }
      // Update existing resume record
      existingResume.fileName = fileName;
      existingResume.fileType = fileType;
      existingResume.fileSize = fileSize;
      existingResume.gridFSFileId = uploadResult.fileId;
      existingResume.keywords = keywords;
      existingResume.uploadedAt = new Date();
      await existingResume.save();
    } else {
      // Create new resume record
      const resume = new Resume({
        userId,
        fileName,
        fileType,
        fileSize,
        gridFSFileId: uploadResult.fileId,
        keywords,
      });
      await resume.save();
    }

    // Update user profile
    const user = await User.findById(userId);
    user.resumeFileId = uploadResult.fileId;
    user.resumeFileName = fileName;
    user.resumeFileType = fileType;
    user.resumeKeywords = keywords;
    user.resumeUploadedAt = new Date();
    // Generate URL for downloading (will use GET endpoint)
    user.resumeUrl = `/api/upload/resume/${uploadResult.fileId}`;
    await user.save();

    res.json({
      resumeUrl: `/api/upload/resume/${uploadResult.fileId}`,
      fileId: uploadResult.fileId,
      fileName,
      keywords,
      message: 'Resume uploaded successfully to MongoDB',
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ message: error.message || 'Error uploading resume' });
  }
});

/**
 * Download resume from MongoDB GridFS
 * GET /api/upload/resume/:fileId
 */
router.get('/resume/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user._id;

    // Verify user owns this resume
    const resume = await Resume.findOne({ 
      gridFSFileId: fileId,
      userId: userId 
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found or access denied' });
    }

    // Download file from GridFS
    const { downloadFile } = require('../services/gridfsService');
    const fileData = await downloadFile(fileId);

    // Set appropriate headers
    res.setHeader('Content-Type', fileData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.filename}"`);
    res.setHeader('Content-Length', fileData.size);

    // Send file buffer
    res.send(fileData.buffer);
  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({ message: error.message || 'Error downloading resume' });
  }
});

/**
 * View resume (inline) from MongoDB GridFS
 * GET /api/upload/resume/:fileId/view
 */
router.get('/resume/:fileId/view', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user._id;

    // Verify user owns this resume
    const resume = await Resume.findOne({ 
      gridFSFileId: fileId,
      userId: userId 
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found or access denied' });
    }

    // Download file from GridFS
    const { downloadFile } = require('../services/gridfsService');
    const fileData = await downloadFile(fileId);

    // Set appropriate headers for inline viewing
    res.setHeader('Content-Type', fileData.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileData.filename}"`);
    res.setHeader('Content-Length', fileData.size);

    // Send file buffer
    res.send(fileData.buffer);
  } catch (error) {
    console.error('Error viewing resume:', error);
    res.status(500).json({ message: error.message || 'Error viewing resume' });
  }
});

/**
 * Delete resume from MongoDB GridFS
 * DELETE /api/upload/resume/:fileId
 */
router.delete('/resume/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user._id;

    // Find and verify resume ownership
    const resume = await Resume.findOne({ 
      gridFSFileId: fileId,
      userId: userId 
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found or access denied' });
    }

    // Delete file from GridFS
    const { deleteFile } = require('../services/gridfsService');
    await deleteFile(fileId);

    // Delete resume record
    await Resume.findByIdAndDelete(resume._id);

    // Update user profile
    const user = await User.findById(userId);
    user.resumeFileId = undefined;
    user.resumeFileName = undefined;
    user.resumeFileType = undefined;
    user.resumeUrl = undefined;
    user.resumeKeywords = [];
    user.resumeUploadedAt = undefined;
    await user.save();

    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ message: error.message || 'Error deleting resume' });
  }
});

module.exports = router;

