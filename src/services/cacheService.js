const redisClient = require('../db/redis');

/**
 * REDIS SORTED SETS FOR PREFIX AUTOCOMPLETE
 *
 * Key pattern:  suggest:{prefix}
 * Members:      search terms (e.g. "apple", "application")
 * Score:        frequency — higher score = shown first
 *
 * Example for prefix "app":
 *   Key:     suggest:app
 *   Members: apple (score:980), application (score:870), app store (score:760)
 *
 * ZREVRANGE returns members ordered by score HIGH → LOW (most popular first)
 */

const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 3600; // 1 hour
const prefixKey = (prefix) => `suggest:${prefix}`;

// Get top suggestions for a prefix from Redis sorted set
async function getSuggestions(prefix) {
  try {
    const key = prefixKey(prefix);
    // ZREVRANGE = get members sorted by score highest first (limit 10)
    const results = await redisClient.zRangeWithScores(key, 0, 9, { REV: true });
    return results.map((r) => ({ term: r.value, frequency: r.score }));
  } catch (err) {
    console.error('Cache getSuggestions error:', err.message);
    return [];
  }
}

// Store suggestions for a prefix in Redis sorted set
async function cacheSuggestions(prefix, suggestions) {
  try {
    const key = prefixKey(prefix);
    const members = suggestions.map((s) => ({ score: s.frequency, value: s.term }));
    if (members.length === 0) return;
    await redisClient.zAdd(key, members);
    await redisClient.expire(key, CACHE_TTL); // auto-expire after 1 hour
  } catch (err) {
    console.error('Cache cacheSuggestions error:', err.message);
  }
}

// When a term is searched, update its score in ALL its prefix sorted sets
// e.g. searching "apple" updates: suggest:a, suggest:ap, suggest:app, suggest:appl, suggest:apple
async function updateTermInCache(term, frequency) {
  try {
    const lower = term.toLowerCase();
    for (let i = 1; i <= lower.length; i++) {
      const prefix = lower.slice(0, i);
      const key = prefixKey(prefix);
      await redisClient.zAdd(key, [{ score: frequency, value: term }]);
      await redisClient.expire(key, CACHE_TTL);
    }
  } catch (err) {
    console.error('Cache updateTermInCache error:', err.message);
  }
}

// Get global trending searches (top 10 most searched terms overall)
async function getTrending(limit = 10) {
  try {
    const results = await redisClient.zRangeWithScores('trending', 0, limit - 1, { REV: true });
    return results.map((r) => ({ term: r.value, frequency: r.score }));
  } catch (err) {
    console.error('Cache getTrending error:', err.message);
    return [];
  }
}

// Update the global trending sorted set
async function updateTrending(term, frequency) {
  try {
    await redisClient.zAdd('trending', [{ score: frequency, value: term }]);
  } catch (err) {
    console.error('Cache updateTrending error:', err.message);
  }
}

module.exports = { getSuggestions, cacheSuggestions, updateTermInCache, getTrending, updateTrending };
