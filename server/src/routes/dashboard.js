import { Router } from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import { monthRange } from '../utils/month.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', async (req, res, next) => {
  try {
    const { month, start, end } = monthRange(req.query.month);
    const userId = new mongoose.Types.ObjectId(req.userId);
    const base = { user: userId, date: { $gte: start, $lt: end } };
    const [totals, categories, recent, trend] = await Promise.all([
      Transaction.aggregate([
        { $match: base },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $match: { ...base, type: 'expense' } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }, { $limit: 8 }
      ]),
      Transaction.find(base).sort({ date: -1, createdAt: -1 }).limit(6),
      Transaction.aggregate([
        { $match: base },
        { $group: { _id: { $dayOfMonth: '$date' }, income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } }, expenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } } } },
        { $sort: { _id: 1 } }
      ])
    ]);
    const income = totals.find(x => x._id === 'income')?.total || 0;
    const expenses = totals.find(x => x._id === 'expense')?.total || 0;
    res.json({
      month, income, expenses, balance: income - expenses,
      savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
      transactionCount: totals.reduce((sum, x) => sum + x.count, 0),
      categories: categories.map(x => ({ category: x._id, amount: x.total })),
      recentTransactions: recent,
      trend: trend.map(x => ({ day: x._id, income: x.income, expenses: x.expenses }))
    });
  } catch (err) { next(err); }
});

export default router;
