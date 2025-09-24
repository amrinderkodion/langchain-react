// pinecone-connect.js (Updated to match your frontend)
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';

config();

const app = express();
app.use(express.json());
app.use(cors());

class PineconeGeminiService {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    this.indexName = process.env.PINECONE_INDEX_NAME; // Your index name
    this.index = this.pinecone.index(this.indexName);
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  async generateEmbedding(text) {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: "text-embedding-004" 
      });
      
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating Gemini embedding:', error);
      throw error;
    }
  }

  async querySimilarText(queryText, topK = 5) {
    try {
      const queryEmbedding = await this.generateEmbedding(queryText);
      
      const result = await this.index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
      });
      
      return result;
    } catch (error) {
      console.error('Error querying Pinecone:', error);
      throw error;
    }
  }
}

const pineconeService = new PineconeGeminiService();

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const stats = await pineconeService.index.describeIndexStats();
    res.json({ 
      status: 'healthy', 
      index: pineconeService.indexName,
      stats 
    });
  } catch (error) {
    res.status(500).json({ error: 'Service unhealthy', details: error.message });
  }
});

// Main query endpoint (matches your frontend expectation)
app.post('/api/pinecone-query', async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query text is required' });
    }

    const results = await pineconeService.querySimilarText(query, topK);
    res.json(results);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Query failed', details: error.message });
  }
});

// Additional endpoint for RAG functionality
app.post('/api/rag-query', async (req, res) => {
  try {
    const { query, chat_history, topK = 3 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query text is required' });
    }

    // 1. Get relevant context from Pinecone
    const vectorResults = await pineconeService.querySimilarText(query, topK);
    
    // 2. Format context for the LLM
    const context = vectorResults.matches
      .map(match => match.metadata?.text || '')
      .filter(text => text.trim())
      .join('\n\n');
    
    // 3. Return context for the agent to process
    res.json({
      context,
      vectorResults: vectorResults.matches,
      query
    });
    
  } catch (error) {
    console.error('RAG query error:', error);
    res.status(500).json({ error: 'RAG query failed', details: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Pinecone Server running on http://localhost:${PORT}`);
  console.log(`📊 Connected to index: ${pineconeService.indexName}`);
});

export default PineconeGeminiService;