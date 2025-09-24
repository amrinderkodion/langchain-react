# LangChain React RAG Application

A powerful Retrieval-Augmented Generation (RAG) application built with React, LangChain, LlamaIndex, Pinecone, and Google AI. This application demonstrates how to create an intelligent question-answering system that can retrieve relevant information from a vector database and generate accurate responses using large language models.

## 🚀 Features

- **Advanced RAG Pipeline**: Combines LangChain and LlamaIndex for robust document retrieval and generation
- **Vector Database**: Uses Pinecone for efficient similarity search and document storage
- **Google AI Integration**: Leverages Gemini models for embeddings and chat completions
- **Multiple Query Methods**: Supports LlamaIndex, LangChain, and hybrid RAG approaches
- **Real-time Chat Interface**: Interactive React frontend for seamless user experience
- **RESTful API**: Express.js backend with comprehensive API endpoints

## 🏗️ Architecture

```
Frontend (React + Vite)
    ↕️ HTTP API
Backend (Express.js)
    ↕️ LangChain + LlamaIndex
Google AI (Gemini Models)
    ↕️ Vector Operations
Pinecone (Vector Database)
```

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework

### Backend
- **Express.js** - Web application framework
- **LangChain** - LLM application framework
- **LlamaIndex** - Data framework for LLM applications
- **Pinecone** - Vector database for similarity search
- **Google AI** - Gemini models for embeddings and chat

## 📋 Prerequisites

Before running this application, you'll need:

1. **Google AI API Key** - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Pinecone API Key** - Get from [Pinecone Console](https://app.pinecone.io/)
3. **Node.js** (v18 or higher)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd langchain-react
```

### 2. Install Dependencies
```bash
npm install
```
or If some problem occurs
```bash
npm cache clean --force
npm install --legacy-peer-deps
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
GOOGLE_API_KEY=your_google_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=your_index_name_here
PORT=3001
```

### 4. Populate the Vector Database
```bash
npm run populate
```

### 5. Start the Development Server
```bash
# Start the backend server
npm run server

# In another terminal, start the frontend
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

## 📡 API Endpoints

### Health Check
```http
GET /api/health
```
Returns server status and Pinecone index statistics.

### RAG Query
```http
POST /api/query
Content-Type: application/json

{
  "query": "Your question here",
  "method": "hybrid", // "llamaindex", "langchain", or "hybrid"
  "chat_history": []
}
```

### Chat Interface
```http
POST /api/chat
Content-Type: application/json

{
  "message": "Your message",
  "history": []
}
```

## 🔧 Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run server` - Start the Express backend server
- `npm run populate` - Populate Pinecone index with sample data
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📁 Project Structure

```
langchain-react/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── services/          # API service modules
│   └── tools/             # Custom tools and utilities
├── server/                # Backend Express application
│   ├── pinecone-rag-server.js  # Main RAG server
│   └── populate-index.js       # Data population script
├── public/                # Static assets
└── package.json          # Dependencies and scripts
```

## 🤖 RAG Methods

The application supports three different RAG approaches:

1. **LlamaIndex**: Pure LlamaIndex implementation with built-in query engine
2. **LangChain**: LangChain-based retrieval with custom prompt templates
3. **Hybrid**: Combines both approaches for optimal performance (recommended)

## 🔒 Security Notes

- Never commit your `.env` file to version control
- Keep your API keys secure and rotate them regularly
- The `.env` file is automatically ignored by Git

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [LangChain](https://langchain.com/) - LLM application framework
- [LlamaIndex](https://www.llamaindex.ai/) - Data framework for LLM applications
- [Pinecone](https://www.pinecone.io/) - Vector database service
- [Google AI](https://ai.google.dev/) - Gemini models and API
