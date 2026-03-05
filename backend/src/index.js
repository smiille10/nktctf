const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// ── Middleware ──
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Uploads statiques ──
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));

// ── Routes ──
try {
  app.use('/api/auth',       require('./routes/auth'));
  app.use('/api/challenges', require('./routes/challenges'));
  app.use('/api/admin',      require('./routes/admin'));
  app.use('/api/events',     require('./routes/events'));
  app.use('/api/scoreboard', require('./routes/scoreboard'));
  app.use('/api/profile',    require('./routes/profile'));
  app.use('/api/teams',      require('./routes/teams'));
} catch (err) {
  console.error('❌ Route loading error:', err.message);
}

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ── Start ──
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});