import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import { PrismaClient, TransactionType } from '@prisma/client';

// For OCR and PDF parsing we will use tesseract.js and pdf-parse
import * as Tesseract from 'tesseract.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdf: (input: Buffer) => Promise<{ text: string }> = require('pdf-parse');

const prisma = new PrismaClient();
const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Naive POS receipt line parser: finds lines like "$12.34" and categories via simple keywords
function extractTransactionsFromText(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: Array<{ amount: number; category: string; description?: string; date: Date; type: TransactionType }>= [];
  const now = new Date();
  for (const line of lines) {
    const amountMatch = line.match(/(?:\$)?([0-9]+(?:\.[0-9]{2})?)/);
    if (!amountMatch) continue;
    const amount = parseFloat(amountMatch[1]);
    if (!isFinite(amount) || amount <= 0) continue;
    let category = 'Uncategorized';
    const l = line.toLowerCase();
    if (l.includes('grocery') || l.includes('market') || l.includes('food')) category = 'Groceries';
    else if (l.includes('fuel') || l.includes('gas')) category = 'Fuel';
    else if (l.includes('pharmacy') || l.includes('medicine')) category = 'Health';
    results.push({ amount, category, description: line, date: now, type: 'EXPENSE' });
  }
  return results;
}

router.post('/receipt', requireAuth, upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const mime = req.file.mimetype;
  let text = '';
  if (mime === 'application/pdf') {
    const data = await pdf(req.file.buffer);
    text = data.text;
  } else {
    const ocr = await Tesseract.recognize(req.file.buffer, 'eng');
    text = ocr.data.text;
  }
  const items = extractTransactionsFromText(text);
  if (items.length === 0) return res.json({ imported: 0, items: [] });
  const created = await prisma.$transaction(
    items.map((i) =>
      prisma.transaction.create({
        data: {
          userId: req.userId!,
          type: i.type,
          amount: i.amount,
          category: i.category,
          description: i.description,
          date: i.date,
        },
      })
    )
  );
  res.json({ imported: created.length, items: created });
});

// PDF table import: expects tabular text; one transaction per line: date,description,category,amount,type
const tableRow = z.tuple([
  z.string(),
  z.string(),
  z.string(),
  z.string(),
  z.enum(['INCOME', 'EXPENSE']),
]);

router.post('/statement', requireAuth, upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ error: 'PDF required' });
  const data = await pdf(req.file.buffer);
  const lines = data.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parsed: Array<z.infer<typeof tableRow>> = [];
  for (const line of lines) {
    const parts = line.split(/\s{2,}|\t|\s\|\s/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 5) continue;
    const maybe = tableRow.safeParse([parts[0], parts[1], parts[2], parts[3], parts[4] as any]);
    if (maybe.success) parsed.push(maybe.data);
  }
  if (parsed.length === 0) return res.json({ imported: 0 });
  const created = await prisma.$transaction(
    parsed.map(([dateStr, description, category, amountStr, type]) =>
      prisma.transaction.create({
        data: {
          userId: req.userId!,
          type: type as TransactionType,
          amount: parseFloat(amountStr.replace(/[^0-9.\-]/g, '')),
          category,
          description,
          date: new Date(dateStr),
        },
      })
    )
  );
  res.json({ imported: created.length });
});

export default router;


