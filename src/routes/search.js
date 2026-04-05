const express = require('express');
const router = express.Router();
const { getSuggestionsHandler, recordSearch, getTrendingHandler } = require('../controllers/searchController');

// GET  /api/suggest?q=app   — returns ranked autocomplete suggestions
router.get('/suggest', getSuggestionsHandler);

// POST /api/search           — records a completed search term
router.post('/search', recordSearch);

// GET  /api/trending          — returns top 10 global trending searches
router.get('/trending', getTrendingHandler);

module.exports = router;
