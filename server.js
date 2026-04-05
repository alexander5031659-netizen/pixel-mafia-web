// server.js - Backend API para Pixel Mafia con MongoDB
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['https://pixel-mafia-web.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Conexión MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://usuario:password@cluster.mongodb.net/pixel-mafia?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => {
    console.error('❌ Error MongoDB:', err.message);
    process.exit(1);
  });

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  tokens: { type: Number, default: 0 },
  bots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bot' }],
  trialEnds: { type: Date, default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
  createdAt: { type: Date, default: Date.now }
});

const botSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: { type: String, required: true },
  roomUrl: { type: String, required: true },
  category: { type: String, enum: ['GA', 'AP'], required: true },
  imvuUser: { type: String, required: true },
  imvuPass: { type: String, required: true },
  clientEmail: { type: String },
  clientName: { type: String },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  active: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const accountSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  usuario: { type: String, required: true },
  password: { type: String, required: true },
  categoria: { type: String, enum: ['GA', 'AP'], required: true },
  enUso: { type: Boolean, default: false },
  instanciaAsignada: { type: String, default: null }
});

const paymentSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  clientEmail: { type: String, required: true },
  clientName: { type: String },
  amount: { type: Number, required: true },
  tokens: { type: Number, required: true },
  description: { type: String },
  method: { type: String, default: 'PayPal' },
  status: { type: String, enum: ['Pendiente', 'Completado'], default: 'Pendiente' },
  date: { type: Date, default: Date.now }
});

const logSchema = new mongoose.Schema({
  type: { type: String, enum: ['info', 'warn', 'error'] },
  message: { type: String, required: true },
  time: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Bot = mongoose.model('Bot', botSchema);
const Account = mongoose.model('Account', accountSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Log = mongoose.model('Log', logSchema);

// Middleware auth
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
    req.user = await User.findById(decoded.id);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ========== AUTH ROUTES ==========
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret-key');
    res.json({ user: { id: user._id, name, email, role: user.role }, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret-key');
    res.json({ 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        tokens: user.tokens,
        trialEnds: user.trialEnds
      }, 
      token 
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ========== BOTS ROUTES ==========
app.get('/api/bots', authMiddleware, async (req, res) => {
  try {
    let bots;
    if (req.user.role === 'admin') {
      bots = await Bot.find().sort({ createdAt: -1 });
    } else {
      bots = await Bot.find({ clientEmail: req.user.email }).sort({ createdAt: -1 });
    }
    res.json(bots);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/bots', authMiddleware, async (req, res) => {
  try {
    const botData = {
      ...req.body,
      id: `bot-${Date.now()}`,
      clientEmail: req.user.email,
      clientName: req.user.name
    };
    
    const bot = new Bot(botData);
    await bot.save();
    
    // Add bot to user's bots array
    await User.findByIdAndUpdate(req.user._id, { $push: { bots: bot._id } });
    
    // Log
    await new Log({ type: 'info', message: `Bot creado: ${bot.name}` }).save();
    
    res.json(bot);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/bots/:id', authMiddleware, async (req, res) => {
  try {
    await Bot.findOneAndDelete({ id: req.params.id });
    await new Log({ type: 'warn', message: `Bot eliminado: ${req.params.id}` }).save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== ACCOUNTS ROUTES ==========
app.get('/api/accounts', authMiddleware, async (req, res) => {
  try {
    const accounts = await Account.find().sort({ categoria: 1 });
    res.json(accounts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/accounts', authMiddleware, async (req, res) => {
  try {
    const accountData = {
      ...req.body,
      id: `account-${Date.now()}`
    };
    const account = new Account(accountData);
    await account.save();
    res.json(account);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ========== USERS ROUTES ==========
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== PAYMENTS ROUTES ==========
app.get('/api/payments', authMiddleware, async (req, res) => {
  try {
    let payments;
    if (req.user.role === 'admin') {
      payments = await Payment.find().sort({ date: -1 });
    } else {
      payments = await Payment.find({ clientEmail: req.user.email }).sort({ date: -1 });
    }
    res.json(payments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/payments', authMiddleware, async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      id: `payment-${Date.now()}`,
      clientEmail: req.user.email,
      clientName: req.user.name
    };
    const payment = new Payment(paymentData);
    await payment.save();
    res.json(payment);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ========== LOGS ROUTES ==========
app.get('/api/logs', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const logs = await Log.find().sort({ time: -1 }).limit(100);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== STATS ROUTE ==========
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const stats = {
      totalBots: await Bot.countDocuments(),
      activeBots: await Bot.countDocuments({ status: 'online' }),
      gaBots: await Bot.countDocuments({ category: 'GA' }),
      apBots: await Bot.countDocuments({ category: 'AP' }),
      totalUsers: await User.countDocuments(),
      totalPayments: await Payment.countDocuments(),
      pendingPayments: await Payment.countDocuments({ status: 'Pendiente' }),
      availableAccounts: await Account.countDocuments({ enUso: false })
    };
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API corriendo en puerto ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});
