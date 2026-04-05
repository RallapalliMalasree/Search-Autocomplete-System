/**
 * RANKING SERVICE
 *
 * Decides the order of autocomplete suggestions.
 * Pure frequency ranking: most searched = shown first.
 *
 * Formula used:
 *   score = frequency * recencyBoost
 *
 * recencyBoost: terms searched recently get a slight boost
 *   - searched within 1 hour  → boost x1.5
 *   - searched within 1 day   → boost x1.2
 *   - searched within 1 week  → boost x1.1
 *   - older                   → boost x1.0 (no boost)
 *
 * Example:
 *   "apple"       frequency=980, searched 2 hours ago → score = 980 * 1.2 = 1176
 *   "application" frequency=870, searched 10 min ago  → score = 870 * 1.5 = 1305
 *   Result: "application" ranks higher despite lower raw frequency
 */

function getRecencyBoost(lastSearchedAt) {
  if (!lastSearchedAt) return 1.0;

  const now = Date.now();
  const lastSearched = new Date(lastSearchedAt).getTime();
  const diffMs = now - lastSearched;

  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY  = 24 * ONE_HOUR;
  const ONE_WEEK = 7  * ONE_DAY;

  if (diffMs < ONE_HOUR)  return 1.5;
  if (diffMs < ONE_DAY)   return 1.2;
  if (diffMs < ONE_WEEK)  return 1.1;
  return 1.0;
}

// Rank a list of { term, frequency, last_searched_at } objects
// Returns sorted list of terms (strings), highest ranked first
function rankSuggestions(suggestions, limit = 10) {
  return suggestions
    .map((s) => ({
      term: s.term,
      score: s.frequency * getRecencyBoost(s.last_searched_at)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.term);
}

module.exports = { rankSuggestions };
