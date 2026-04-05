require('dotenv').config();

const express = require('express');
const path = require('path');
const pool = require('./db/postgres');
const trie = require('./services/trieService');
const { updateTrending } = require('./services/cacheService');
const searchRoutes = require('./routes/search');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', pid: process.pid }));

// API routes
app.use('/api', searchRoutes);

// Load all search terms from PostgreSQL into Trie on startup
// This warms the Trie so first-ever requests are instant (no DB hit)
async function warmUpTrie() {
  try {
    console.log('Warming up Trie from PostgreSQL...');
    const result = await pool.query(
      'SELECT term, frequency FROM searches ORDER BY frequency DESC'
    );
    for (const row of result.rows) {
      trie.insert(row.term, row.frequency);
      // Also populate trending in Redis
      await updateTrending(row.term, row.frequency);
    }
    console.log(`Trie warmed up with ${result.rows.length} terms.`);
  } catch (err) {
    console.error('Trie warmup error:', err.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Autocomplete API running on port ${PORT} (PID: ${process.pid})`);
  // Small delay to ensure DB and Redis are ready before warmup
  setTimeout(warmUpTrie, 3000);
});
