// src/services/agentService.js
export const streamAgent = async ({ input, chat_history = [] }) => {
  try {
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input,
        history: chat_history
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.response;
    
  } catch (error) {
    console.error("Agent service error:", error);
    throw new Error("Failed to get response from the agent");
  }
};