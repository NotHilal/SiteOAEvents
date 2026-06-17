import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false, // Disables Next.js body parser to allow formidable to parse multipart/form-data
  },
};

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Helper to check token authorization
function isAuthorized(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    
    const token = authHeader.split(' ')[1];
    const [payloadStr, signature] = token.split('.');
    
    const secret = process.env.JWT_SECRET || 'super_secret_local_key_for_jwt_tokens_12345';
    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadStr).digest('base64');
    
    if (signature !== expectedSignature) return false;
    
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64').toString('utf8'));
    if (Date.now() > payload.exp) return false; // Expired
    
    return payload.role === 'authenticated';
  } catch(e) {
    return false;
  }
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ message: 'Unauthorized access' });
  }

  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  if (req.method === 'POST') {
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('[Upload API Error]', err);
        return res.status(500).json({ message: 'Error parsing upload form' });
      }

      const fileArray = files.file;
      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
      
      const pathArray = fields.path;
      const customPath = Array.isArray(pathArray) ? pathArray[0] : pathArray;

      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Use the custom path provided by the frontend if available, otherwise original file name
      const targetFilename = customPath || file.newFilename || `${Date.now()}-${file.originalFilename}`;
      const targetFilePath = path.join(UPLOADS_DIR, targetFilename);

      // Ensure subdirectory in uploads exists if frontend requested it
      const fileDir = path.dirname(targetFilePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      try {
        fs.renameSync(file.filepath, targetFilePath);
        return res.status(200).json({
          data: {
            path: targetFilename
          }
        });
      } catch (renameError) {
        // Fallback if cross-device link fails
        try {
          fs.copyFileSync(file.filepath, targetFilePath);
          fs.unlinkSync(file.filepath);
          return res.status(200).json({
            data: {
              path: targetFilename
            }
          });
        } catch(copyError) {
          console.error('[Upload Save Error]', copyError);
          return res.status(500).json({ message: 'Failed to save uploaded file' });
        }
      }
    });
    return;
  }

  if (req.method === 'DELETE') {
    // Read JSON body (manually since bodyParser is disabled)
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const paths = payload.paths || [];

        const deleted = [];
        const errors = [];

        paths.forEach(p => {
          const filePath = path.join(UPLOADS_DIR, p);
          // Prevent directory traversal attacks
          if (!filePath.startsWith(UPLOADS_DIR)) {
            errors.push({ path: p, error: 'Access denied' });
            return;
          }

          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              deleted.push(p);
            } catch(e) {
              errors.push({ path: p, error: e.message });
            }
          } else {
            deleted.push(p); // Already deleted or doesn't exist
          }
        });

        return res.status(200).json({ data: { deleted, errors } });
      } catch(e) {
        console.error('[Upload DELETE Parse Error]', e);
        return res.status(400).json({ message: 'Invalid payload' });
      }
    });
    return;
  }

  return res.status(405).json({ message: 'Method Not Allowed' });
}
