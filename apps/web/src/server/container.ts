import { AiOrchestrator, OpenAiLlmClient } from '@bloomstock/ai';
import {
  createServiceClient,
  MarketRepository,
  PortfolioRepository,
  PromptRepository,
  ScanRepository,
  SecretRepository,
  TradeRepository,
  UserRepository,
} from '@bloomstock/database';
import { createCache } from '@bloomstock/market-data';
import { ScanService } from '@/server/scan-service';

const cache = createCache();

export function getContainer() {
  const db = createServiceClient();
  const market = new MarketRepository(db);
  const scans = new ScanRepository(db);
  const users = new UserRepository(db);
  const portfolios = new PortfolioRepository(db);
  const prompts = new PromptRepository(db);
  const secrets = new SecretRepository(db);
  const trades = new TradeRepository(db);
  const scanService = new ScanService(market, scans, cache);
  return { db, market, scans, users, portfolios, prompts, secrets, trades, scanService, cache };
}

export async function getOrchestrator() {
  const { prompts } = getContainer();
  const todaysTradePrompt = await prompts.getActive('todays_trade');
  return new AiOrchestrator({
    llm: new OpenAiLlmClient(),
    todaysTradePrompt,
  });
}
