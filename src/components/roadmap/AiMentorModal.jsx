import React, { useState, useRef, useEffect } from 'react';

export default function AiMentorModal({ open, onClose, userProfile, roadmapData }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      // Add welcome message
      setMessages([{
        role: 'assistant',
        text: "Hi! I'm your AI mentor. I can help you with questions about your learning roadmap, interview preparation, and technical concepts. What would you like to know?",
        timestamp: new Date()
      }]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!question.trim() || loading) return;

    const userMessage = {
      role: 'user',
      text: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const requestBody = {
        question: userMessage.text,
        userProfile: userProfile || {},
        roadmapContext: {
          targetCompanies: roadmapData?.user_profile?.target_companies || [],
          preferredRole: roadmapData?.user_profile?.preferred_role || '',
          weakAreas: roadmapData?.user_profile?.weak_areas || [],
          techStack: roadmapData?.user_profile?.tech_stack || []
        }
      };

      console.log('Sending mentor request:', requestBody);

      const response = await fetch(`/api/ask-mentor`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to get mentor response: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Mentor response:', data);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.answer || data.message || 'I received your question but had trouble generating a response.',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error asking mentor:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Sorry, I encountered an error: ${error.message}. Please make sure the backend endpoint /ask-mentor is configured and your Gemini API key is set.`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-gray-900 text-white rounded-xl border border-gray-700 shadow-xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold">🤖 AI Mentor</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div 
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user' 
                  ? 'bg-blue-600' 
                  : 'bg-gray-800 border border-gray-700'
              }`}>
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about your learning journey..."
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !question.trim()}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

