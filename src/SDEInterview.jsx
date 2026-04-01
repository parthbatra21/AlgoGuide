// src/SDEInterview.jsx
import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';

const SDEInterview = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [timer, setTimer] = useState(0);
  const [callStatus, setCallStatus] = useState('Ready to start');
  const defaultCodeTemplates = {
    javascript: `// Example: Two Sum Problem
function twoSum(nums, target) {
    // Your code here
    return [];
}

// Test your solution
console.log(twoSum([2, 7, 11, 15], 9)); // Expected: [0, 1]
console.log(twoSum([3, 2, 4], 6)); // Expected: [1, 2]
`,
    python: `# Example: Two Sum Problem
def two_sum(nums, target):
    # Your code here
    return []

# Test your solution
print(two_sum([2, 7, 11, 15], 9))  # Expected: [0, 1]
print(two_sum([3, 2, 4], 6))  # Expected: [1, 2]
`,
    java: `// Example: Two Sum Problem
public class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[]{};
    }
}`,
    cpp: `// Example: Two Sum Problem
#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Your code here
    return {};
}`
  };

  const [code, setCode] = useState(defaultCodeTemplates.javascript);
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState([]);
  
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

  const runCode = () => {
    setOutput('');
    setTestResults([]);
    
    try {
      if (language === 'javascript') {
        // Capture console.log output
        let capturedOutput = '';
        const originalLog = console.log;
        console.log = (...args) => {
          capturedOutput += args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ') + '\n';
          originalLog.apply(console, args);
        };

        try {
          // Execute the code in a controlled environment
          const func = new Function(code);
          func();
          setOutput(capturedOutput || 'Code executed successfully (no output)');
        } catch (error) {
          setOutput(`Error: ${error.message}`);
        } finally {
          console.log = originalLog;
        }
      } else {
        // For other languages, show a message
        setOutput(`Code execution for ${language} requires a backend compiler. For now, JavaScript code can be executed in the browser.`);
      }

      // Run basic test cases
      evaluateTestCases();
    } catch (error) {
      setOutput(`Execution Error: ${error.message}`);
    }
  };

  const evaluateTestCases = () => {
    // Simple test case evaluation (this would be more sophisticated in production)
    const tests = [
      { name: 'Test Case 1', passed: false, expected: '', actual: '' },
      { name: 'Test Case 2', passed: false, expected: '', actual: '' },
      { name: 'Test Case 3', passed: false, expected: '', actual: '' }
    ];

    // For demo, mark all as pending
    setTestResults(tests.map(test => ({ ...test, status: 'pending', message: 'Run code to evaluate' })));
  };

  const handleLanguageChange = (newLang) => {
    const currentTemplate = defaultCodeTemplates[language];
    setLanguage(newLang);
    if (!code.trim() || code === currentTemplate) {
      setCode(defaultCodeTemplates[newLang] || '');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      padding: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#f4f4f5'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: '#09090b',
          border: '1px solid #27272a',
          borderRadius: '15px',
          padding: '25px',
          marginBottom: '20px',
          boxShadow: 'none'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: '0 0 6px 0', color: '#f4f4f5', fontSize: '32px' }}>
                SDE Mock Interview
              </h1>
              <p style={{ margin: 0, color: '#a1a1aa' }}>Real-time AI Technical Interview</p>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{
                background: '#18181b',
                border: '1px solid #27272a',
                padding: '10px 20px',
                borderRadius: '10px',
                fontSize: '24px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                color: '#f4f4f5'
              }}>
                ⏱️ {formatTime(timer)}
              </div>
              <div style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: '#18181b',
                border: '1px solid #27272a',
                color: '#f4f4f5',
                fontWeight: 'bold'
              }}>
                {callStatus}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Main Interview Area */}
          <div style={{
            background: '#09090b',
            border: '1px solid #27272a',
            borderRadius: '15px',
            padding: '25px',
            boxShadow: 'none'
          }}>
            <h2 style={{ marginTop: 0, color: '#f4f4f5' }}>Live Transcript</h2>
            
            <div style={{
              background: '#000',
              border: '1px solid #27272a',
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
                  color: '#a1a1aa',
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
                        background: '#18181b',
                        border: '1px solid #27272a',
                        color: '#f4f4f5'
                      }}>
                        <div style={{ 
                          fontSize: '11px', 
                          opacity: 0.9,
                          marginBottom: '5px',
                          fontWeight: 'bold'
                        }}>
                          {entry.role === 'assistant' ? 'Interviewer' : 'You'}
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
                    background: '#18181b',
                    color: '#f4f4f5',
                    border: '1px solid #27272a',
                    padding: '15px 40px',
                    borderRadius: '30px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  Start Interview
                </button>
              ) : (
                <button
                  onClick={endInterview}
                  style={{
                    background: '#18181b',
                    color: '#f4f4f5',
                    border: '1px solid #27272a',
                    padding: '15px 40px',
                    borderRadius: '30px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  End Interview
                </button>
              )}
            </div>
          </div>

          {/* Side Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Problems List */}
            <div style={{
              background: '#09090b',
              border: '1px solid #27272a',
              borderRadius: '15px',
              padding: '20px',
              boxShadow: 'none'
            }}>
              <h3 style={{ marginTop: 0, color: '#f4f4f5' }}>Interview Problems</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Two Sum Problem',
                  'Reverse Linked List',
                  'Balanced Parentheses'
                ].map((problem, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    background: '#000',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    borderLeft: '4px solid #3f3f46'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#f4f4f5' }}>
                      Problem {idx + 1}
                    </div>
                    <div style={{ fontSize: '14px', color: '#a1a1aa', marginTop: '5px' }}>
                      {problem}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div style={{
              background: '#09090b',
              border: '1px solid #27272a',
              borderRadius: '15px',
              padding: '20px',
              boxShadow: 'none'
            }}>
              <h3 style={{ marginTop: 0, color: '#f4f4f5' }}>Interview Tips</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#a1a1aa', lineHeight: '1.8' }}>
                <li>Think out loud while solving</li>
                <li>Ask clarifying questions</li>
                <li>Discuss time & space complexity</li>
                <li>Consider edge cases</li>
                <li>Don't rush - take your time</li>
              </ul>
            </div>

            {/* Audio Status */}
            <div style={{
              background: '#09090b',
              border: '1px solid #27272a',
              borderRadius: '15px',
              padding: '20px',
              boxShadow: 'none'
            }}>
              <h3 style={{ marginTop: 0, color: '#f4f4f5' }}>Audio Status</h3>
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

        {/* Code Editor Section */}
        <div style={{
          background: '#09090b',
          border: '1px solid #27272a',
          borderRadius: '15px',
          padding: '25px',
          boxShadow: 'none',
          marginTop: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: 0, color: '#f4f4f5' }}>Code Editor</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #27272a',
                  fontSize: '14px',
                  background: '#000',
                  color: '#f4f4f5'
                }}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
              <button
                onClick={runCode}
                style={{
                  background: '#18181b',
                  color: '#f4f4f5',
                  border: '1px solid #27272a',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: 'none'
                }}
              >
                ▶ Run Code
              </button>
              <button
                onClick={() => setCode(defaultCodeTemplates[language] || '')}
                style={{
                  background: '#f3f4f6',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {/* Code Editor */}
            <div>
              <div style={{
                background: '#1e1e1e',
                borderRadius: '8px',
                padding: '15px',
                minHeight: '400px',
                position: 'relative'
              }}>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={`Enter your ${language} code here...`}
                  style={{
                    width: '100%',
                    height: '370px',
                    background: 'transparent',
                    color: '#d4d4d4',
                    border: 'none',
                    outline: 'none',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '14px',
                    lineHeight: '1.5',
                    resize: 'none'
                  }}
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Output and Test Results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Output */}
              <div>
                <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '16px' }}>Output</h3>
                <div style={{
                  background: '#1e1e1e',
                  borderRadius: '8px',
                  padding: '15px',
                  minHeight: '150px',
                  color: '#d4d4d4',
                  fontFamily: "'Courier New', monospace",
                  fontSize: '14px',
                  whiteSpace: 'pre-wrap',
                  overflowY: 'auto',
                  maxHeight: '150px'
                }}>
                  {output || 'Output will appear here...'}
                </div>
              </div>

              {/* Test Results */}
              <div>
                <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '16px' }}>Test Cases</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {testResults.length > 0 ? (
                    testResults.map((test, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          background: test.status === 'passed' ? '#dcfce7' : 
                                     test.status === 'failed' ? '#fee2e2' : '#f3f4f6',
                          border: `2px solid ${test.status === 'passed' ? '#4ade80' : 
                                            test.status === 'failed' ? '#ef4444' : '#e5e7eb'}`,
                          fontSize: '13px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', color: '#333' }}>{test.name}</span>
                          <span style={{
                            fontSize: '18px',
                            color: test.status === 'passed' ? '#10b981' : 
                                   test.status === 'failed' ? '#ef4444' : '#94a3b8'
                          }}>
                            {test.status === 'passed' ? '✓' : test.status === 'failed' ? '✗' : '○'}
                          </span>
                        </div>
                        {test.message && (
                          <div style={{ marginTop: '5px', color: '#666', fontSize: '12px' }}>
                            {test.message}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: '#f3f4f6',
                      color: '#666',
                      fontSize: '13px',
                      textAlign: 'center'
                    }}>
                      Run code to see test results
                    </div>
                  )}
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


