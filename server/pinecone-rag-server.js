// server/pinecone-rag-server.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PineconeVectorStore } from '@llamaindex/pinecone';
import { VectorStoreIndex, storageContextFromDefaults, Settings, Document } from 'llamaindex';
import { GeminiEmbedding, Gemini } from '@llamaindex/google';

config();

// Validate required environment variables
const requiredEnvVars = [
  'GOOGLE_API_KEY',
  'PINECONE_API_KEY', 
  'PINECONE_INDEX_NAME'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📝 Please create a .env file with the following variables:');
  console.error('GOOGLE_API_KEY=your_google_api_key_here');
  console.error('PINECONE_API_KEY=your_pinecone_api_key_here');
  console.error('PINECONE_INDEX_NAME=your_index_name_here');
  console.error('\n💡 Get your Google API key from: https://makersuite.google.com/app/apikey');
  console.error('💡 Get your Pinecone API key from: https://app.pinecone.io/');
  process.exit(1);
}

// Configure LlamaIndex settings
Settings.embedModel = new GeminiEmbedding({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "text-embedding-004",
});

Settings.llm = new Gemini({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-2.5-flash",
  temperature: 0.1,
  maxTokens: 1024,
});

const app = express();
app.use(express.json());
app.use(cors());

// Ensure uploads directory exists under server project (Windows-safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.error('Failed to ensure uploads directory:', e);
}

const upload = multer({ dest: uploadsDir });

class RAGService {
  constructor() {
    this.initializeServices();
  }

  async initializeServices() {
    try {
      console.log('🔧 Initializing RAG service...');
      
      // Initialize Pinecone
      console.log('📡 Connecting to Pinecone...');
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
      
      this.indexName = process.env.PINECONE_INDEX_NAME;
      console.log(`🗄️  Using Pinecone index: ${this.indexName}`);
      
      // Initialize LangChain components
      console.log('🤖 Initializing Google AI embeddings...');
      this.embeddings = new GoogleGenerativeAIEmbeddings({
        modelName: "text-embedding-004",
        apiKey: process.env.GOOGLE_API_KEY,
      });
      
      console.log('💬 Initializing Google AI chat model...');
      this.llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GOOGLE_API_KEY,
        temperature: 0.1,
        maxOutputTokens: 1024,
      });
      
      // Initialize LlamaIndex vector store
      const pineconeVectorStore = new PineconeVectorStore({
        pinecone: this.pinecone,
        indexName: this.indexName,
      });
      
      const storageContext = await storageContextFromDefaults({
        vectorStore: pineconeVectorStore,
      });
      
      // Check if index exists and has data
      try {
        const index = this.pinecone.index(this.indexName);
        const stats = await index.describeIndexStats();
        console.log(`📊 Found ${stats.totalVectorCount} vectors in index`);
        
        // Use fromVectorStore to load existing index from Pinecone
        this.vectorIndex = await VectorStoreIndex.fromVectorStore(
          pineconeVectorStore,
          {
            embedModel: {
              embed: async (texts) => {
                const embeddings = await this.embeddings.embedDocuments(texts);
                return embeddings;
              }
            },
          }
        );
      } catch (error) {
        console.error('❌ Error accessing Pinecone index:', error.message);
        throw new Error(`Failed to access Pinecone index: ${error.message}`);
      }
      
      // Create query engine
      this.queryEngine = this.vectorIndex.asQueryEngine({
        llm: this.llm,
        similarityTopK: 3,
      });
      
      console.log('✅ RAG Service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing RAG service:', error);
      throw error;
    }
  }

  // Method 1: Using LlamaIndex query engine
  async queryWithLlamaIndex(query) {
    try {
      const response = await this.queryEngine.query({
        query,
      });
      return {
        answer: response.response,
        sources: response.sourceNodes?.map(node => ({
          text: node.node.text,
          score: node.score,
        })) || [],
      };
    } catch (error) {
      console.error('LlamaIndex query error:', error);
      throw error;
    }
  }

  // Method 2: Using LangChain RAG pipeline
  async queryWithLangChain(query, chatHistory = []) {
    try {
      // Get relevant documents using similarity search
      const relevantDocs = await this.vectorIndex.getRetriever().retrieve(query);
      
      // Format context
      const context = relevantDocs
        .map(doc => doc.node.text)
        .join('\n\n');
      
      // Create prompt template
      const prompt = `
You are a helpful AI assistant. Use the following context to answer the user's question.

Context:
${context}

Chat History:
${chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User Question: ${query}

Please provide a helpful and accurate answer based on the context provided. If the context doesn't contain relevant information, say so politely.`;

      // Generate response
      const response = await this.llm.invoke(prompt);
      
      return {
        answer: response.content,
        sources: relevantDocs.map(doc => ({
          text: doc.node.text.substring(0, 200) + '...',
          score: doc.score,
        })),
      };
    } catch (error) {
      console.error('LangChain query error:', error);
      throw error;
    }
  }

  // Method 3: Hybrid approach (recommended)
  async hybridRAGQuery(query, chatHistory = []) {
    try {
      // Step 1: Retrieve relevant documents
      const retriever = this.vectorIndex.asRetriever({ similarityTopK: 3 });
      const relevantDocs = await retriever.retrieve(query);
      
      // Step 2: Format context
      const context = relevantDocs
        .map((doc, index) => `[Source ${index + 1}]: ${doc.node.text}`)
        .join('\n\n');
      
      // Step 3: Create enhanced prompt
      const enhancedPrompt = this.createEnhancedPrompt(query, context, chatHistory);
      
      // Step 4: Generate response
      const response = await this.llm.invoke(enhancedPrompt);
      
      return {
        answer: response.content,
        sources: relevantDocs.map((doc, index) => ({
          id: index + 1,
          content: doc.node.text.substring(0, 300) + '...',
          similarity: doc.score?.toFixed(4),
        })),
        totalSources: relevantDocs.length,
      };
    } catch (error) {
      console.error('Hybrid RAG query error:', error);
      throw error;
    }
  }

  createEnhancedPrompt(query, context, chatHistory) {
    return `You are an expert AI assistant. Use the provided context to give accurate, helpful answers.

CONTEXT INFORMATION:
${context || "No specific context available."}

CONVERSATION HISTORY:
${chatHistory.length > 0 ? chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n') : "No previous conversation."}

USER'S QUESTION: ${query}

INSTRUCTIONS:
1. Answer based primarily on the context provided
2. If the context doesn't contain relevant information, acknowledge this politely
3. Keep your response clear, concise, and helpful
4. If referencing sources, mention them naturally in your response
5. Maintain a professional and friendly tone

ANSWER:`;
  }
}

// Initialize RAG service
const ragService = new RAGService();

// API Routes
app.get('/api/health', async (req, res) => {
  try {
    const stats = await ragService.pinecone.index(ragService.indexName).describeIndexStats();
    res.json({
      status: 'healthy',
      service: 'LangChain + LlamaIndex RAG',
      index: ragService.indexName,
      stats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Service unhealthy', details: error.message });
  }
});

app.post('/api/query', async (req, res) => {
  try {
    const { query, chat_history = [], method = 'hybrid' } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    let result;
    switch (method) {
      case 'llamaindex':
        result = await ragService.queryWithLlamaIndex(query);
        break;
      case 'langchain':
        result = await ragService.queryWithLangChain(query, chat_history);
        break;
      case 'hybrid':
      default:
        result = await ragService.hybridRAGQuery(query, chat_history);
    }

    res.json(result);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: 'Query failed', details: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await ragService.hybridRAGQuery(message, history);
    
    res.json({
      response: result.answer,
      sources: result.sources,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat failed', details: error.message });
  }
});

// Upload endpoint: accepts text/markdown/PDF, ingests into vector index
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const ingested = [];
    for (const file of files) {
      const originalName = file.originalname;
      const ext = path.extname(originalName).toLowerCase();

      let textContent = '';
      if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
        textContent = fs.readFileSync(file.path, 'utf8');
      } else {
        // Fallback: attempt to read as UTF-8 text. In real apps, add PDF/Doc parsers.
        try {
          textContent = fs.readFileSync(file.path, 'utf8');
        } catch {
          // skip non-text for now
          continue;
        }
      }

      if (!textContent || textContent.trim().length === 0) continue;

      // Prefer inserting via LlamaIndex so retriever sees new docs immediately
      try {
        const doc = new Document({ text: textContent, metadata: { filename: originalName, uploadedAt: new Date().toISOString() } });
        await ragService.vectorIndex.insert(doc);
      } catch (e) {
        // If LlamaIndex insert fails, upsert directly into Pinecone
        try {
          const embedding = await ragService.embeddings.embedQuery(textContent);
          const index = ragService.pinecone.index(ragService.indexName);
          await index.upsert([
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${originalName}`,
              values: embedding,
              metadata: { filename: originalName, type: 'upload', length: textContent.length },
            },
          ]);
        } catch (e2) {
          console.error('Failed to upsert directly to Pinecone:', e2);
          throw e;
        }
      }

      ingested.push({ name: originalName, bytes: file.size });
    }

    if (ingested.length === 0) {
      return res.status(400).json({ error: 'No supported files ingested' });
    }

    res.json({ status: 'ok', ingested });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

const PORT = process.env.PORT || 3001;

// Initialize service and start server
ragService.initializeServices().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 RAG Server running on http://localhost:${PORT}`);
    console.log(`📚 Using: LangChain + LlamaIndex + Gemini (Free Tier)`);
    console.log(`🗄️  Vector DB: Pinecone (${ragService.indexName})`);
  });
}).catch(error => {
  console.error('Failed to initialize RAG service:', error);
  process.exit(1);
});

export default RAGService;