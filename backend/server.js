const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// simple connect
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mern_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => res.json({ message: 'Hello from backend' }));

const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);

const dataRoutes = require('./src/routes/data');
app.use('/api/data', dataRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
