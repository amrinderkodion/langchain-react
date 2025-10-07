// src/services/agentService.js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

export const streamAgent = async ({ input, chat_history = [] }) => {
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
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
    // Return the full data object, not just the response
    return data;
    
  } catch (error) {
    console.error("Agent service error:", error);
    throw new Error("Failed to get response from the agent");
  }
};

export const uploadDocuments = async (files) => {
  const form = new FormData();
  Array.from(files).forEach((file) => form.append('files', file));
  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Upload failed');
  }
  return response.json();
};