import crypto from 'crypto';
import db, { generateReservationReference } from '../../src/lib/sqlite-db';

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

function deserializeRow(table, row) {
  if (!row) return null;
  const res = { ...row };
  if (table === 'materials') {
    res.available = res.available === 1 || res.available === true;
  }
  if (table === 'reservations') {
    try {
      res.dates = typeof res.dates === 'string' ? JSON.parse(res.dates) : (res.dates || []);
    } catch (e) {
      res.dates = [];
    }
    try {
      res.materials = typeof res.materials === 'string' ? JSON.parse(res.materials) : (res.materials || []);
    } catch (e) {
      res.materials = [];
    }
  }
  if (table === 'contacts') {
    res.read = res.read === 1 || res.read === true;
  }
  return res;
}

function serializeRow(table, data) {
  const res = { ...data };
  if (table === 'materials') {
    if (res.available !== undefined) {
      res.available = res.available ? 1 : 0;
    }
  }
  if (table === 'reservations') {
    if (res.dates !== undefined) {
      res.dates = JSON.stringify(res.dates);
    }
    if (res.materials !== undefined) {
      res.materials = JSON.stringify(res.materials);
    }
  }
  if (table === 'contacts') {
    if (res.read !== undefined) {
      res.read = res.read ? 1 : 0;
    }
  }
  return res;
}

const ALLOWED_TABLES = ['materials', 'reservations', 'blocked_dates', 'blocked_hours', 'contacts', 'categories', 'settings', 'payments'];
const isValidColumn = (col) => /^[a-zA-Z0-9_]+$/.test(col);

export default function handler(req, res) {
  const { table, select, filters: filtersStr, order: orderStr, limit, action } = req.query;

  if (!table) {
    return res.status(400).json({ message: 'Missing table parameter' });
  }

  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ message: 'Invalid table' });
  }

  // Define table access controls
  const requiresAuth = {
    materials: ['POST', 'PUT', 'DELETE'],
    categories: ['POST', 'PUT', 'DELETE'],
    blocked_dates: ['POST', 'PUT', 'DELETE'],
    blocked_hours: ['POST', 'PUT', 'DELETE'],
    reservations: ['GET', 'PUT', 'DELETE'], // GET is protected, POST (insert) is public
    contacts: ['GET', 'PUT', 'DELETE'],     // GET is protected, POST (insert) is public
    settings: ['GET', 'POST', 'PUT', 'DELETE'], // business config, admin-only end to end
    payments: ['GET', 'POST', 'PUT', 'DELETE']  // financial data, admin-only; rows are actually
                                                  // written by /api/payments/* server-side, not
                                                  // inserted through this generic endpoint
  };

  const method = req.method;
  const tableAuth = requiresAuth[table] || [];

  if (tableAuth.includes(method) || (method === 'GET' && tableAuth.includes('GET'))) {
    if (!isAuthorized(req)) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }
  }

  try {
    const filters = filtersStr ? JSON.parse(filtersStr) : [];

    if (method === 'GET') {
      let sql = `SELECT * FROM ${table}`;
      const whereClauses = [];
      const params = [];

      if (filters.length > 0) {
        for (const f of filters) {
          if (!isValidColumn(f.field)) continue;
          if (f.type === 'eq') {
            whereClauses.push(`${f.field} = ?`);
            let val = f.value;
            if (val === 'true' || val === true) val = 1;
            else if (val === 'false' || val === false) val = 0;
            params.push(val);
          } else if (f.type === 'in') {
            if (!Array.isArray(f.values) || f.values.length === 0) continue;
            const placeholders = f.values.map(() => '?').join(',');
            whereClauses.push(`${f.field} IN (${placeholders})`);
            params.push(...f.values);
          } else if (f.type === 'lte') {
            whereClauses.push(`${f.field} <= ?`);
            params.push(f.value);
          }
        }
      }

      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      if (orderStr) {
        try {
          const order = JSON.parse(orderStr);
          if (isValidColumn(order.field)) {
            const direction = order.ascending ? 'ASC' : 'DESC';
            sql += ` ORDER BY ${order.field} ${direction}`;
          }
        } catch (e) {}
      }

      if (limit) {
        const limitVal = parseInt(limit, 10);
        if (!isNaN(limitVal)) {
          sql += ` LIMIT ?`;
          params.push(limitVal);
        }
      }

      const rows = db.prepare(sql).all(...params);
      const data = rows.map(row => deserializeRow(table, row));
      return res.status(200).json({ data });
    }

    if (method === 'POST') {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ message: 'Missing body payload' });
      }

      const isArray = Array.isArray(payload);
      const items = isArray ? payload : [payload];
      const insertedItems = [];

      const transaction = db.transaction(() => {
        for (let item of items) {
          const isUpsert = item.__upsert === true;
          if (isUpsert) {
            delete item.__upsert;
          }

          const id = item.id || crypto.randomUUID();
          const created_at = item.created_at || new Date().toISOString();
          const extra = {};
          if (table === 'reservations' && !item.reference) {
            extra.reference = generateReservationReference();
          }
          const record = serializeRow(table, { ...item, ...extra, id, created_at });

          const keys = Object.keys(record);
          const validKeys = keys.filter(isValidColumn);
          
          const columns = validKeys.join(', ');
          const placeholders = validKeys.map(() => '?').join(', ');
          
          let insertSql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
          if (isUpsert || table === 'blocked_dates') {
            insertSql = `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`;
          }
          
          const values = validKeys.map(k => record[k]);
          db.prepare(insertSql).run(...values);
          insertedItems.push(deserializeRow(table, record));
        }
      });

      transaction();
      return res.status(200).json({ data: isArray ? insertedItems : insertedItems[0] });
    }

    if (method === 'PUT') {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ message: 'Missing body payload' });
      }

      const actualPayload = payload.payload ? payload.payload : payload;
      const actualFilters = payload.filters ? payload.filters : filters;

      const serializedPayload = serializeRow(table, actualPayload);
      const updateKeys = Object.keys(serializedPayload).filter(isValidColumn);

      if (updateKeys.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      const updateClauses = updateKeys.map(k => `${k} = ?`).join(', ');
      const params = updateKeys.map(k => serializedPayload[k]);

      let sql = `UPDATE ${table} SET ${updateClauses}`;
      const whereClauses = [];

      if (actualFilters && actualFilters.length > 0) {
        for (const f of actualFilters) {
          if (!isValidColumn(f.field)) continue;
          if (f.type === 'eq') {
            whereClauses.push(`${f.field} = ?`);
            let val = f.value;
            if (val === 'true' || val === true) val = 1;
            else if (val === 'false' || val === false) val = 0;
            params.push(val);
          } else if (f.type === 'in') {
            if (!Array.isArray(f.values) || f.values.length === 0) continue;
            const placeholders = f.values.map(() => '?').join(',');
            whereClauses.push(`${f.field} IN (${placeholders})`);
            params.push(...f.values);
          }
        }
      }

      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      db.prepare(sql).run(...params);

      // Query and return updated data
      let selectSql = `SELECT * FROM ${table}`;
      const selectParams = [];
      if (whereClauses.length > 0) {
        selectSql += ` WHERE ${whereClauses.join(' AND ')}`;
        if (actualFilters && actualFilters.length > 0) {
          for (const f of actualFilters) {
            if (!isValidColumn(f.field)) continue;
            if (f.type === 'eq') {
              let val = f.value;
              if (val === 'true' || val === true) val = 1;
              else if (val === 'false' || val === false) val = 0;
              selectParams.push(val);
            } else if (f.type === 'in') {
              selectParams.push(...f.values);
            }
          }
        }
      }

      const updatedRows = db.prepare(selectSql).all(...selectParams);
      const updatedData = updatedRows.map(row => deserializeRow(table, row));

      return res.status(200).json({ data: updatedData });
    }

    if (method === 'DELETE') {
      const payload = req.body;
      const actualFilters = payload && payload.filters ? payload.filters : filters;

      let sql = `DELETE FROM ${table}`;
      const whereClauses = [];
      const params = [];

      if (actualFilters && actualFilters.length > 0) {
        for (const f of actualFilters) {
          if (!isValidColumn(f.field)) continue;
          if (f.type === 'eq') {
            whereClauses.push(`${f.field} = ?`);
            let val = f.value;
            if (val === 'true' || val === true) val = 1;
            else if (val === 'false' || val === false) val = 0;
            params.push(val);
          } else if (f.type === 'in') {
            if (!Array.isArray(f.values) || f.values.length === 0) continue;
            const placeholders = f.values.map(() => '?').join(',');
            whereClauses.push(`${f.field} IN (${placeholders})`);
            params.push(...f.values);
          }
        }
      }

      if (whereClauses.length > 0) {
        sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      const info = db.prepare(sql).run(...params);
      return res.status(200).json({ data: { deleted: info.changes } });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error(`[API DB Error for ${table}]`, error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
