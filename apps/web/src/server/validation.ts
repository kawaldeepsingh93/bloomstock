import { z } from 'zod';

export const scanRequestSchema = z.object({
  capital: z.number().positive().optional(),
  riskPercent: z.number().positive().max(5).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  filters: z
    .object({
      marketCapMin: z.number().optional(),
      marketCapMax: z.number().optional(),
      sectors: z.array(z.string()).optional(),
      rsiMin: z.number().optional(),
      rsiMax: z.number().optional(),
      aboveEma20: z.boolean().optional(),
      aboveEma50: z.boolean().optional(),
      volumeRatioMin: z.number().optional(),
      pattern: z.enum(['breakout', 'cup_handle', 'flag', 'ascending_triangle']).optional(),
      breakoutOnly: z.boolean().optional(),
    })
    .optional(),
});

export const watchlistItemSchema = z.object({
  symbol: z.string().min(1).max(20),
  exchange: z.enum(['NSE', 'BSE']).default('NSE'),
});

export const holdingImportSchema = z.object({
  holdings: z.array(
    z.object({
      symbol: z.string().min(1),
      exchange: z.enum(['NSE', 'BSE']).default('NSE'),
      quantity: z.number().positive(),
      avgPrice: z.number().positive(),
    }),
  ),
});

export const settingsSchema = z.object({
  fullName: z.string().optional(),
  capital: z.number().positive(),
  riskPercent: z.number().positive().max(5),
  telegramChatId: z.string().nullable().optional(),
  whatsappNumber: z.string().nullable().optional(),
  notifyEmail: z.boolean(),
  notifyTelegram: z.boolean(),
  notifyWhatsapp: z.boolean(),
});

export const backtestSchema = z.object({
  symbol: z.string().min(1),
  from: z.string(),
  to: z.string(),
});

export const recommendationSchema = z.object({
  prompt: z
    .enum(['todays_trade', 'portfolio_review', 'ipo_analysis', 'stock_deep_research'])
    .default('todays_trade'),
});

export const ipoAnalyzeSchema = z.object({
  id: z.string().uuid().optional(),
});

export const magicLinkSchema = z.object({
  email: z.string().email(),
});

export const bookTradeSchema = z.object({
  symbol: z.string().min(1).max(20),
  exchange: z.enum(['NSE', 'BSE']).default('NSE'),
  entry: z.number().positive(),
  stopLoss: z.number().positive(),
  target1: z.number().positive(),
  target2: z.number().positive(),
  quantity: z.number().int().positive(),
});
