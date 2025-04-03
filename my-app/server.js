require('dotenv').config(); // Load environment variables

const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000' // Allow requests from your React app
}));
app.use(express.json());

// Initialize OpenAI client using the API key from the environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use the API key from the .env file
});

// Helper function to create a Supabase client with a token
function getSupabaseClientWithToken(token) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
    });
    // Send a JSON object with a 'message' field
    res.json({ message: response.choices[0].message.content.trim() });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.post('/api/chat-messages', async (req, res) => {
  try {
    const { conversationId, message, isUser } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token missing from Authorization header' });
    }

    // Create a Supabase client with the token
    const supabase = getSupabaseClientWithToken(token);

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'User not authenticated', details: authError.message });
    }

    const userId = user.id;

    // Insert the message into the chat_messages table
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert([
        { user_id: userId, conversation_id: conversationId, message, is_user: isUser }
      ]);

    if (insertError) {
      throw insertError;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Failed to save message', details: error.message });
  }
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Set up WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('WebSocket connection established');

  ws.on('message', (message) => {
    console.log('Received:', message);
    // Echo the message back
    ws.send(`Echo: ${message}`);
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});