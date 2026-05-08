const express = require('express');
const { Pool } = require('pg'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); 

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Render provides a DATABASE_URL environment variable automatically
const pool = new Pool({
  connectionString: process.env.postgresql://beesweb_db_user:F2Pl7U5hSfX6YCLxhI811eR2nram9SEz@dpg-d7v2onl0lvsc739pb8fg-a/beesweb_db,://beesweb_db_user:F2Pl7U5hSfX6YCLxhI811eR2nram9SEz@dpg-d7v2onl0lvsc739pb8fg-a/beesweb_db
  ssl: {
    rejectUnauthorized: false // Required for Render/external connections
  }
});

// Check connection
pool.connect((err) => {
  if (err) console.error('Postgres connection error:', err);
  else console.log('Connected to PostgreSQL 🐘');
});

// --- REGISTER ---
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  // PostgreSQL uses $1, $2 placeholders instead of ?
  const sql = 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id';
  
  try {
    const result = await pool.query(sql, [username, email, hashedPassword]);
    res.json({ msg: 'User registered', id: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ msg: 'Email already exists' });
    res.status(500).json(err);
  }
});

// --- LOGIN ---
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const results = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (results.rows.length === 0) return res.status(400).json({ msg: 'Invalid credentials' });

    const user = results.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ msg: 'Login successful', token });
  } catch (err) {
    res.status(500).json(err);
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
