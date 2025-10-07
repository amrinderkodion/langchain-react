import React,{ useState, useEffect } from 'react';
import { streamAgent, uploadDocuments } from './services/agentService';

const sampleDocuments = [
  "Gemini 2.5 Flash is a fast and efficient language model.",
  "ChromaDB is a vector database for building AI applications.",
  "LangChain.js is a framework for building LLM applications.",
  "Vite and React provide a fast development environment for web apps."
];

function App() {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [dbStatus, setDbStatus] = useState('Checking...');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  useEffect(() => {
    // Simple health check: call your API once to confirm connection
    const checkDb = async () => {
        try {
          const res = await fetch('http://localhost:3001/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: "test" }), // dummy query
          });
          if (res.ok) {
            setDbStatus('Connected');
          } else {
            setDbStatus('Failed to connect');
          }
        } catch (e) {
          setDbStatus('Failed to connect');
        }
      };
      checkDb();
  }, []);

  // In your App.jsx useEffect
  useEffect(() => {
    const checkDb = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
        const response = await fetch(`${API_BASE}/api/health`);
        if (response.ok) {
          setDbStatus('Connected');
        } else {
          setDbStatus('Connection Failed');
        }
      } catch (e) {
        setDbStatus('Connection Failed');
      }
    };
    checkDb();
  }, []);

  const handleQuery = async (event) => {
    event.preventDefault();

    if (!query.trim() || loading) {
      return;
    }

    setLoading(true);

    const nextHistory = [
      ...chatHistory,
      ["human", query],
      ["ai", "", []]
    ];
    setChatHistory(nextHistory);

    setQuery("");

    try {
      // The streamAgent function now handles the entire RAG pipeline
      const { response: finalAnswer, sources } = await streamAgent({
        input: query,
        chat_history: nextHistory,
      });

      setChatHistory(prevHistory => {
        const historyCopy = [...prevHistory];
        const lastMessageIndex = historyCopy.length - 1;
        
        // Update the last message with the final answer and sources
        historyCopy[lastMessageIndex][1] = finalAnswer;
        historyCopy[lastMessageIndex][2] = sources;
        return historyCopy;
      });
    } catch (error) {
      console.error("Error during agent response:", error);
      setChatHistory(prevHistory => {
        const historyCopy = [...prevHistory];
        historyCopy[historyCopy.length - 1][1] = "Sorry, an error occurred while processing your request.";
        return historyCopy;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadMsg('');
    try {
      const result = await uploadDocuments(files);
      setUploadMsg(`Uploaded ${result.ingested?.length || 0} file(s) successfully.`);
    } catch (err) {
      setUploadMsg(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      <header className="py-4 px-6 bg-slate-800 text-center shadow-lg">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Agent
        </h1>
        <p className={`text-sm mt-1 font-bold ${dbStatus === 'Connected' ? 'text-green-400' : 'text-red-400'}`}>
          Vector DB Status: {dbStatus}
        </p>
      </header>

      <div className="flex-3 overflow-y-auto p-6 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">Start a conversation with the agent.</div>
        ) : (
          chatHistory.map((msg, index) => {
            const role = Array.isArray(msg) ? msg[0] : msg.role;
            const content = Array.isArray(msg) ? msg[1] : msg.content;
            const sources = Array.isArray(msg) ? msg[2] : [];
            return (
              <div key={index} className={`mb-4 p-3 rounded-lg ${role === 'human' ? 'bg-blue-600 text-right self-end' : 'bg-slate-700 self-start'}`}>
                <p className="font-semibold">{role === 'human' ? 'You' : 'Agent'}:</p>
                <p className="whitespace-pre-wrap">{content}</p>

                {role === 'ai' && sources.length > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    <p className="font-semibold">Sources:</p>
                    <ul className="list-disc list-inside">
                      {sources.map((source, srcIndex) => (
                        <li key={srcIndex}>
                          {source.content}
                          {/*source.similarity && ` (Similarity: ${source.similarity})`*/}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      <div className="p-4 bg-slate-800 flex items-center gap-4">
        <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded cursor-pointer">
          {uploading ? 'Uploading...' : 'Upload Documents'}
          <input type="file" className="hidden" multiple onChange={handleUpload} accept=".txt,.md,.markdown" disabled={uploading} />
        </label>
        {uploadMsg && <span className="text-sm text-gray-300">{uploadMsg}</span>}
      </div>

      <form className="flex-1 flex flex-col min-h-0 relative" onSubmit={handleQuery}>
        <textarea
          className=" px-4 py-2 text-white bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask a question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows="1"
        />
        <button
          type="submit"
          className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || dbStatus !== 'Connected'}
        >
          {loading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default App;