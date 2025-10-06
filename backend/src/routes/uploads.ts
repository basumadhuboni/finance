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

// Enhanced POS receipt line parser: finds lines like "$12.34" and categories via simple keywords
function extractTransactionsFromText(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: Array<{ amount: number; category: string; description?: string; date: Date; type: TransactionType }>= [];
  const now = new Date();
  
  // Look for various amount patterns
  const amountPatterns = [
    /(?:\$)?([0-9]+(?:\.[0-9]{2})?)/,  // $12.34 or 12.34
    /([0-9]+(?:\.[0-9]{2})?)\s*(?:USD|usd)/,  // 12.34 USD
    /total[:\s]*(?:\$)?([0-9]+(?:\.[0-9]{2})?)/i,  // Total: $12.34
    /amount[:\s]*(?:\$)?([0-9]+(?:\.[0-9]{2})?)/i,  // Amount: $12.34
  ];
  
  for (const line of lines) {
    let amount = 0;
    let matched = false;
    
    // Try each pattern
    for (const pattern of amountPatterns) {
      const match = line.match(pattern);
      if (match) {
        amount = parseFloat(match[1]);
        if (isFinite(amount) && amount > 0) {
          matched = true;
          break;
        }
      }
    }
    
    if (!matched) continue;
    
    // Determine category based on keywords
    let category = 'Uncategorized';
    const l = line.toLowerCase();
    
    if (l.includes('grocery') || l.includes('market') || l.includes('food') || l.includes('supermarket') || l.includes('store')) {
      category = 'Groceries';
    } else if (l.includes('fuel') || l.includes('gas') || l.includes('petrol') || l.includes('station')) {
      category = 'Fuel';
    } else if (l.includes('pharmacy') || l.includes('medicine') || l.includes('drug') || l.includes('health')) {
      category = 'Health';
    } else if (l.includes('restaurant') || l.includes('cafe') || l.includes('dining') || l.includes('food')) {
      category = 'Dining';
    } else if (l.includes('transport') || l.includes('taxi') || l.includes('uber') || l.includes('bus')) {
      category = 'Transportation';
    } else if (l.includes('entertainment') || l.includes('movie') || l.includes('cinema') || l.includes('game')) {
      category = 'Entertainment';
    }
    
    results.push({ 
      amount, 
      category, 
      description: line || '', 
      date: now, 
      type: 'EXPENSE' 
    });
  }
  
  return results;
}

router.post('/receipt', requireAuth, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const mime = req.file.mimetype;
    let text = '';
    
    if (mime === 'application/pdf') {
      try {
        const data = await pdf(req.file.buffer);
        text = data.text;
      } catch (error) {
        console.error('PDF parsing error:', error);
        return res.status(500).json({ error: 'Failed to parse PDF file' });
      }
    } else {
      try {
        // Initialize Tesseract worker with proper configuration
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: m => console.log(m)
        });
        
        const { data: { text: ocrText } } = await worker.recognize(req.file.buffer as any);
        await worker.terminate();
        text = ocrText;
      } catch (error) {
        console.error('OCR processing error:', error);
        return res.status(500).json({ error: 'Failed to process image with OCR' });
      }
    }
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'No text could be extracted from the file' });
    }
    
    const items = extractTransactionsFromText(text);
    if (items.length === 0) {
      return res.json({ imported: 0, items: [], extractedText: text });
    }
    
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
  } catch (error) {
    console.error('Receipt upload error:', error);
    res.status(500).json({ error: 'Internal server error during receipt processing' });
  }
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
  try {
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
  } catch (error) {
    console.error('Statement upload error:', error);
    res.status(500).json({ error: 'Internal server error during statement processing' });
  }
});

export default router;


