import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isAuthorized } from '../../src/lib/auth';
import db from '../../src/lib/sqlite-db';
import formidable from 'formidable';

// Uploads are stored in the database (files table), not written to
// public/uploads/: a local folder isn't shared between machines, isn't in
// git, and can't be written on a production host. They're still served at
// /uploads/<path> (pages/api/files/[...path].js via the rewrite in
// next.config.js), so URLs saved in the database keep the same shape.

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

  if (req.method === 'POST') {
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    form.parse(req, async (err, fields, files) => {
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

      try {
        const data = fs.readFileSync(file.filepath);
        await db.prepare('INSERT OR REPLACE INTO files (path, mime, data, size, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(targetFilename, file.mimetype, data, data.length, new Date().toISOString());
        return res.status(200).json({ data: { path: targetFilename } });
      } catch (saveError) {
        console.error('[Upload Save Error]', saveError);
        return res.status(500).json({ message: "L'image n'a pas pu être enregistrée." });
      } finally {
        try { fs.unlinkSync(file.filepath); } catch {}
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

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const paths = payload.paths || [];
        // Database only. Files on disk under public/uploads/ are the
        // catalogue photos committed to git (shared by every machine), so
        // they're never deleted from here — replacing one in Espace OA just
        // points the article at its new photo.
        const deleted = [];
        const errors = [];
        for (const p of paths.map(String)) {
          try {
            await db.prepare('DELETE FROM files WHERE path = ?').run(p);
            deleted.push(p);
          } catch (e) {
            errors.push({ path: p, error: e.message });
          }
        }

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
