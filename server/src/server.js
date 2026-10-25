import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budgets.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  next();
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'FLEXI API' }));
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => res.status(404).json({ message: 'API route not found.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === 'ValidationError') return res.status(400).json({ message: 'Please check the submitted fields.' });
  if (err.code === 11000) return res.status(409).json({ message: 'That record already exists.' });
  res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
});

const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
  console.error('JWT_SECRET must be set to at least 24 characters in server/.env');
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/flexi_expense_tracker');
  console.log('Connected to MongoDB');
  app.listen(port, () => console.log(`FLEXI API listening on http://localhost:${port}`));
} catch (error) {
  console.error('Could not connect to MongoDB:', error.message);
  process.exit(1);
}
