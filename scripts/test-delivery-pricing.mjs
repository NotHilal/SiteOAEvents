import assert from 'node:assert/strict'
import pg from 'pg'
import { createTestDatabase } from './lib/test-db.mjs'
import { MIGRATIONS } from '../src/lib/db/migrations.js'
import { deliveryFee } from '../src/lib/delivery-pricing.js'

assert.equal(deliveryFee(20, 0.75), 60)
assert.equal(deliveryFee(10, 0.75), 30)
assert.equal(deliveryFee(0, 0.75), 0)
assert.equal(deliveryFee(20, 0.75, 5), 65, 'optional admin surcharge remains explicit')

const testDb = await createTestDatabase()
const client = new pg.Client({ connectionString: testDb.url })
try {
  await client.connect()
  // Upgrade a pre-change database with a paid historical order.
  for (const migration of MIGRATIONS.filter(m => m.id !== '003_delivery_two_round_trips')) await client.query(migration.sql)
  await client.query("INSERT INTO settings (key, value) VALUES ('delivery_per_km', '1.2'), ('delivery_base_fee', '15')")
  await client.query("INSERT INTO reservations (id, date, status, distance_km, quote_per_km, quote_base_fee, delivery_fee, grand_total) VALUES ('legacy-paid', '2026-11-01', 'confirmed', 10, 1.2, 15, 27, 39)")
  await client.query(MIGRATIONS.find(m => m.id === '003_delivery_two_round_trips').sql)
  const { rows: [order] } = await client.query("SELECT quote_trip_count, quote_per_km, quote_base_fee, delivery_fee, grand_total FROM reservations WHERE id = 'legacy-paid'")
  assert.deepEqual(order, { quote_trip_count: 1, quote_per_km: 1.2, quote_base_fee: 15, delivery_fee: 27, grand_total: 39 })
  const { rows } = await client.query('SELECT key, value FROM settings')
  assert.equal(rows.find(r => r.key === 'delivery_per_km').value, '0.75')
  assert.equal(rows.find(r => r.key === 'delivery_base_fee').value, '0')
  console.log('PASS: four journeys at 0.75 euros/km, migration updates delivery settings while preserving historical order totals and pricing snapshots.')
} finally {
  await client.end()
  await testDb.drop()
}
