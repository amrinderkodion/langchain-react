// pinecone-query.js - With server-side embeddings
import express from "express";
import { config } from "dotenv";
import { Pinecone } from "@pinecone-database/pinecone";
import cors from "cors";

config();

const app = express();
app.use(express.json());
app.use(cors());

const pineconeApiKey = process.env.PINECONE_API_KEY;
const pineconeIndexName = process.env.PINECONE_INDEX_NAME;

if (!pineconeApiKey || !pineconeIndexName) {
  throw new Error("Missing required Pinecone environment variables");
}

const pinecone = new Pinecone({
  apiKey: pineconeApiKey,
});

app.post("/api/pinecone-query", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const index = pinecone.index(pineconeIndexName);

    // For server-side embeddings, use the 'text' parameter
    const queryResponse = await index.query({
      topK: 5,
      includeMetadata: true,
      text: query, // This tells Pinecone to generate embeddings server-side
    });

    res.json(queryResponse);
  } catch (error) {
    console.error("Pinecone query error:", error);
    res.status(500).json({ error: "An error occurred while querying Pinecone." });
  }
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});