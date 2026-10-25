import { Router } from 'express';
import mongoose from 'mongoose';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { monthRange } from '../utils/month.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { month } = monthRange(req.query.month);
    const { start, end } = monthRange(month);
    const budgets = await Budget.find({ user: req.userId, month }).sort({ category: 1 });
    const spent = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.userId), type: 'expense', date: { $gte: start, $lt: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);
    const spentMap = Object.fromEntries(spent.map(x => [x._id, x.total]));
    res.json({ month, budgets: budgets.map(b => ({ ...b.toObject(), spent: spentMap[b.category] || 0 })) });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { category, amount, month } = req.body || {};
    if (typeof category !== 'string' || !category.trim() || category.trim().length > 40) return res.status(400).json({ message: 'A valid category is required.' });
    if (!Number.isFinite(Number(amount)) || Number(amount) < 1) return res.status(400).json({ message: 'Budget must be at least 1.' });
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) return res.status(400).json({ message: 'Month must use YYYY-MM format.' });
    const budget = await Budget.findOneAndUpdate(
      { user: req.userId, category: category.trim(), month },
      { $set: { amount: Number(amount) } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ budget });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid budget id.' });
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!budget) return res.status(404).json({ message: 'Budget not found.' });
    res.json({ message: 'Budget deleted.' });
  } catch (err) { next(err); }
});

export default router;
