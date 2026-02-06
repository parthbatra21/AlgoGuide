// src/SDEInterview.jsx
import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';

const SDEInterview = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [timer, setTimer] = useState(0);
  const [callStatus, setCallStatus] = useState('Ready to start');
  
  const vapiRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);

  // Initialize Vapi with your PUBLIC key
  useEffect(() => {
    const vapi = new Vapi("58d8dc38-ddce-4443-b39e-877502a09cb1"); // Replace with your actual public key
    vapiRef.current = vapi;

    // Listen for call start
    vapi.on('call-start', () => {
      setIsCallActive(true);
      setCallStatus('Interview in progress...');
      console.log('Call started');
    });

    // Listen for call end
    vapi.on('call-end', () => {
      setIsCallActive(false);
      setCallStatus('Interview ended');
      console.log('Call ended');
    });

    // Listen for speech updates (what the AI and you are saying)
    vapi.on('speech-start', () => {
      console.log('Speech started');
    });

    vapi.on('speech-end', () => {
      console.log('Speech ended');
    });

    // Listen for messages/transcripts
    vapi.on('message', (message) => {
      console.log('Message received:', message);
      
      if (message.type === 'transcript' && message.transcript) {
        const newEntry = {
          role: message.role,
          text: message.transcript,
          timestamp: new Date()
        };
        setTranscript(prev => [...prev, newEntry]);
      }
    });

    // Listen for errors
    vapi.on('error', (error) => {
      console.error('Vapi error:', error);
      setCallStatus('Error: ' + error.message);
    });

    return () => {
      vapi.stop();
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCallActive]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startInterview = async () => {
    try {
      setCallStatus('Connecting...');
      
      // Assistant configuration for SDE interview
      const assistantConfig = {
        name: "SDE Interview Assistant",
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en"
        },
        voice: {
          provider: "11labs",
          voiceId: "21m00Tcm4TlvDq8ikWAM"
        },
        model: {
          provider: "openai",
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an experienced technical interviewer conducting a Software Development Engineer interview. 

Your interview structure:
1. Start with a warm greeting and ask the candidate to introduce themselves briefly
2. Ask ONE coding problem at a time from this list:
   - Problem 1: "Given an array of integers, find two numbers that add up to a target sum. Return their indices."
   - Problem 2: "Reverse a linked list. Explain your approach and code it step by step."
   - Problem 3: "Check if a string has balanced parentheses. Handle (, ), [, ], {, }."

3. For each problem:
   - Present the problem clearly
   - Let them think and ask clarifying questions
   - Guide them through their solution
   - Ask about time and space complexity
   - Discuss edge cases
   - Provide hints if they're stuck

4. Keep responses SHORT and conversational (2-3 sentences max)
5. Be encouraging and supportive
6. After 2 problems, wrap up and ask if they have questions

Interview Rules:
- Speak naturally, like a real person
- Don't be too formal or robotic
- Give them time to think (ask "take your time" if they pause)
- Celebrate when they get something right
- Be patient with mistakes

Start by greeting them warmly and asking them to introduce themselves!`
            }
          ],
          temperature: 0.7
        },
        firstMessage: "Hi there! Thanks for joining me today for this technical interview. I'm excited to work through some problems with you. To start, could you briefly tell me about your background and experience with coding?",
        recordingEnabled: false,
        endCallFunctionEnabled: false
      };

      await vapiRef.current.start(assistantConfig);
    } catch (error) {
      console.error('Failed to start interview:', error);
      setCallStatus('Failed to start: ' + error.message);
    }
  };

  const endInterview = () => {
    vapiRef.current?.stop();
    setTimer(0);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '25px',
          marginBottom: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '32px' }}>
                🎯 SDE Mock Interview
              </h1>
              <p style={{ margin: 0, color: '#666' }}>Real-time AI Technical Interview</p>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{
                background: '#f0f0f0',
                padding: '10px 20px',
                borderRadius: '10px',
                fontSize: '24px',
                fontWeight: 'bold',
                fontFamily: 'monospace'
              }}>
                ⏱️ {formatTime(timer)}
              </div>
              <div style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: isCallActive ? '#4ade80' : '#94a3b8',
                color: 'white',
                fontWeight: 'bold'
              }}>
                {callStatus}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          
          {/* Main Interview Area */}
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '25px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>💬 Live Transcript</h2>
            
            <div style={{
              background: '#f8f9fa',
              borderRadius: '10px',
              padding: '20px',
              height: '450px',
              overflowY: 'auto',
              marginBottom: '20px'
            }}>
              {transcript.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#999',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '48px' }}>🎤</div>
                  <p>Click "Start Interview" to begin</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {transcript.map((entry, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: entry.role === 'assistant' ? 'flex-start' : 'flex-end'
                    }}>
                      <div style={{
                        maxWidth: '80%',
                        padding: '12px 18px',
                        borderRadius: '15px',
                        background: entry.role === 'assistant' ? '#667eea' : '#4ade80',
                        color: 'white'
                      }}>
                        <div style={{ 
                          fontSize: '11px', 
                          opacity: 0.9,
                          marginBottom: '5px',
                          fontWeight: 'bold'
                        }}>
                          {entry.role === 'assistant' ? '👨‍💼 Interviewer' : '👤 You'}
                        </div>
                        <div>{entry.text}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              {!isCallActive ? (
                <button
                  onClick={startInterview}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '15px 40px',
                    borderRadius: '30px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  📞 Start Interview
                </button>
              ) : (
                <button
                  onClick={endInterview}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '15px 40px',
                    borderRadius: '30px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  ❌ End Interview
                </button>
              )}
            </div>
          </div>

          {/* Side Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Problems List */}
            <div style={{
              background: 'white',
              borderRadius: '15px',
              padding: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>📝 Interview Problems</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Two Sum Problem',
                  'Reverse Linked List',
                  'Balanced Parentheses'
                ].map((problem, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    borderLeft: '4px solid #667eea'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#333' }}>
                      Problem {idx + 1}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                      {problem}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div style={{
              background: 'white',
              borderRadius: '15px',
              padding: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>💡 Interview Tips</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#666', lineHeight: '1.8' }}>
                <li>Think out loud while solving</li>
                <li>Ask clarifying questions</li>
                <li>Discuss time & space complexity</li>
                <li>Consider edge cases</li>
                <li>Don't rush - take your time</li>
              </ul>
            </div>

            {/* Audio Status */}
            <div style={{
              background: isCallActive ? '#dcfce7' : '#f8f9fa',
              borderRadius: '15px',
              padding: '20px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              border: isCallActive ? '2px solid #4ade80' : '2px solid #e5e7eb'
            }}>
              <h3 style={{ marginTop: 0, color: '#333' }}>🎙️ Audio Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center' 
                }}>
                  <span>Microphone</span>
                  <span style={{ 
                    fontSize: '20px',
                    color: isCallActive ? '#10b981' : '#94a3b8'
                  }}>
                    {isCallActive ? '🟢' : '⚪'}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center' 
                }}>
                  <span>Speaker</span>
                  <span style={{ 
                    fontSize: '20px',
                    color: isCallActive ? '#10b981' : '#94a3b8'
                  }}>
                    {isCallActive ? '🟢' : '⚪'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SDEInterview;