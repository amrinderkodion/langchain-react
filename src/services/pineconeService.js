// src/services/pineconeService.js
export const checkHealth = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/health');
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const queryPinecone = async (query) => {
  try {
    const response = await fetch('http://localhost:3001/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, method: 'hybrid' }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Pinecone query error:", error);
    throw error;
  }
};