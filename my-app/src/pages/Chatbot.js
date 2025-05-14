import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { FaArrowLeft, FaPaperPlane } from 'react-icons/fa';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import useAuth from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabaseClient';
import SidebarLayout from '../components/layout/SidebarLayout';

const MAX_MESSAGES = 100; // Limit the number of messages to prevent excessive memory usage

// Move all styled components to the top level
const MainContent = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

const LoadingBubble = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border-radius: 16px;
  background-color: ${colors.backgroundSecondary || '#f5f7fa'};
  margin-top: 16px;
`;

const LoadingDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${colors.textPrimary || '#1f2937'};
  margin: 0 4px;
  animation: ${keyframes`
    0% { opacity: 0.5; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  `} 1.4s infinite ease-in-out;
  animation-delay: ${props => props.$delay};
`;

const MessageList = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 80px;
`;

const InputForm = styled.form`
  display: flex;
  align-items: center;
  padding: 16px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
`;

const ChatInput = styled.input`
  flex: 1;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  color: ${colors.textPrimary || '#1f2937'};
`;

const SendButton = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background-color: ${colors.brandPrimary || '#4f46e5'};
  color: white;
  font-size: 1rem;
  font-weight: 600;
  margin-left: 16px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${colors.brandPrimaryHover || '#5b51d8'};
  }

  &:disabled {
    background-color: ${colors.textSecondary};
    cursor: not-allowed;
  }
`;

// Move MessageBubbleWrapper to top level
const MessageBubbleWrapper = ({ isUser, children, ...rest }) => {
  return (
    <div 
      style={{
        maxWidth: '75%',
        padding: '12px 16px',
        borderRadius: '16px',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        backgroundColor: isUser ? (colors.brandPrimary || '#4f46e5') : 'white',
        color: isUser ? 'white' : (colors.textPrimary || '#1f2937'),
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
        fontSize: '1rem',
        lineHeight: 1.5
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

const PageHeader = styled.div`
  background-color: #f8fafc;
  padding: 32px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 24px;
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
`;

const PageSubtitle = styled.div`
  font-size: 1rem;
  color: #64748b;
  font-weight: 400;
  margin-bottom: 0;
`;

const ChatContainer = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  overflow: hidden;
`;

const Chatbot = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Hello! How can I help you with your exam preparation today?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Generate a unique conversation ID or use existing one from localStorage
  const conversationId = useRef(
    localStorage.getItem('currentConversationId') || uuidv4()
  );

  // Save conversation ID to localStorage
  useEffect(() => {
    localStorage.setItem('currentConversationId', conversationId.current);
  }, []);

  // Load previous messages for this conversation
  useEffect(() => {
    const loadPreviousMessages = async () => {
      if (!user) return;
      
      try {
        setInitialLoading(true);
        
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .eq('conversation_id', conversationId.current)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Transform database messages to the format used in the component
          const formattedMessages = data.map(msg => ({
            type: msg.is_user ? 'user' : 'bot',
            text: msg.message
          }));
          
          // Replace the default welcome message with the actual conversation
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error loading previous messages:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadPreviousMessages();
  }, [user]);

  // Scroll to the bottom of the chat when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Update the WebSocket connection code
  useEffect(() => {
    // Check if we should attempt WebSocket connection
    const shouldConnectWebSocket = false; // Set to false to disable WebSocket connection attempts
    
    if (!shouldConnectWebSocket) {
      console.log('WebSocket connection disabled');
      return;
    }
    
    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3 seconds
    let reconnectTimeout = null;
    
    const connectWebSocket = () => {
      try {
        // Close existing connection if it exists
        if (ws) {
          ws.close();
        }
        
        // Create new connection
        ws = new WebSocket('ws://localhost:3000/ws');
        
        ws.onopen = () => {
          console.log('WebSocket connection established');
          reconnectAttempts = 0; // Reset reconnect attempts on successful connection
          
          // Send a ping every 30 seconds to keep the connection alive
          const pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            } else {
              clearInterval(pingInterval);
            }
          }, 30000);
          
          // Clear interval when connection closes
          ws.addEventListener('close', () => clearInterval(pingInterval));
        };
        
        ws.onmessage = (event) => {
          console.log('Message from server:', event.data);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        ws.onclose = (event) => {
          console.log('WebSocket connection closed', event.code, event.reason);
          
          // Attempt to reconnect if not a normal closure and we haven't exceeded max attempts
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
            reconnectTimeout = setTimeout(connectWebSocket, reconnectDelay);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
          reconnectTimeout = setTimeout(connectWebSocket, reconnectDelay);
        }
      }
    };
    
    // Initial connection
    connectWebSocket();
    
    // Clean up
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      if (ws) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, []);

  if (!user) {
    return <LoadingScreen />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputText.trim()) return;
    
    // Add user message
    const userMessage = { type: 'user', text: inputText };
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      return newMessages.length > MAX_MESSAGES ? newMessages.slice(-MAX_MESSAGES) : newMessages;
    });
    setInputText('');
    
    // Save user message to the database
    await saveMessageToDatabase(userMessage.text, true);

    // Set loading state
    setLoading(true);
    
    try {
      // Get the session and access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Failed to retrieve session or session is null');
      }

      const authToken = session.access_token; // Get the auth token

      // Call backend API with auth token
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}` // Include the auth token
        },
        body: JSON.stringify({ prompt: inputText }),
      });

      // Check if the response is not OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse the JSON response
      const data = await response.json();

      // Extract the message from the response
      const botResponse = { 
        type: 'bot', 
        text: data.message
      };

      // Add bot response to messages
      setMessages(prev => {
        const newMessages = [...prev, botResponse];
        return newMessages.length > MAX_MESSAGES ? newMessages.slice(-MAX_MESSAGES) : newMessages;
      });

      // Save bot response to the database
      await saveMessageToDatabase(botResponse.text, false);
    } catch (error) {
      console.error('Error fetching response from backend:', error);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Sorry, I am unable to process your request at the moment. Please check your connection or try again later.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const saveMessageToDatabase = async (message, isUser) => {
    try {
      // Get the session and access token
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        throw new Error('Failed to retrieve session or session is null');
      }

      const authToken = session.access_token; // Get the auth token

      await fetch('http://localhost:5000/api/chat-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}` // Include the auth token
        },
        body: JSON.stringify({ conversationId: conversationId.current, message, isUser }),
      });
    } catch (error) {
      console.error('Error saving message to database:', error);
    }
  };

  return (
    <SidebarLayout>
      <MainContent>
        <PageHeader>
          <HeaderContent>
            <PageTitle>AI Study Assistant</PageTitle>
            <PageSubtitle>Ask questions, get instant help with your studies.</PageSubtitle>
          </HeaderContent>
        </PageHeader>
        <Container>
          <ChatContainer>
            {initialLoading ? (
              <LoadingContainer>
                <LoadingBubble>
                  <LoadingDot $delay="0s" />
                  <LoadingDot $delay="0.2s" />
                  <LoadingDot $delay="0.4s" />
                </LoadingBubble>
                <LoadingText>Loading conversation history...</LoadingText>
              </LoadingContainer>
            ) : (
              <MessageList>
                {messages.map((message, index) => (
                  <MessageBubbleWrapper key={index} isUser={message.type === 'user'}>
                    {message.text || 'No content available'}
                  </MessageBubbleWrapper>
                ))}
                {loading && (
                  <LoadingBubble>
                    <LoadingDot $delay="0s" />
                    <LoadingDot $delay="0.2s" />
                    <LoadingDot $delay="0.4s" />
                  </LoadingBubble>
                )}
                <div ref={messagesEndRef} />
              </MessageList>
            )}
            <InputForm onSubmit={handleSubmit}>
              <ChatInput
                type="text"
                placeholder="Type your question here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading || initialLoading}
              />
              <SendButton type="submit" disabled={loading || initialLoading || !inputText.trim()}>
                <FaPaperPlane />
              </SendButton>
            </InputForm>
          </ChatContainer>
        </Container>
      </MainContent>
    </SidebarLayout>
  );
};

// Add this new styled component
const LoadingContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const LoadingText = styled.p`
  ${typography.textMdRegular};
  color: ${colors.textSecondary};
  margin-top: 16px;
`;

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  /* height: 100vh; */
  background-color: #f8fafc;
  overflow: hidden;
`;

export default Chatbot;