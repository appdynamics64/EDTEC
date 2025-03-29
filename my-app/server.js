require('dotenv').config(); // Load environment variables

const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000' // Allow requests from your React app
}));
app.use(express.json());

// Initialize OpenAI client using the API key from the environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use the API key from the .env file
});

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