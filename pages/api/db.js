import crypto from 'crypto';
import { isAuthorized } from '../../src/lib/auth';
import db, { generateReservationReference } from '../../src/lib/sqlite-db';
import { PUBLIC_SANITIZERS, isSpam } from '../../src/lib/public-submissions';
import { rateLimit } from '../../src/lib/rate-limit';
import { slugify } from '../../src/lib/slug';
import { normalizeCategoryTitle } from '../../src/lib/catalogue-pages';
import { createRentalOrder, confirmPaidOrder, expireUnpaidOrders } from '../../src/lib/orders.js';

// URL slug for a new material or product (/catalogue/[slug]), unique across
// BOTH tables: the product page resolves product slugs first, so a material
// sharing a product's slug would be unreachable.
async function uniqueCatalogueSlug(name, fallback) {
  const base = slugify(name) || slugify(fallback) || 'article';
  const rows = await db.prepare(
    "SELECT slug FROM materials WHERE slug = ? OR slug LIKE ? UNION SELECT slug FROM products WHERE slug = ? OR slug LIKE ?"
  ).all(base, `${base}-%`, base, `${base}-%`);
  const used = new Set(rows.map(r => r.slug));
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
  return slug;
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

// Category titles must be unique ignoring case and accents ("Decorations"
// clashes with "Décorations") — checked on every insert/rename, since both
// the name key and the shown label come from the title.
async function categoryTitleTaken(item, exceptId) {
  const wanted = [item.name, item.label].filter(Boolean).map(normalizeCategoryTitle)
  if (!wanted.length) return false
  const rows = await db.prepare('SELECT id, name, label FROM categories').all()
  return rows.some(r => String(r.id) !== String(exceptId ?? '') && [r.name, r.label].filter(Boolean).map(normalizeCategoryTitle).some(t => wanted.includes(t)))
}
const TITLE_TAKEN = 'Ce titre est déjà utilisé par une autre catégorie.'

const ALLOWED_TABLES = ['materials', 'products', 'reservations', 'blocked_dates', 'blocked_hours', 'contacts', 'categories', 'settings', 'payments', 'material_price_tiers', 'site_content'];
const isValidColumn = (col) => /^[a-zA-Z0-9_]+$/.test(col);

export default async function handler(req, res) {
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
    products: ['POST', 'PUT', 'DELETE'],    // GET public, like materials: groups variants for the catalogue
    material_price_tiers: ['POST', 'PUT', 'DELETE'], // GET public — booking wizard reads prices while logged out
    categories: ['POST', 'PUT', 'DELETE'],
    blocked_dates: ['POST', 'PUT', 'DELETE'],
    blocked_hours: ['POST', 'PUT', 'DELETE'],
    reservations: ['GET', 'PUT', 'DELETE'], // GET is protected, POST (insert) is public
    contacts: ['GET', 'PUT', 'DELETE'],     // GET is protected, POST (insert) is public
    settings: ['GET', 'POST', 'PUT', 'DELETE'], // business config, admin-only end to end
    payments: ['GET', 'POST', 'PUT', 'DELETE'], // financial data, admin-only; rows are actually
                                                  // written by /api/payments/* server-side, not
                                                  // inserted through this generic endpoint
    site_content: ['POST', 'PUT', 'DELETE'],    // GET public — public pages (e.g. À Propos) read
                                                  // this while logged out; kept separate from
                                                  // settings so bank_iban/bank_bic never have to
                                                  // be exposed to make this readable
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
      if (table === 'reservations') await expireUnpaidOrders();
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

      const rows = await db.prepare(sql).all(...params);
      const data = rows.map(row => deserializeRow(table, row));
      return res.status(200).json({ data });
    }

    if (method === 'POST') {
      let payload = req.body;
      if (!payload) {
        return res.status(400).json({ message: 'Missing body payload' });
      }

      // Anonymous insert (reservations / contacts only, per requiresAuth):
      // one row, rate limited, honeypot-checked, and rebuilt server-side
      // from an allowlist — see src/lib/public-submissions.js.
      if (!isAuthorized(req)) {
        const sanitize = PUBLIC_SANITIZERS[table];
        if (!sanitize || Array.isArray(payload)) {
          return res.status(401).json({ message: 'Unauthorized access' });
        }
        if (!rateLimit(req, res, { key: `insert:${table}`, limit: 6, windowMs: 10 * 60 * 1000 })) return;
        if (isSpam(payload)) {
          // Pretend success so bots don't learn to adapt.
          return res.status(200).json({ data: { id: crypto.randomUUID() } });
        }
        if (table === 'reservations' && Array.isArray(payload.materials) && payload.materials.length) {
          const data = await createRentalOrder(payload);
          return res.status(201).json({ data });
        }
        const { record, error } = await sanitize(payload);
        if (error) return res.status(400).json({ message: error });
        payload = record;
      }

      const isArray = Array.isArray(payload);
      const items = isArray ? payload : [payload];
      const insertedItems = [];
      if (table === 'categories') {
        for (const item of items) {
          if (await categoryTitleTaken(item, item.id)) return res.status(409).json({ message: TITLE_TAKEN });
        }
      }

      const transaction = db.transaction(async () => {
        for (let item of items) {
          const isUpsert = item.__upsert === true;
          if (isUpsert) {
            delete item.__upsert;
          }

          const id = item.id || crypto.randomUUID();
          const created_at = item.created_at || new Date().toISOString();
          const extra = {};
          if (table === 'reservations' && !item.reference) {
            extra.reference = await generateReservationReference();
          }
          if ((table === 'materials' || table === 'products') && !item.slug) {
            extra.slug = await uniqueCatalogueSlug(item.name, id);
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
          await db.prepare(insertSql).run(...values);
          insertedItems.push(deserializeRow(table, record));
        }
      });

      await transaction();
      return res.status(200).json({ data: isArray ? insertedItems : insertedItems[0] });
    }

    if (method === 'PUT') {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ message: 'Missing body payload' });
      }

      const actualPayload = payload.payload ? payload.payload : payload;
      const actualFilters = payload.filters ? payload.filters : filters;

      if (table === 'reservations') {
        const id = actualFilters.find(f => f.type === 'eq' && f.field === 'id')?.value;
        const directOrders = id
          ? await db.prepare("SELECT status FROM reservations WHERE id = ? AND order_kind = 'rental'").all(id)
          : await db.prepare("SELECT status FROM reservations WHERE order_kind = 'rental' LIMIT 1").all();
        if (directOrders.length && (!id || actualPayload.status !== 'terminee' || Object.keys(actualPayload).length !== 1 || directOrders[0].status !== 'confirmed')) return res.status(409).json({ message: 'Le statut de cette commande est géré par le paiement. Seule une commande confirmée peut être marquée terminée.' });
      }

      if (table === 'payments' && actualPayload.status === 'paid') {
        const id = actualFilters.find(f => f.type === 'eq' && f.field === 'id')?.value;
        if (!id) return res.status(400).json({ message: 'Un versement précis est requis.' });
        const currentPayment = await db.prepare('SELECT reservation_id FROM payments WHERE id = ?').get(id);
        if (currentPayment) await expireUnpaidOrders(currentPayment.reservation_id);
        const payment = await db.writeTransaction(async tx => {
          const p = await tx.prepare('SELECT * FROM payments WHERE id = ?').get(id);
          const order = p && await tx.prepare('SELECT status, expires_at FROM reservations WHERE id = ?').get(p.reservation_id);
          if (!p || p.method !== 'virement' || !['awaiting_payment', 'confirmed'].includes(order?.status) || (order.status === 'awaiting_payment' && order.expires_at && Date.parse(order.expires_at) <= Date.now())) throw Object.assign(new Error('Ce virement ne peut pas être confirmé : vérifiez le statut de la commande et la disponibilité avant de traiter un versement tardif.'), { status: 409 });
          await tx.prepare("UPDATE payments SET status = 'paid', paid_at = COALESCE(paid_at, ?) WHERE id = ?").run(new Date().toISOString(), id);
          return p;
        });
        await confirmPaidOrder(payment.reservation_id);
        return res.json({ data: await db.prepare('SELECT * FROM payments WHERE id = ?').all(id) });
      }

      if (table === 'categories' && (actualPayload.name || actualPayload.label)) {
        const idFilter = (actualFilters || []).find(f => f.field === 'id' && f.type === 'eq')
        if (!idFilter) return res.status(400).json({ message: 'Category rename needs an id filter' })
        if (await categoryTitleTaken(actualPayload, idFilter.value)) return res.status(409).json({ message: TITLE_TAKEN })
      }

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

      await db.prepare(sql).run(...params);

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

      const updatedRows = await db.prepare(selectSql).all(...selectParams);
      const updatedData = updatedRows.map(row => deserializeRow(table, row));

      return res.status(200).json({ data: updatedData });
    }

    if (method === 'DELETE') {
      const payload = req.body;
      const actualFilters = payload && payload.filters ? payload.filters : filters;
      if (table === 'reservations' || table === 'payments') {
        const id = actualFilters.find(f => f.type === 'eq' && f.field === 'id')?.value;
        const direct = table === 'reservations'
          ? await db.prepare("SELECT id FROM reservations WHERE order_kind = 'rental'" + (id ? ' AND id = ?' : '') + ' LIMIT 1').get(...(id ? [id] : []))
          : await db.prepare("SELECT p.id FROM payments p JOIN reservations r ON r.id = p.reservation_id WHERE r.order_kind = 'rental'" + (id ? ' AND p.id = ?' : '') + ' LIMIT 1').get(...(id ? [id] : []));
        if (direct) return res.status(409).json({ message: 'Les commandes directes et leurs paiements sont conservés pour le suivi.' });
      }

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

      const info = await db.prepare(sql).run(...params);
      return res.status(200).json({ data: { deleted: info.changes } });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error(`[API DB Error for ${table}]`, error);
    return res.status(error.status || (/SQLITE_BUSY|SQLITE_LOCKED/.test(String(error.code)) ? 409 : 500)).json({ message: error.status ? error.message : /SQLITE_BUSY|SQLITE_LOCKED/.test(String(error.code)) ? 'Une autre commande est en cours. Réessayez dans quelques instants.' : 'Internal Server Error' });
  }
}
