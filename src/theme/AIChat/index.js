import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import styles from './styles.module.css';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useColorMode } from '@docusaurus/theme-common';

function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [roomId, setRoomId] = useState('');
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const { colorMode } = useColorMode();
  const isDarkTheme = colorMode === 'dark';

  // Load messages from localStorage on component mount
  useEffect(() => {
    const storedMessages = localStorage.getItem('aiChatMessages');
    const storedRoomId = localStorage.getItem('aiChatRoomId');
    
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch (e) {
        console.error('Failed to parse stored messages');
        localStorage.removeItem('aiChatMessages');
      }
    }
    
    if (storedRoomId) {
      setRoomId(storedRoomId);
    } else {
      const newRoomId = uuidv4();
      setRoomId(newRoomId);
      localStorage.setItem('aiChatRoomId', newRoomId);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('aiChatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const sendMessage = async () => {
    if (input.trim() === '' || isLoading) return;
    
    // Add user message to chat
    const userMessage = { sender: 'user', text: input.trim() };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await fetch('https://api-aiagent.dev.kaia.io/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          text: userMessage.text,
          roomId: roomId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process AI responses more efficiently
      if (Array.isArray(data) && data.length > 0) {
        // Batch update messages
        setMessages(prevMessages => [
          ...prevMessages,
          ...data
            .filter(res => res && res.text)
            .map(res => ({ sender: 'bot', text: res.text }))
        ]);
      } else if (data && data.text) {
        // Handle single response
        setMessages(prevMessages => [
          ...prevMessages,
          { sender: 'bot', text: data.text }
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prevMessages => [
        ...prevMessages,
        { 
          sender: 'bot', 
          text: `An error occurred: ${error.message}. Please try again.`, 
          isError: true 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessage = (message, index) => (
    <div 
      key={index} 
      className={clsx(
        styles.chatBubble,
        message.sender === 'user' ? styles.userMessage : styles.botMessage,
        message.isError && styles.errorMessage
      )}
    >
      {message.sender === 'bot' ? (
        <ReactMarkdown>{message.text}</ReactMarkdown>
      ) : (
        message.text
      )}
    </div>
  );

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('aiChatMessages');
    // Generate a new roomId for a fresh conversation
    const newRoomId = uuidv4();
    setRoomId(newRoomId);
    localStorage.setItem('aiChatRoomId', newRoomId);
  };

  return (
    <div className={styles.aiChatContainer}>
      {/* Chat toggle button */}
      <button 
        className={styles.chatButton} 
        onClick={toggleChat}
        aria-label="Ask AI"
        data-theme={isDarkTheme ? 'dark' : 'light'}
      >
        <span className={styles.chatButtonText}>Ask AI</span>
      </button>
      
      {/* Chat window */}
      {isOpen && (
        <div 
          className={styles.chatWindow} 
          ref={chatContainerRef}
          data-theme={isDarkTheme ? 'dark' : 'light'}
        >
          <div className={styles.chatHeader}>
            <h3>Kaia AI Assistant</h3>
            <div className={styles.chatControls}>
              <button 
                className={styles.clearButton} 
                onClick={clearChat} 
                aria-label="Clear chat"
              >
                Clear
              </button>
              <button 
                className={styles.closeButton} 
                onClick={toggleChat} 
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className={styles.chatMessages}>
            {messages.length === 0 ? (
              <div className={styles.welcomeMessage}>
                Hello! I'm Kaia AI. How can I help you with our documentation today?
              </div>
            ) : (
              messages.map(renderMessage)
            )}
            {isLoading && (
              <div className={styles.loadingIndicator}>
                <div className={styles.loadingDot}></div>
                <div className={styles.loadingDot}></div>
                <div className={styles.loadingDot}></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className={styles.chatInput}>
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              rows={1}
            />
            <button 
              onClick={sendMessage} 
              disabled={isLoading || !input.trim()} 
              aria-label="Send message"
              className={styles.sendButton}
            >
              Send
            </button>
          </div>
          
          <div className={styles.disclaimer}>
            AI answers can be wrong. Check official sources to confirm.
          </div>
        </div>
      )}
    </div>
  );
}

export default AIChat;