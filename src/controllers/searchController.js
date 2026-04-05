const pool = require('../db/postgres');
const trie = require('../services/trieService');
const { getSuggestions, cacheSuggestions, updateTermInCache, getTrending, updateTrending } = require('../services/cacheService');
const { rankSuggestions } = require('../services/rankingService');

const MAX_SUGGESTIONS = parseInt(process.env.MAX_SUGGESTIONS) || 10;

/**
 * GET /api/suggest?q=prefix
 *
 * Returns ranked autocomplete suggestions for a given prefix.
 *
 * Lookup order (fastest to slowest):
 *   1. Trie  (in-memory, microseconds)
 *   2. Redis (in-memory cache, ~0.1ms)
 *   3. PostgreSQL (disk, ~5-10ms) — only on cold cache miss
 */
async function getSuggestionsHandler(req, res) {
  const q = (req.query.q || '').toLowerCase().trim();

  if (!q || q.length < 1) {
    return res.json({ suggestions: [], source: 'empty' });
  }

  // ── LAYER 1: Trie (fastest — pure in-memory tree lookup) ──────────────────
  const trieResults = trie.search(q, MAX_SUGGESTIONS);
  if (trieResults.length > 0) {
    return res.json({ suggestions: trieResults, source: 'trie' });
  }

  // ── LAYER 2: Redis Sorted Set (fast — in-memory but persisted) ─────────────
  const cached = await getSuggestions(q);
  if (cached.length > 0) {
    const ranked = rankSuggestions(cached, MAX_SUGGESTIONS);
    return res.json({ suggestions: ranked, source: 'cache' });
  }

  // ── LAYER 3: PostgreSQL (source of truth — slowest but always accurate) ────
  try {
    const result = await pool.query(
      `SELECT term, frequency, last_searched_at
       FROM searches
       WHERE term ILIKE $1
       ORDER BY frequency DESC
       LIMIT $2`,
      [`${q}%`, MAX_SUGGESTIONS * 2] // fetch extra for ranking
    );

    if (result.rows.length === 0) {
      return res.json({ suggestions: [], source: 'db' });
    }

    // Apply ranking algorithm (frequency + recency boost)
    const ranked = rankSuggestions(result.rows, MAX_SUGGESTIONS);

    // Populate Redis cache so next request is fast
    await cacheSuggestions(q, result.rows);

    // Also insert into Trie for future in-memory lookups
    result.rows.forEach((row) => trie.insert(row.term, row.frequency));

    return res.json({ suggestions: ranked, source: 'db' });
  } catch (err) {
    console.error('getSuggestions DB error:', err.message);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
}

/**
 * POST /api/search
 * Body: { term: "apple" }
 *
 * Records a completed search:
 * 1. Upsert term in PostgreSQL (insert or increment frequency)
 * 2. Update Redis sorted sets for all prefixes of the term
 * 3. Update Trie with new frequency
 * 4. Update global trending list
 */
async function recordSearch(req, res) {
  const term = (req.body.term || '').trim();

  if (!term) {
    return res.status(400).json({ error: 'Search term is required' });
  }

  try {
    // Upsert: if term exists → increment frequency, else insert with frequency=1
    const result = await pool.query(
      `INSERT INTO searches (term, frequency, last_searched_at)
       VALUES ($1, 1, NOW())
       ON CONFLICT (term)
       DO UPDATE SET
         frequency = searches.frequency + 1,
         last_searched_at = NOW()
       RETURNING term, frequency`,
      [term.toLowerCase()]
    );

    const { frequency } = result.rows[0];

    // Update Redis sorted sets for all prefixes (async — don't block response)
    updateTermInCache(term.toLowerCase(), frequency).catch(() => {});

    // Update in-memory Trie
    trie.updateFrequency(term.toLowerCase(), frequency);
    if (frequency === 1) trie.insert(term.toLowerCase(), frequency); // new term

    // Update global trending
    updateTrending(term.toLowerCase(), frequency).catch(() => {});

    res.json({ term, frequency, message: 'Search recorded' });
  } catch (err) {
    console.error('recordSearch error:', err.message);
    res.status(500).json({ error: 'Failed to record search' });
  }
}

/**
 * GET /api/trending
 * Returns top 10 globally trending search terms
 */
async function getTrendingHandler(req, res) {
  try {
    // Try Redis first
    const cached = await getTrending(10);
    if (cached.length > 0) {
      return res.json({ trending: cached.map((t) => t.term), source: 'cache' });
    }

    // Fallback to PostgreSQL
    const result = await pool.query(
      `SELECT term, frequency FROM searches
       ORDER BY frequency DESC LIMIT 10`
    );

    res.json({ trending: result.rows.map((r) => r.term), source: 'db' });
  } catch (err) {
    console.error('getTrending error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trending' });
  }
}

module.exports = { getSuggestionsHandler, recordSearch, getTrendingHandler };
