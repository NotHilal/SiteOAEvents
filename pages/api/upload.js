import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isAuthorized } from '../../src/lib/auth';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false, // Disables Next.js body parser to allow formidable to parse multipart/form-data
  },
};

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);


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

      // Images only — anything else (e.g. an .html or .svg file) would be
      // served from our own origin and could carry script.
      const ext = path.extname(file.originalFilename || file.newFilename || '').toLowerCase();
      if (!ALLOWED_EXT.has(ext) || !String(file.mimetype || '').startsWith('image/')) {
        try { fs.unlinkSync(file.filepath); } catch {}
        return res.status(400).json({ message: 'Format non autorisé (JPG, PNG, WebP, AVIF ou GIF uniquement).' });
      }

      // The admin UI may suggest a sub-path ("materials/<id>.jpg"); keep it
      // only after stripping anything that could escape uploads/.
      const safeCustom = customPath
        ? String(customPath).split(/[\\/]+/).map(seg => seg.replace(/[^a-zA-Z0-9._-]/g, '')).filter(seg => seg && seg !== '.' && seg !== '..').join('/')
        : '';
      const base = safeCustom ? safeCustom.replace(/\.[^./]+$/, '') : `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const targetFilename = `${base}${ext}`;
      const targetFilePath = path.join(UPLOADS_DIR, targetFilename);
      if (!targetFilePath.startsWith(UPLOADS_DIR + path.sep)) {
        try { fs.unlinkSync(file.filepath); } catch {}
        return res.status(400).json({ message: 'Chemin invalide' });
      }

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
          if (!filePath.startsWith(UPLOADS_DIR + path.sep)) {
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
