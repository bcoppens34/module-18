const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// Connect to MongoDB using Mongoose
mongoose.connect('mongodb://localhost/social_network_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Middleware
app.use(bodyParser.json());

// Define Mongoose Schemas and Models
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
  // other fields as needed
});

const ThoughtSchema = new mongoose.Schema({
  text: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reaction' }],
  // other fields as needed
});

const ReactionSchema = new mongoose.Schema({
  type: String, // Like, Love, etc.
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // other fields as needed
});

const User = mongoose.model('User', UserSchema);
const Thought = mongoose.model('Thought', ThoughtSchema);
const Reaction = mongoose.model('Reaction', ReactionSchema);

// Register a new user
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username, email, password: hashedPassword });
    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// User login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    const token = jwt.sign({ userId: user._id }, 'secret_key'); // Change 'secret_key' to a secure key
    res.json({ message: 'Login successful', token });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, 'secret_key', (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.userId = decoded.userId;
    next();
  });
};

// Protected route to create a thought
app.post('/thoughts', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const newThought = await Thought.create({ text, author: req.userId });
    res.status(201).json({ message: 'Thought created', thought: newThought });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add more routes for reactions, friend management, etc.

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
