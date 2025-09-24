// src/services/vectorDbService.js

// Local, in-memory BM25-style search to avoid external embedding APIs

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

let storedDocs = [];
let dfMap = new Map();
let avgDocLength = 0;

function rebuildIndex() {
  dfMap = new Map();
  let totalLength = 0;
  for (const doc of storedDocs) {
    const uniqueTokens = new Set(doc.tokens);
    totalLength += doc.tokens.length;
    for (const tok of uniqueTokens) {
      dfMap.set(tok, (dfMap.get(tok) || 0) + 1);
    }
  }
  avgDocLength = storedDocs.length > 0 ? totalLength / storedDocs.length : 0;
}

export const initializeVectorStore = async (documents = []) => {
  try {
    storedDocs = documents.map((text) => {
      const tokens = tokenize(text);
      const termFreq = new Map();
      for (const t of tokens) termFreq.set(t, (termFreq.get(t) || 0) + 1);
      return { pageContent: text, tokens, termFreq };
    });
    rebuildIndex();
    console.log("Local keyword index initialized and populated.");
    return true;
  } catch (error) {
    console.error("Error initializing local index:", error);
    return false;
  }
};

export const addDocuments = async (documents) => {
  for (const text of documents) {
    const tokens = tokenize(text);
    const termFreq = new Map();
    for (const t of tokens) termFreq.set(t, (termFreq.get(t) || 0) + 1);
    storedDocs.push({ pageContent: text, tokens, termFreq });
  }
  rebuildIndex();
  console.log("Documents added to local index.");
};

export const searchDocuments = async (query, k = 5) => {
  if (storedDocs.length === 0) return [];
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const N = storedDocs.length;
  const k1 = 1.5;
  const b = 0.75;

  function idf(term) {
    const df = dfMap.get(term) || 0;
    return Math.log(1 + (N - df + 0.5) / (df + 0.5));
  }

  const scored = storedDocs.map((doc) => {
    const dl = doc.tokens.length || 1;
    let score = 0;
    for (const qt of queryTokens) {
      const tf = doc.termFreq.get(qt) || 0;
      if (tf === 0) continue;
      const denom = tf + k1 * (1 - b + (b * dl) / (avgDocLength || 1));
      score += idf(qt) * ((tf * (k1 + 1)) / denom);
    }
    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score > 0)
    .slice(0, k)
    .map((s) => ({ pageContent: s.doc.pageContent, score: s.score }));
};