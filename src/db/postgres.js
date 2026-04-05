const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DB || 'autocompletedb',
});

pool.query(`
  CREATE TABLE IF NOT EXISTS searches (
    id          SERIAL PRIMARY KEY,
    term        VARCHAR(255) UNIQUE NOT NULL,   -- the search term e.g. "apple"
    frequency   INTEGER DEFAULT 1,              -- how many times it was searched
    last_searched_at TIMESTAMP DEFAULT NOW()    -- when it was last searched
  );

  CREATE INDEX IF NOT EXISTS idx_searches_term ON searches (term);
  CREATE INDEX IF NOT EXISTS idx_searches_frequency ON searches (frequency DESC);
`).then(async () => {
  console.log('PostgreSQL connected. Tables and indexes ready.');
  await seedData(pool);
}).catch((err) => {
  console.error('PostgreSQL error:', err.message);
});

// Seed with popular search terms so autocomplete works immediately on first boot
async function seedData(pool) {
  const terms = [
    ['apple', 980], ['application', 870], ['app store', 760], ['apple music', 650],
    ['apple watch', 540], ['application form', 430], ['applied mathematics', 320],
    ['amazon', 950], ['amazon prime', 840], ['amazon music', 730], ['amazon fresh', 620],
    ['netflix', 900], ['netflix movies', 780], ['netflix shows', 670],
    ['google', 990], ['google maps', 880], ['google drive', 770], ['google docs', 660],
    ['youtube', 960], ['youtube music', 850], ['youtube premium', 740],
    ['facebook', 920], ['facebook login', 810], ['facebook marketplace', 700],
    ['instagram', 910], ['instagram reels', 800], ['instagram login', 690],
    ['twitter', 860], ['twitter login', 750], ['twitch', 720], ['tiktok', 830],
    ['python', 890], ['python tutorial', 780], ['python download', 670],
    ['javascript', 870], ['java', 840], ['java download', 730],
    ['nodejs', 760], ['node js tutorial', 650], ['npm', 700],
    ['react', 820], ['react tutorial', 710], ['react native', 600],
    ['docker', 790], ['docker tutorial', 680], ['docker compose', 570],
    ['redis', 740], ['redis tutorial', 630], ['redis cache', 520],
    ['postgresql', 710], ['postgres tutorial', 600], ['sql tutorial', 800],
    ['machine learning', 860], ['machine learning tutorial', 750],
    ['artificial intelligence', 840], ['deep learning', 820],
    ['github', 930], ['github login', 820], ['github tutorial', 710],
    ['stackoverflow', 880], ['stack overflow', 870],
    ['chatgpt', 970], ['openai', 940], ['claude ai', 860],
  ];

  for (const [term, frequency] of terms) {
    await pool.query(
      `INSERT INTO searches (term, frequency)
       VALUES ($1, $2)
       ON CONFLICT (term) DO NOTHING`,
      [term, frequency]
    ).catch(() => {});
  }
  console.log('Seed data loaded.');
}

module.exports = pool;
