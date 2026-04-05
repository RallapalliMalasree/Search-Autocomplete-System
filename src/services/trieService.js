/**
 * TRIE DATA STRUCTURE
 *
 * A Trie is a tree where each node = one character.
 * Words are stored by tracing a path from root to a leaf.
 *
 * Example — inserting "apple" and "app":
 *
 *   root
 *    └── a
 *         └── p
 *              └── p  ← isEnd=true (word: "app", freq: 870)
 *                   └── l
 *                        └── e  ← isEnd=true (word: "apple", freq: 980)
 *
 * To find all words starting with "app":
 *   Walk root → a → p → p, then collect all words below that node.
 */

class TrieNode {
  constructor() {
    this.children = {};   // map of character → TrieNode
    this.isEnd = false;   // true if a complete word ends here
    this.term = '';       // the full word (only set if isEnd = true)
    this.frequency = 0;   // how many times this term was searched
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  // Insert a search term into the Trie with its frequency score
  insert(term, frequency) {
    let node = this.root;
    for (const char of term.toLowerCase()) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEnd = true;
    node.term = term;
    node.frequency = frequency;
  }

  // Update frequency of an existing term (called when user searches)
  updateFrequency(term, frequency) {
    let node = this.root;
    for (const char of term.toLowerCase()) {
      if (!node.children[char]) return; // term not in trie
      node = node.children[char];
    }
    if (node.isEnd) node.frequency = frequency;
  }

  // Find the node where the prefix ends
  findPrefixNode(prefix) {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children[char]) return null; // prefix not found
      node = node.children[char];
    }
    return node;
  }

  // Collect all words under a given node (DFS traversal)
  collectWords(node, results = []) {
    if (node.isEnd) {
      results.push({ term: node.term, frequency: node.frequency });
    }
    for (const child of Object.values(node.children)) {
      this.collectWords(child, results);
    }
    return results;
  }

  // Main search function — returns top N suggestions for a prefix
  // sorted by frequency (most searched first)
  search(prefix, limit = 10) {
    const prefixNode = this.findPrefixNode(prefix);
    if (!prefixNode) return [];

    const allMatches = this.collectWords(prefixNode);

    // Sort by frequency descending — most popular suggestions first
    return allMatches
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit)
      .map((item) => item.term);
  }
}

// Singleton — one Trie instance shared across all requests
const trie = new Trie();

module.exports = trie;
