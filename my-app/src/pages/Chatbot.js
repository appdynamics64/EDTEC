import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { FaArrowLeft, FaPaperPlane } from 'react-icons/fa';
import colors from '../styles/foundation/colors';
import typography from '../styles/foundation/typography';
import useAuth from '../hooks/useAuth';
import LoadingScreen from '../components/LoadingScreen';

const Chatbot = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Hello! How can I help you with your exam preparation today?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to the bottom of the chat when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!user) {
    return <LoadingScreen />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputText.trim()) return;
    
    // Add user message
    const userMessage = { type: 'user', text: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    // Set loading state
    setLoading(true);
    
    // Simulate bot response (replace with actual API call later)
    setTimeout(() => {
      const botResponse = { 
        type: 'bot', 
        text: `I understand you're asking about "${inputText}". This is where the AI would provide a helpful response based on your question.`
      };
      setMessages(prev => [...prev, botResponse]);
      setLoading(false);
    }, 1000);
  };

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate('/dashboard')}>
          <FaArrowLeft />
        </BackButton>
        <Title>AI Study Assistant</Title>
      </Header>
      
      <ChatContainer>
        <MessageList>
          {messages.map((message, index) => (
            <MessageBubble key={index} isUser={message.type === 'user'}>
              {message.text}
            </MessageBubble>
          ))}
          {loading && (
            <LoadingBubble>
              <LoadingDot delay="0s" />
              <LoadingDot delay="0.2s" />
              <LoadingDot delay="0.4s" />
            </LoadingBubble>
          )}
          <div ref={messagesEndRef} />
        </MessageList>
        
        <InputForm onSubmit={handleSubmit}>
          <ChatInput
            type="text"
            placeholder="Type your question here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
          />
          <SendButton type="submit" disabled={loading || !inputText.trim()}>
            <FaPaperPlane />
          </SendButton>
        </InputForm>
      </ChatContainer>
    </Container>
  );
};

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: ${colors.backgroundSecondary || '#f5f7fa'};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background-color: ${colors.brandPrimary || '#4f46e5'};
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  margin-right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    opacity: 0.8;
  }
`;

const Title = styled.h1`
  ${typography.headingMd || 'font-size: 1.5rem; font-weight: 600;'};
  margin: 0;
`;

const ChatContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 16px;
`;

const MessageBubble = styled.div`
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 16px;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background-color: ${props => props.isUser ? colors.brandPrimary || '#4f46e5' : 'white'};
  color: ${props => props.isUser ? 'white' : colors.textPrimary || '#1f2937'};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  ${typography.textMdRegular || 'font-size: 1rem;'};
  line-height: 1.5;
`;

const LoadingBubble = styled.div`
  align-self: flex-start;
  background-color: white;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  gap: 6px;
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const LoadingDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${colors.brandPrimary || '#4f46e5'};
  animation: ${bounce} 1s infinite;
  animation-delay: ${props => props.delay};
`;

const InputForm = styled.form`
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid ${colors.borderPrimary || '#e5e7eb'};
`;

const ChatInput = styled.input`
  flex: 1;
  padding: 14px 20px;
  border-radius: 24px;
  border: 1px solid ${colors.borderPrimary || '#e5e7eb'};
  ${typography.textMdRegular || 'font-size: 1rem;'};
  outline: none;
  
  &:focus {
    border-color: ${colors.brandPrimary || '#4f46e5'};
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
  }
  
  &:disabled {
    background-color: ${colors.backgroundDisabled || '#f3f4f6'};
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: ${colors.brandPrimary || '#4f46e5'};
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover:not(:disabled) {
    background-color: ${colors.brandPrimaryDark || '#3c3599'};
  }
  
  &:disabled {
    background-color: ${colors.backgroundDisabled || '#d1d5db'};
    cursor: not-allowed;
  }
`;

export default Chatbot; 