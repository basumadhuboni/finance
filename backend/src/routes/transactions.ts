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
      description: data.description,
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
  const byCategory = await prisma.transaction.groupBy({
    by: ['category'],
    where,
    _sum: { amount: true },
  });
  res.json({ byType, byCategory });
});

export default router;