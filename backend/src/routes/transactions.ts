import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, Prisma, TransactionType } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

const createSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string().transform((s) => new Date(s)),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const data = parse.data;
  const tx = await prisma.transaction.create({
    data: {
      userId: req.userId!,
      type: data.type,
      amount: new Prisma.Decimal(data.amount),
      category: data.category,
      description: data.description || null,
      date: data.date,
    },
  });
  res.json(tx);
});

const listQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.nativeEnum(TransactionType).optional(),
  category: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const parse = listQuery.safeParse(req.query);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { from, to, type, category, page, pageSize } = parse.data;
  const where: any = { userId: req.userId };
  if (from) where.date = { ...(where.date || {}), gte: new Date(from) };
  if (to) where.date = { ...(where.date || {}), lte: new Date(to) };
  if (type) where.type = type;
  if (category) where.category = category;
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);
  res.json({ items, page, pageSize, total });
});

router.get('/summary', requireAuth, async (req: AuthRequest, res) => {
  const { from, to } = req.query as any;
  const where: any = { userId: req.userId };
  if (from) where.date = { ...(where.date || {}), gte: new Date(from) };
  if (to) where.date = { ...(where.date || {}), lte: new Date(to) };
  
  const byType = await prisma.transaction.groupBy({
    by: ['type'],
    where,
    _sum: { amount: true },
  });
  
  // Only get expense categories for spending pie chart
  const byExpenseCategory = await prisma.transaction.groupBy({
    by: ['category'],
    where: { ...where, type: 'EXPENSE' },
    _sum: { amount: true },
  });
  
  res.json({ byType, byCategory: byExpenseCategory });
});

// Monthly trends endpoint
router.get('/trends', requireAuth, async (req: AuthRequest, res) => {
  const { from, to } = req.query as any;
  const where: any = { userId: req.userId };
  if (from) where.date = { ...(where.date || {}), gte: new Date(from) };
  if (to) where.date = { ...(where.date || {}), lte: new Date(to) };
  
  // Get monthly spending data
  const monthlyData = await prisma.transaction.groupBy({
    by: ['type'],
    where,
    _sum: { amount: true },
    _count: { id: true },
  });
  
  // Get transactions grouped by month
  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      amount: true,
      type: true,
      date: true,
    },
    orderBy: { date: 'asc' },
  });
  
  // Group by month
  const monthlyTrends: { [key: string]: { month: string; income: number; expense: number } } = {};
  
  transactions.forEach(tx => {
    const month = tx.date.toISOString().substring(0, 7); // YYYY-MM format
    if (!monthlyTrends[month]) {
      monthlyTrends[month] = { month, income: 0, expense: 0 };
    }
    
    if (tx.type === 'INCOME') {
      monthlyTrends[month].income += Number(tx.amount);
    } else {
      monthlyTrends[month].expense += Number(tx.amount);
    }
  });
  
  const trendsArray = Object.values(monthlyTrends).sort((a, b) => a.month.localeCompare(b.month));
  
  res.json({ monthlyTrends: trendsArray });
});

// Summary statistics endpoint
router.get('/stats', requireAuth, async (req: AuthRequest, res) => {
  const { from, to } = req.query as any;
  const where: any = { userId: req.userId };
  if (from) where.date = { ...(where.date || {}), gte: new Date(from) };
  if (to) where.date = { ...(where.date || {}), lte: new Date(to) };
  
  // Get current month data
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const currentMonthWhere = {
    userId: req.userId!,
    date: {
      gte: currentMonthStart,
      lte: currentMonthEnd,
    },
  };
  
  const [totalIncome, totalExpense, biggestCategory, dailySpending] = await Promise.all([
    // Total income this month
    prisma.transaction.aggregate({
      where: { ...currentMonthWhere, type: 'INCOME' },
      _sum: { amount: true },
    }),
    
    // Total expenses this month
    prisma.transaction.aggregate({
      where: { ...currentMonthWhere, type: 'EXPENSE' },
      _sum: { amount: true },
    }),
    
    // Biggest expense category this month
    prisma.transaction.groupBy({
      by: ['category'],
      where: { ...currentMonthWhere, type: 'EXPENSE' },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 1,
    }),
    
    // Average daily spending
    prisma.transaction.aggregate({
      where: { ...currentMonthWhere, type: 'EXPENSE' },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);
  
  const income = Number(totalIncome._sum?.amount || 0);
  const expense = Number(totalExpense._sum?.amount || 0);
  const savings = income - expense;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const avgDailySpending = expense / daysInMonth;
  
  res.json({
    totalIncome: income,
    totalExpense: expense,
    netSavings: savings,
    savingsRate: Math.round(savingsRate * 100) / 100,
    biggestExpenseCategory: biggestCategory[0]?.category || 'N/A',
    averageDailySpending: Math.round(avgDailySpending * 100) / 100,
  });
});

export default router;