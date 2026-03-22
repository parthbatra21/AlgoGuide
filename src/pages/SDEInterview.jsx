// src/SDEInterview.jsx
import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import Editor from '@monaco-editor/react';

const SDEInterview = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [timer, setTimer] = useState(0);
  const [callStatus, setCallStatus] = useState('Ready to start');
  
  // Code Editor States
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [code, setCode] = useState('// Write your solution here\n\n');
  const [language, setLanguage] = useState('javascript');
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const vapiRef = useRef(null);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);

  // Initialize Vapi
  useEffect(() => {
    const vapi = new Vapi("58d8dc38-ddce-4443-b39e-877502a09cb1");
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      setIsCallActive(true);
      setCallStatus('Interview in progress...');
      console.log('Call started');
    });

    vapi.on('call-end', () => {
      setIsCallActive(false);
      setCallStatus('Interview ended');
      console.log('Call ended');
    });

    vapi.on('message', (message) => {
      console.log('Message received:', message);
      
      // Handle transcript
      if (message.type === 'transcript' && message.transcript) {
        const newEntry = {
          role: message.role,
          text: message.transcript,
          timestamp: new Date()
        };
        setTranscript(prev => [...prev, newEntry]);
      }

      // Handle function calls for displaying coding questions
      if (message.type === 'function-call') {
        handleFunctionCall(message);
      }
    });

    vapi.on('error', (error) => {
      console.error('Vapi error:', error);
      setCallStatus('Error: ' + error.message);
    });

    return () => {
      vapi.stop();
    };
  }, []);

  // Handle function calls from VAPI
  const handleFunctionCall = (message) => {
    console.log('Function call received:', message);
    
    if (message.functionCall?.name === 'displayCodingQuestion') {
      const params = message.functionCall.parameters;
      
      setCurrentQuestion({
        question: params.question,
        testCases: params.testCases || [],
        difficulty: params.difficulty || 'medium',
        hints: params.hints || []
      });

      // Set initial code template based on language
      const template = getCodeTemplate(params.language || 'javascript');
      setCode(template);
      setLanguage(params.language || 'javascript');
      setTestResults([]);

      // Send confirmation back to VAPI
      vapiRef.current?.send({
        type: 'add-message',
        message: {
          role: 'system',
          content: 'Question displayed in IDE successfully'
        }
      });
    }
  };

  // Get code template based on language
  const getCodeTemplate = (lang) => {
    const templates = {
      javascript: '// Write your solution here\n\nfunction solution(input) {\n  // Your code here\n  \n}\n',
      python: '# Write your solution here\n\ndef solution(input):\n    # Your code here\n    pass\n',
      java: '// Write your solution here\n\npublic class Solution {\n    public static Object solution(Object input) {\n        // Your code here\n        return null;\n    }\n}\n'
    };
    return templates[lang] || templates.javascript;
  };

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

  // Run test cases
  const runTests = () => {
    if (!currentQuestion || !currentQuestion.testCases) {
      alert('No test cases available for this question');
      return;
    }

    setIsRunning(true);
    const results = [];

    try {
      // For JavaScript execution (client-side)
      if (language === 'javascript') {
        currentQuestion.testCases.forEach((testCase, index) => {
          try {
            // Create function from code
            const funcBody = code.replace(/function\s+\w+\s*\([^)]*\)\s*{/, '').replace(/}$/, '');
            const func = new Function('input', funcBody + '\nreturn solution(input);');
            
            const output = func(testCase.input);
            const passed = JSON.stringify(output) === JSON.stringify(testCase.expected);
            
            results.push({
              testCase: index + 1,
              input: testCase.input,
              expected: testCase.expected,
              actual: output,
              passed: passed
            });
          } catch (error) {
            results.push({
              testCase: index + 1,
              input: testCase.input,
              expected: testCase.expected,
              actual: 'Error',
              error: error.message,
              passed: false
            });
          }
        });
      }

      setTestResults(results);

      // Send results back to VAPI
      const passedCount = results.filter(r => r.passed).length;
      const totalCount = results.length;
      
      vapiRef.current?.send({
        type: 'add-message',
        message: {
          role: 'user',
          content: `I've run the code. ${passedCount} out of ${totalCount} test cases passed.`
        }
      });

    } catch (error) {
      console.error('Test execution error:', error);
      alert('Error running tests: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const startInterview = async () => {
    try {
      setCallStatus('Connecting...');
      
      // DYNAMIC Assistant Configuration
      const assistantConfig = {
        name: "Dynamic SDE Interview Assistant",
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
          functions: [
            {
              name: "displayCodingQuestion",
              description: "Display a coding question in the IDE with test cases",
              parameters: {
                type: "object",
                properties: {
                  question: {
                    type: "string",
                    description: "The coding problem statement with clear requirements"
                  },
                  testCases: {
                    type: "array",
                    description: "Array of test cases with input and expected output",
                    items: {
                      type: "object",
                      properties: {
                        input: { type: "string" },
                        expected: { type: "string" },
                        description: { type: "string" }
                      }
                    }
                  },
                  difficulty: {
                    type: "string",
                    enum: ["easy", "medium", "hard"],
                    description: "Difficulty level of the problem"
                  },
                  language: {
                    type: "string",
                    enum: ["javascript", "python", "java"],
                    description: "Programming language for the solution"
                  },
                  hints: {
                    type: "array",
                    description: "Optional hints to help the candidate",
                    items: { type: "string" }
                  }
                },
                required: ["question", "testCases"]
              }
            }
          ],
          messages: [
            {
              role: "system",
              content: `You are an experienced technical interviewer conducting a dynamic Software Development Engineer interview. 

CORE PRINCIPLES:
- Generate UNIQUE questions every interview - never repeat problems
- Mix technical coding questions with behavioral questions
- Adapt difficulty based on candidate's performance
- Be conversational, encouraging, and natural
- Keep responses SHORT (2-3 sentences max unless explaining a problem)

INTERVIEW STRUCTURE (45-60 minutes):

1. INTRODUCTION (5 min):
   - Warm greeting and build rapport
   - Ask: "Tell me about yourself and your coding experience"
   - Ask: "What technologies are you most comfortable with?"
   - Gauge their background to adjust difficulty

2. BEHAVIORAL QUESTIONS (10 min) - Ask 2-3 of these dynamically:
   - "Tell me about a challenging bug you debugged recently"
   - "Describe a time you had to learn a new technology quickly"
   - "How do you handle code reviews and feedback?"
   - "Tell me about a project you're proud of"
   - "How do you approach working in a team?"
   - Generate your own unique behavioral questions too!

3. TECHNICAL CODING (30 min) - Generate 2-3 UNIQUE problems:
   
   PROBLEM GENERATION RULES:
   - Create ORIGINAL problems, not common LeetCode questions
   - Vary problem types each interview:
     * Arrays/Strings (manipulation, searching, patterns)
     * Hash Maps/Sets (frequency, grouping, lookup)
     * Two Pointers (sorting, partitioning)
     * Recursion (tree problems, backtracking)
     * Dynamic Programming (optimization, counting)
     * Object-Oriented Design (class design, inheritance)
   
   - Start EASY, then increase difficulty based on performance
   - If they struggle: provide hints, ask leading questions, give an easier variant
   - If they excel: ask follow-ups about optimization, edge cases, complexity
   
   WHEN ASKING A CODING QUESTION:
   1. First explain the problem conversationally
   2. Then call displayCodingQuestion() function with:
      - Clear problem statement
      - 3-5 test cases (mix simple and edge cases)
      - Appropriate difficulty level
      - Language preference (default: javascript)
   3. Wait for them to code and run tests
   4. Discuss their solution: time/space complexity, edge cases, optimizations

4. WRAP-UP (5 min):
   - Ask if they have questions
   - Provide encouraging feedback
   - Thank them for their time

DYNAMIC BEHAVIOR:
- Never ask the same coding problem twice across different interviews
- Adjust your tone based on their confidence level
- If they mention specific tech (React, Python, etc), ask related questions
- Generate creative, real-world-inspired problems
- Make each interview feel unique and personalized

EXAMPLE PROBLEM GENERATION (create variations like these):
- "Write a function to find the most frequently occurring word in a document"
- "Design a parking lot system with different vehicle types"
- "Implement a basic URL shortener"
- "Find all pairs of numbers that sum to a target in an array"
- "Validate if a given string is a valid JSON object"
- "Implement a simple cache with expiration"

Remember: You're having a conversation, not reading a script. Be natural, adaptive, and encouraging!`
            }
          ],
          temperature: 0.8 // Higher temperature for more creative/varied questions
        },
        firstMessage: "Hey there! Thanks for joining me today. I'm really excited to get to know you and work through some problems together. Let's start casual - could you tell me a bit about yourself and what kind of coding you enjoy most?",
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
      background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #db2777 100%)',
      padding: '20px',
      fontFamily: '"Segoe UI", system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '25px 35px',
          marginBottom: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: '0 0 5px 0', color: '#1e293b', fontSize: '36px', fontWeight: '700' }}>
                🎯 AI Mock Interview Studio
              </h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
                Dynamic Technical Interview with Live Coding
              </p>
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '28px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                color: 'white',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
              }}>
                ⏱️ {formatTime(timer)}
              </div>
              <div style={{
                padding: '12px 24px',
                borderRadius: '12px',
                background: isCallActive 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                  : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                color: 'white',
                fontWeight: '600',
                fontSize: '15px',
                boxShadow: isCallActive 
                  ? '0 4px 15px rgba(16, 185, 129, 0.4)' 
                  : '0 4px 15px rgba(100, 116, 139, 0.4)'
              }}>
                {callStatus}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Left Side - Conversation */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 200px)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#1e293b', fontSize: '24px', fontWeight: '600' }}>
              💬 Interview Conversation
            </h2>
            
            <div style={{
              background: '#f8fafc',
              borderRadius: '15px',
              padding: '25px',
              flex: 1,
              overflowY: 'auto',
              marginBottom: '20px',
              border: '2px solid #e2e8f0'
            }}>
              {transcript.length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#94a3b8',
                  flexDirection: 'column',
                  gap: '15px'
                }}>
                  <div style={{ fontSize: '64px' }}>🎤</div>
                  <p style={{ fontSize: '18px', fontWeight: '500' }}>
                    Click "Start Interview" to begin
                  </p>
                  <p style={{ fontSize: '14px', color: '#cbd5e1' }}>
                    Your AI interviewer will ask you unique questions
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {transcript.map((entry, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: entry.role === 'assistant' ? 'flex-start' : 'flex-end'
                    }}>
                      <div style={{
                        maxWidth: '85%',
                        padding: '14px 20px',
                        borderRadius: '18px',
                        background: entry.role === 'assistant' 
                          ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
                          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}>
                        <div style={{ 
                          fontSize: '11px', 
                          opacity: 0.9,
                          marginBottom: '6px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {entry.role === 'assistant' ? '🤖 AI Interviewer' : '👤 You'}
                        </div>
                        <div style={{ fontSize: '15px', lineHeight: '1.5' }}>
                          {entry.text}
                        </div>
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
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '16px 48px',
                    borderRadius: '50px',
                    fontSize: '18px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.5)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)';
                  }}
                >
                  📞 Start Interview
                </button>
              ) : (
                <button
                  onClick={endInterview}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '16px 48px',
                    borderRadius: '50px',
                    fontSize: '18px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 8px 25px rgba(239, 68, 68, 0.4)',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 12px 35px rgba(239, 68, 68, 0.5)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.4)';
                  }}
                >
                  ❌ End Interview
                </button>
              )}
            </div>
          </div>

          {/* Right Side - Code Editor */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            height: 'calc(100vh - 200px)'
          }}>
            
            {/* Question Display */}
            {currentQuestion && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '20px',
                padding: '25px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                borderLeft: `6px solid ${
                  currentQuestion.difficulty === 'easy' ? '#10b981' :
                  currentQuestion.difficulty === 'medium' ? '#f59e0b' :
                  '#ef4444'
                }`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>
                    📝 Coding Challenge
                  </h3>
                  <span style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: currentQuestion.difficulty === 'easy' ? '#d1fae5' :
                                currentQuestion.difficulty === 'medium' ? '#fed7aa' : '#fee2e2',
                    color: currentQuestion.difficulty === 'easy' ? '#065f46' :
                           currentQuestion.difficulty === 'medium' ? '#9a3412' : '#991b1b'
                  }}>
                    {currentQuestion.difficulty}
                  </span>
                </div>
                <p style={{ 
                  color: '#334155', 
                  lineHeight: '1.7',
                  fontSize: '15px',
                  margin: 0
                }}>
                  {currentQuestion.question}
                </p>
              </div>
            )}

            {/* Code Editor */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '25px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>
                  💻 Code Editor
                </h3>
                <button
                  onClick={runTests}
                  disabled={!currentQuestion || isRunning}
                  style={{
                    background: currentQuestion && !isRunning 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '25px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: currentQuestion && !isRunning ? 'pointer' : 'not-allowed',
                    boxShadow: currentQuestion && !isRunning 
                      ? '0 4px 15px rgba(59, 130, 246, 0.4)'
                      : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isRunning ? '⏳ Running...' : '▶️ Run Tests'}
                </button>
              </div>

              <div style={{ 
                flex: 1, 
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2
                  }}
                />
              </div>
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '20px',
                padding: '25px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                maxHeight: '250px',
                overflowY: 'auto'
              }}>
                <h3 style={{ 
                  marginTop: 0, 
                  marginBottom: '15px',
                  color: '#1e293b',
                  fontSize: '20px',
                  fontWeight: '600'
                }}>
                  ✅ Test Results
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {testResults.map((result, idx) => (
                    <div key={idx} style={{
                      padding: '14px',
                      background: result.passed ? '#d1fae5' : '#fee2e2',
                      borderRadius: '10px',
                      borderLeft: `4px solid ${result.passed ? '#10b981' : '#ef4444'}`
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <span style={{ 
                          fontWeight: '700',
                          color: result.passed ? '#065f46' : '#991b1b',
                          fontSize: '14px'
                        }}>
                          Test Case {result.testCase}
                        </span>
                        <span style={{ fontSize: '18px' }}>
                          {result.passed ? '✅' : '❌'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569', fontFamily: 'monospace' }}>
                        <div><strong>Input:</strong> {JSON.stringify(result.input)}</div>
                        <div><strong>Expected:</strong> {JSON.stringify(result.expected)}</div>
                        <div><strong>Got:</strong> {JSON.stringify(result.actual)}</div>
                        {result.error && (
                          <div style={{ color: '#991b1b', marginTop: '5px' }}>
                            <strong>Error:</strong> {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{
                  marginTop: '15px',
                  padding: '12px',
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  Score: {testResults.filter(r => r.passed).length} / {testResults.length} passed
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SDEInterview;