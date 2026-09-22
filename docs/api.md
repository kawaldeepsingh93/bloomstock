# API

All responses use `{ ok: true, data }` or `{ ok: false, error: { code, message, details } }`.
Validation is Zod. Failures are 422. Auth failures are 401. Market vendor failures are 502.
Rate limits default to 60 req/min, 10 scans/min, 5 AI calls/min per user.

## GET /api/market/overview

**Auth:** public  
**Request:** none  
**Response:** Nifty, Bank Nifty, VIX, FII/DII, regime, asOf, gainers, losers, sectors  
**Errors:** `MARKET_DATA_ERROR` if the morning job has never succeeded. UI must render empty cards, not fabricated indexes.

## GET /api/stocks?q=HDFC

**Auth:** public  
**Response:** up to 100 active NSE instruments from `instruments`.

## GET /api/stocks/{symbol}

**Auth:** public  
**Response:** instrument, latest indicator snapshot, daily candles, news.  
**Errors:** `NOT_FOUND`.

## POST /api/scan

**Auth:** required  
**Request:**

```json
{
  "capital": 100000,
  "riskPercent": 1,
  "limit": 25,
  "filters": {
    "rsiMin": 55,
    "rsiMax": 70,
    "aboveEma20": true,
    "aboveEma50": true,
    "volumeRatioMin": 1.5,
    "pattern": "breakout"
  }
}
```

**Response:** `DailyScanSummary`  
**Errors:** `UNAUTHORIZED`, `VALIDATION_ERROR`, `RATE_LIMITED`, `MARKET_DATA_ERROR`.

## POST /api/recommendations

**Auth:** required  
**Request:** `{ "prompt": "todays_trade" }`  
**Response:** scan + AI desk note + max 3 picks with entry/stop/targets/size/confidence  
**Guarantee:** `candidate.risk` is the ATR engine output. The model cannot resize it.

## GET /api/watchlist

**Auth:** required  
**Response:** default watchlist symbols.

## POST /api/watchlist

**Request:** `{ "symbol": "TCS", "exchange": "NSE" }`  
**DELETE** uses the same body.

## POST /api/portfolio/analyze

**Request:**

```json
{
  "holdings": [{ "symbol": "HDFCBANK", "exchange": "NSE", "quantity": 10, "avgPrice": 1400 }]
}
```

**Response:** allocation, unrealized P&L, hold/sell/trail advice, trailing stop.

## GET /api/news?symbol=RELIANCE

Ingested headlines only.

## GET /api/ipo

Rows from `ipo_issues`.

## POST /api/ipo/analyze

**Auth:** trader  
**Request:** `{ "id": "<uuid>" }`  
**Response:** IPO facts plus subscribe/avoid/wait narrative. Does not invent GMP.

## POST /api/stocks/{symbol}/research

**Auth:** trader  
**Response:** `ResearchBrief` over backend snapshot + ingested news.

## GET / POST /api/trades

**Auth:** trader  
Book a swing from a recommendation card. Size and stops must match the ATR engine payload.

## GET /api/kite/login

Redirects a trader to Zerodha. Callback: `GET /api/kite/callback`. Status: `GET /api/kite/status` → `{ connected }`.

## POST /api/backtest

**Request:** `{ "symbol": "INFY", "from": "2022-01-01", "to": "2026-09-18" }`  
**Response:** win rate, profit factor, max drawdown, Sharpe, equity curve. Uses stored candles.

## GET / PATCH /api/settings

Risk capital, notification flags. RBAC: users may mutate only their profile.

## GET / POST /api/scans/saved

Persist scanner filter sets.
