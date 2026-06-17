import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

// Helper to read database
function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    // Fallback initialize
    return { materials: [], reservations: [], blocked_dates: [], blocked_hours: [], contacts: [], categories: [] };
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

// Helper to write database
function writeDb(data) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

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

export default function handler(req, res) {
  const { table, select, filters: filtersStr, order: orderStr, limit, action } = req.query;

  if (!table) {
    return res.status(400).json({ message: 'Missing table parameter' });
  }

  // Define table access controls
  const requiresAuth = {
    materials: ['POST', 'PUT', 'DELETE'],
    categories: ['POST', 'PUT', 'DELETE'],
    blocked_dates: ['POST', 'PUT', 'DELETE'],
    blocked_hours: ['POST', 'PUT', 'DELETE'],
    reservations: ['GET', 'PUT', 'DELETE'], // GET is protected, POST (insert) is public
    contacts: ['GET', 'PUT', 'DELETE']      // GET is protected, POST (insert) is public
  };

  const method = req.method;
  const isWriteAction = ['POST', 'PUT', 'DELETE'].includes(method) || action === 'update';
  const tableAuth = requiresAuth[table] || [];

  if (tableAuth.includes(method) || (method === 'GET' && tableAuth.includes('GET'))) {
    if (!isAuthorized(req)) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }
  }

  try {
    const db = readDb();
    if (!db[table]) {
      db[table] = [];
    }

    const filters = filtersStr ? JSON.parse(filtersStr) : [];

    // Helper function to filter items
    const applyFilters = (items) => {
      return items.filter(item => {
        return filters.every(f => {
          const val = item[f.field];
          if (f.type === 'eq') {
            return String(val) === String(f.value);
          }
          if (f.type === 'in') {
            return Array.isArray(f.values) && f.values.map(String).includes(String(val));
          }
          if (f.type === 'lte') {
            return val <= f.value;
          }
          return true;
        });
      });
    };

    if (method === 'GET') {
      let result = db[table];

      // Apply filters
      result = applyFilters(result);

      // Apply sorting if specified
      if (orderStr) {
        const order = JSON.parse(orderStr);
        result.sort((a, b) => {
          const valA = a[order.field];
          const valB = b[order.field];
          if (valA === valB) return 0;
          if (valA == null) return 1;
          if (valB == null) return -1;
          
          let comparison = 0;
          if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
          } else {
            comparison = valA < valB ? -1 : 1;
          }
          return order.ascending ? comparison : -comparison;
        });
      }

      // Apply limit
      if (limit) {
        const limitVal = parseInt(limit, 10);
        if (!isNaN(limitVal)) {
          result = result.slice(0, limitVal);
        }
      }

      return res.status(200).json({ data: result });
    }

    if (method === 'POST') {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ message: 'Missing body payload' });
      }

      const createRecord = (data) => {
        return {
          id: data.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...data
        };
      };

      let inserted;
      if (Array.isArray(payload)) {
        inserted = payload.map(createRecord);
        db[table].push(...inserted);
      } else {
        inserted = createRecord(payload);
        db[table].push(inserted);
      }

      writeDb(db);
      return res.status(200).json({ data: inserted });
    }

    if (method === 'PUT') {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ message: 'Missing body payload' });
      }

      // Supabase-like payload update structure or straight payload
      const actualPayload = payload.payload ? payload.payload : payload;
      const actualFilters = payload.filters ? payload.filters : filters;

      let updatedCount = 0;
      let updatedData = [];

      db[table] = db[table].map(item => {
        const matches = actualFilters.every(f => {
          const val = item[f.field];
          if (f.type === 'eq') return String(val) === String(f.value);
          if (f.type === 'in') return Array.isArray(f.values) && f.values.map(String).includes(String(val));
          return true;
        });

        if (matches) {
          updatedCount++;
          const updatedItem = { ...item, ...actualPayload };
          updatedData.push(updatedItem);
          return updatedItem;
        }
        return item;
      });

      writeDb(db);
      return res.status(200).json({ data: updatedData });
    }

    if (method === 'DELETE') {
      const payload = req.body;
      const actualFilters = payload && payload.filters ? payload.filters : filters;

      const beforeCount = db[table].length;
      
      db[table] = db[table].filter(item => {
        const matches = actualFilters.every(f => {
          const val = item[f.field];
          if (f.type === 'eq') return String(val) === String(f.value);
          if (f.type === 'in') return Array.isArray(f.values) && f.values.map(String).includes(String(val));
          return true;
        });
        return !matches; // Keep items that DO NOT match filters
      });

      const deletedCount = beforeCount - db[table].length;
      writeDb(db);
      return res.status(200).json({ data: { deleted: deletedCount } });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error(`[API DB Error for ${table}]`, error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
