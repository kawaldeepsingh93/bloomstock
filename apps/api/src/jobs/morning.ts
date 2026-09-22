import { AiOrchestrator, OpenAiLlmClient } from '@bloomstock/ai';
import {
  createServiceClient,
  MarketRepository,
  PromptRepository,
  ScanRepository,
  SecretRepository,
} from '@bloomstock/database';
import {
  createCache,
  createKiteProvider,
  IngestionService,
  NseFiiProvider,
  NseIpoProvider,
  NseNewsProvider,
} from '@bloomstock/market-data';
import { dispatchMorningAlerts, HttpNotificationGateway } from '@bloomstock/notifications';
import { createLogger, nseSessionDate, toIsoDate } from '@bloomstock/shared';
import { noTradeReason, scanSwingCandidates } from '@bloomstock/trading';

const log = createLogger('morning-job');

export async function runMorningJob(): Promise<void> {
  const db = createServiceClient();
  const cache = createCache();
  const market = new MarketRepository(db);
  const scans = new ScanRepository(db);
  const prompts = new PromptRepository(db);
  const secrets = new SecretRepository(db);
  const kite = createKiteProvider(await secrets.get('kite_access_token'));
  const ingestion = new IngestionService(
    kite,
    new NseFiiProvider(),
    market,
    new NseNewsProvider(),
    new NseIpoProvider(),
  );
  const overview = await ingestion.runMorningJob();
  await market.saveOverview(overview);
  await cache.set('market:overview', overview, 6 * 60 * 60);

  const universe = await market.listActiveUniverse(2000);
  const snapshots = await market.latestIndicators(universe.map((item) => item.symbol));
  const snapshotMap = new Map(snapshots.map((item) => [item.symbol, item]));
  const stocks = [];
  for (const instrument of universe) {
    const snapshot = snapshotMap.get(instrument.symbol);
    if (!snapshot) continue;
    const candles = await market.getCandles(instrument.symbol, instrument.exchange, '1d', 80);
    stocks.push({ instrument, snapshot, candles });
  }
  const candidates = scanSwingCandidates({
    stocks,
    regime: overview.regime,
    capital: Number(process.env.DEFAULT_CAPITAL ?? 100_000),
    riskPercent: Number(process.env.DEFAULT_RISK_PERCENT ?? 1),
    limit: 3,
  });
  const scan = {
    scanDate: toIsoDate(nseSessionDate()),
    regime: overview.regime,
    stocksScanned: stocks.length,
    candidates,
    noTradeReason: noTradeReason(overview.regime, candidates),
  };
  await scans.saveDailyScan(scan);

  const orchestrator = new AiOrchestrator({
    llm: new OpenAiLlmClient(),
    todaysTradePrompt: await prompts.getActive('todays_trade'),
  });
  const news = await market.recentNews(undefined, 40);
  const result = await orchestrator.todaysTrade({
    scan,
    overview,
    news,
    capital: Number(process.env.DEFAULT_CAPITAL ?? 100_000),
    riskPercent: Number(process.env.DEFAULT_RISK_PERCENT ?? 1),
  });

  const gateway = new HttpNotificationGateway();
  const { data: profiles } = await db
    .from('profiles')
    .select('*')
    .or('notify_email.eq.true,notify_telegram.eq.true,notify_whatsapp.eq.true');
  for (const row of profiles ?? []) {
    await dispatchMorningAlerts(
      {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        capital: Number(row.capital),
        riskPercent: Number(row.risk_percent),
        telegramChatId: row.telegram_chat_id,
        whatsappNumber: row.whatsapp_number,
        notifyEmail: row.notify_email,
        notifyTelegram: row.notify_telegram,
        notifyWhatsapp: row.notify_whatsapp,
      },
      result.recommendations,
      gateway,
    );
  }
  log.info('Morning job complete', {
    scanned: scan.stocksScanned,
    picks: result.recommendations.length,
    noTrade: result.noTrade,
    gainers: overview.gainers.length,
    news: news.length,
  });
}
