import { Router } from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const validTypes = ['income', 'expense'];

function validate(body) {
  const { title, amount, type, category, date, note = '' } = body || {};
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 100) return 'Title is required (max 100 characters).';
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return 'Amount must be greater than zero.';
  if (!validTypes.includes(type)) return 'Type must be income or expense.';
  if (typeof category !== 'string' || !category.trim() || category.trim().length > 40) return 'A category is required (max 40 characters).';
  if (!date || Number.isNaN(new Date(date).getTime())) return 'A valid date is required.';
  if (typeof note !== 'string' || note.length > 500) return 'Note must be 500 characters or fewer.';
  return null;
}

router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.userId };
    if (req.query.type && validTypes.includes(req.query.type)) filter.type = req.query.type;
    if (req.query.category) filter.category = String(req.query.category).slice(0, 40);
    if (req.query.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.month)) {
      const [y, m] = req.query.month.split('-').map(Number);
      filter.date = { $gte: new Date(Date.UTC(y, m - 1, 1)), $lt: new Date(Date.UTC(y, m, 1)) };
    }
    if (req.query.search) filter.title = { $regex: String(req.query.search).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 250);
    const items = await Transaction.find(filter).sort({ date: -1, createdAt: -1 }).limit(limit);
    res.json({ transactions: items });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const error = validate(req.body);
    if (error) return res.status(400).json({ message: error });
    const item = await Transaction.create({ ...req.body, title: req.body.title.trim(), category: req.body.category.trim(), amount: Number(req.body.amount), date: new Date(req.body.date), user: req.userId });
    res.status(201).json({ transaction: item });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid transaction id.' });
    const error = validate(req.body);
    if (error) return res.status(400).json({ message: error });
    const { _id, user, ...safeBody } = req.body;
    const update = { ...safeBody, title: req.body.title.trim(), category: req.body.category.trim(), amount: Number(req.body.amount), date: new Date(req.body.date) };
    const item = await Transaction.findOneAndUpdate({ _id: req.params.id, user: req.userId }, update, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Transaction not found.' });
    res.json({ transaction: item });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid transaction id.' });
    const item = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!item) return res.status(404).json({ message: 'Transaction not found.' });
    res.json({ message: 'Transaction deleted.' });
  } catch (err) { next(err); }
});

export default router;
