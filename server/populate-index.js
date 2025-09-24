// server/populate-index.js
import { config } from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

config();

const sampleData = [
  {
    text: "Gemini 2.5 Flash is Google's fastest and most efficient multimodal AI model, offering excellent performance for its size.",
    metadata: { type: "ai_model", category: "gemini", source: "google" }
  },
  {
    text: "LangChain is a framework for developing applications powered by language models, providing tools for chains, agents, and memory.",
    metadata: { type: "framework", category: "llm_tools", source: "langchain" }
  },
  {
    text: "LlamaIndex is a data framework for LLM applications to ingest, structure, and access private or domain-specific data.",
    metadata: { type: "framework", category: "data_ingestion", source: "llamaindex" }
  },
  {
    text: "Pinecone is a vector database that makes it easy to build high-performance vector search applications.",
    metadata: { type: "database", category: "vector_search", source: "pinecone" }
  },
  {
    text: "React is a JavaScript library for building user interfaces, maintained by Facebook and a community of developers.",
    metadata: { type: "library", category: "frontend", source: "react" }
  },
  {
    text: "Vite is a build tool that provides a fast development environment for modern web projects.",
    metadata: { type: "tool", category: "build_tool", source: "vite" }
  },
  {
    text: "RAG (Retrieval Augmented Generation) enhances LLM responses by retrieving relevant information from external knowledge sources.",
    metadata: { type: "technique", category: "llm_enhancement", source: "research" }
  },
  {
    text: "Google's Gemini models support multimodal inputs including text, images, audio, and video.",
    metadata: { type: "ai_model", category: "multimodal", source: "google" }
  }
];

const populateIndex = async () => {
  try {
    const pinecone = new Pinecone({ 
      apiKey: process.env.PINECONE_API_KEY 
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME;
    const index = pinecone.index(indexName);
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    
    console.log('📝 Populating Pinecone index with sample data...');
    
    const vectors = await Promise.all(
      sampleData.map(async (doc, idx) => {
        const embedding = await model.embedContent(doc.text);
        
        return {
          id: `doc-${idx + 1}-${Date.now()}`,
          values: embedding.embedding.values,
          metadata: {
            ...doc.metadata,
            original_text: doc.text,
            timestamp: new Date().toISOString()
          }
        };
      })
    );
    
    await index.upsert(vectors);
    
    console.log(`✅ Successfully populated ${vectors.length} documents`);
    console.log('🔍 You can now query the index using the RAG server');
    
  } catch (error) {
    console.error('❌ Error populating index:', error);
  }
};

populateIndex();