import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Crear tabla si no existe
async function initDB(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS reclamos (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT NOT NULL,
      apellido    TEXT NOT NULL,
      email       TEXT NOT NULL,
      telefono    TEXT,
      barrio      TEXT NOT NULL,
      direccion   TEXT,
      categoria   TEXT NOT NULL,
      prioridad   TEXT NOT NULL,
      residencia  TEXT,
      descripcion TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT now()
    )
  `);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = await pool.connect();
  try {
    await initDB(client);

    // GET — traer todos los reclamos
    if (req.method === 'GET') {
      const result = await client.query(
        'SELECT * FROM reclamos ORDER BY created_at DESC LIMIT 500'
      );
      return res.status(200).json({ ok: true, data: result.rows });
    }

    // POST — guardar nuevo reclamo
    if (req.method === 'POST') {
      const { nombre, apellido, email, telefono, barrio, direccion, categoria, prioridad, residencia, descripcion } = req.body;

      if (!nombre || !apellido || !email || !barrio || !categoria || !prioridad || !descripcion) {
        return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
      }

      const result = await client.query(
        `INSERT INTO reclamos (nombre, apellido, email, telefono, barrio, direccion, categoria, prioridad, residencia, descripcion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [nombre, apellido, email, telefono || '', barrio, direccion || '', categoria, prioridad, residencia || 'residente', descripcion]
      );

      return res.status(201).json({ ok: true, data: result.rows[0] });
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido' });

  } catch (err) {
    console.error('DB error:', err);
    return res.status(500).json({ ok: false, error: 'Error de base de datos' });
  } finally {
    client.release();
  }
}
