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

function mongoErrorCategory(error) {
  const message = String(error?.message || '').toLowerCase();
  if (/auth|credential|password/.test(message)) return 'authentication';
  if (/ip access|ip address|not in the access|whitelist|not allowed/.test(message)) return 'Atlas access list';
  if (/tls|ssl|certificate/.test(message)) return 'TLS';
  if (/dns|srv|enotfound/.test(message)) return 'DNS';
  if (/timeout|timed out|etimedout/.test(message)) return 'network timeout';
  if (/reset|refused|unreachable/.test(message)) return 'network connection';
  return 'unclassified';
}

try {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/flexi_expense_tracker');
  console.log('Connected to MongoDB');
  app.listen(port, () => console.log(`FLEXI API listening on http://localhost:${port}`));
} catch (error) {
  const errorCode = error.code || error.cause?.code;
  console.error(`Could not connect to MongoDB (${error.name}${errorCode ? `, ${errorCode}` : ''}).`);
  const memberErrors = [...(error.reason?.servers?.values?.() || [])]
    .map(server => server.error)
    .filter(Boolean);
  if (memberErrors.length) {
    const details = [...new Set(memberErrors.map(memberError => {
      const code = memberError.code || memberError.cause?.code;
      return `${memberError.name}${code ? ` (${code})` : ''}: ${mongoErrorCategory(memberError)}`;
    }))];
    console.error(`MongoDB member errors: ${details.join('; ')}`);
  } else {
    console.error(`MongoDB error category: ${mongoErrorCategory(error)}`);
  }
  console.error('Check MONGO_URI, Atlas Network Access, and your network or DNS connection.');
  process.exit(1);
}
