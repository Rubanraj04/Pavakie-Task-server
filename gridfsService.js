const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const crypto = require('crypto');

/**
 * GridFS Service for storing and retrieving files from MongoDB
 * This service handles file uploads, downloads, and deletions using MongoDB GridFS
 */

let gfs;

/**
 * Initialize GridFS connection
 * @returns {Promise<GridFSBucket>} GridFS bucket instance
 */
async function initGridFS() {
  try {
    // Wait for MongoDB connection if not ready
    if (mongoose.connection.readyState !== 1) {
      // Wait up to 5 seconds for connection
      let attempts = 0;
      while (mongoose.connection.readyState !== 1 && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB connection not established. Please check your connection.');
      }
    }

    if (!mongoose.connection.db) {
      throw new Error('MongoDB database not available');
    }

    // Create GridFS bucket named 'resumes'
    gfs = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'resumes',
    });

    console.log('✅ GridFS initialized successfully');
    return gfs;
  } catch (error) {
    console.error('❌ Error initializing GridFS:', error.message);
    // Don't throw - allow server to continue without GridFS
    // GridFS will be initialized on first use
    return null;
  }
}

/**
 * Upload file to GridFS
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} mimeType - File MIME type
 * @param {Object} metadata - Additional metadata to store
 * @returns {Promise<Object>} File information including fileId
 */
async function uploadFile(buffer, filename, mimeType, metadata = {}) {
  try {
    if (!gfs) {
      const result = await initGridFS();
      if (!result) {
        throw new Error('GridFS not available. Please check MongoDB connection.');
      }
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
    const fileExtension = filename.split('.').pop();
    const uniqueFilename = `${timestamp}-${hash}.${fileExtension}`;

    return new Promise((resolve, reject) => {
      const uploadStream = gfs.openUploadStream(uniqueFilename, {
        contentType: mimeType,
        metadata: {
          originalName: filename,
          uploadedAt: new Date(),
          ...metadata,
        },
      });

      const chunks = [];
      uploadStream.on('error', (error) => {
        reject(error);
      });

      uploadStream.on('finish', () => {
        resolve({
          fileId: uploadStream.id,
          filename: uniqueFilename,
          originalName: filename,
        });
      });

      // Write buffer to stream
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Error uploading file to GridFS:', error);
    throw error;
  }
}

/**
 * Download file from GridFS
 * @param {mongoose.Types.ObjectId} fileId - GridFS file ID
 * @returns {Promise<Object>} File stream and metadata
 */
async function downloadFile(fileId) {
  try {
    if (!gfs) {
      const result = await initGridFS();
      if (!result) {
        throw new Error('GridFS not available. Please check MongoDB connection.');
      }
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Get file metadata first
        const files = await gfs.find({ _id: fileId }).toArray();
        const fileInfo = files[0];

        if (!fileInfo) {
          reject(new Error('File not found'));
          return;
        }

        const downloadStream = gfs.openDownloadStream(fileId);
        const chunks = [];
        
        downloadStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        downloadStream.on('error', (error) => {
          reject(error);
        });

        downloadStream.on('end', () => {
          try {
            const fileBuffer = Buffer.concat(chunks);
            resolve({
              buffer: fileBuffer,
              filename: fileInfo.metadata?.originalName || fileInfo.filename,
              contentType: fileInfo.contentType,
              size: fileInfo.length,
            });
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    console.error('Error downloading file from GridFS:', error);
    throw error;
  }
}

/**
 * Delete file from GridFS
 * @param {mongoose.Types.ObjectId} fileId - GridFS file ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteFile(fileId) {
  try {
    if (!gfs) {
      const result = await initGridFS();
      if (!result) {
        throw new Error('GridFS not available. Please check MongoDB connection.');
      }
    }

    return new Promise((resolve, reject) => {
      gfs.delete(fileId, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Error deleting file from GridFS:', error);
    throw error;
  }
}

/**
 * Check if file exists in GridFS
 * @param {mongoose.Types.ObjectId} fileId - GridFS file ID
 * @returns {Promise<boolean>} Whether file exists
 */
async function fileExists(fileId) {
  try {
    if (!gfs) {
      const result = await initGridFS();
      if (!result) {
        return false;
      }
    }

    const files = await gfs.find({ _id: fileId }).toArray();
    return files.length > 0;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}

module.exports = {
  initGridFS,
  uploadFile,
  downloadFile,
  deleteFile,
  fileExists,
};
