# VCP Signal API — x402 付費訊號端點(第一節實作)

[![npm](https://img.shields.io/npm/v/vcp-signal-mcp)](https://www.npmjs.com/package/vcp-signal-mcp)
[![x402scan](https://img.shields.io/badge/x402scan-verified-green)](https://www.x402scan.com/server/fcbe0340-51c7-4c32-b46f-7d695e1e0e28)
[![status](https://img.shields.io/endpoint?url=https%3A%2F%2Fvcp-signal-x402.x402-vcp-signal.workers.dev%2Fbadge.json)](https://vcp-signal-x402.x402-vcp-signal.workers.dev/stats)

把 `vcp2/` 的每日 VCP 篩選訊號包成 **$0.01/次、USDC 付款、免帳號免 API key** 的
x402 HTTP 端點,部署在 Cloudflare Worker,掛在 x402scan 目錄。
MCP connector:`npx vcp-signal-mcp`(stdio;免費 preview + 兩個 $0.01 付費工具)。

## 端點

| Method | Path | 說明 | 價格 |
|---|---|---|---|
| GET | `/` | 能力發現(產品說明、價格、endpoints) | 免費 |
| GET | `/signal/latest` | 最新 VCP 篩選:tier A/B/C + 觸發/樞紐/停損 + 回測摘要 | $0.01(USDC) |
| GET | `/signal/history` | 滾動每日篩選歷史(最近 30 個已記錄日,asc;服務上線前的日期如實缺席) | $0.01(USDC) |

## 本地開發

```bash
npm install
node scripts/build-signal.mjs   # 讀 ../../vcp2/screen_YYYYMMDD.json → src/signal.json
npm run dev                     # wrangler dev → http://localhost:8787
```

## 部署

```bash
node_modules/.bin/wrangler deploy        # 正式(主人 OAuth 已登入)
node_modules/.bin/wrangler deploy --temporary   # 舊:24h 臨時帳號(已不用)
```

- 2026-11-25 部署:`https://vcp-signal-x402.ring-apparatus-e5c.workers.dev`(24h 已到期)
- 2026-11-26 重新部署:`https://vcp-signal-x402.delicate-sodalite.workers.dev`
  - **主人已認領成功**(帳號 Delicate Sodalite,id `c43f25f231bf57f23d1d9f6602747f24`)✅【已驗證:CF 對該 origin 的 bot 防護消失,x402scan checkDiscovery found:true】
  - ⚠ 認領後我的 temporary 部署 session token 失效(`Invalid access token`),
    後續部署需用主人帳號:`wrangler login`(OAuth)→ `npm run deploy`。
- ⚠ **2026-11-26 重大發現:x402scan 現只接受 x402 v2**,v1 402 回應被拒:
  `validation: x402 v1 response detected — migrate to v2 spec`(原始碼 `lib/resources.ts:109`)。
  已完成 v1→v2 遷移【已驗證遠端】:`@x402/hono@2.32` + `@x402/core` + `@x402/evm`
  (v2 402 用 `Payment-Required` header、CAIP-2 網路、`amount`(非 maxAmountRequired);
  付款 header 是 `PAYMENT-SIGNATURE`,payload 需回顯選中的 `accepted` requirements)。
  舊 v1 套件 `x402-hono@1.2.0` 已從 index.js 移除(尚未從 package.json 卸載)。
- **永久 URL**:`https://vcp-signal-x402.x402-vcp-signal.workers.dev`
  (主人 `wrangler login` 後 `npm run deploy`,不再 24h 到期)【已驗證】
- ⚠ 掛目錄第 3 關 `Missing input schema`:在 402 的 `extensions.bazaar.schema` 補
  `input.properties.queryParams`(GET 無參也要空物件)與 `output.properties.example`
  — x402scan 的 `extractSchemas2` 只認這兩個鍵,缺一掛牌後仍帶 error 級警告。【已驗證】
- ⚠ 掛目錄第 4 關 `No supported networks: Supported: [base, solana]` —
  **x402scan 不收測試網**("Testnets are not indexed"),只宣告 84532 會被整條拒。
  解法:`accepts` 同時宣告 `eip155:84532 + eip155:8453`(`NETWORKS` 變數,SDK 支援陣列),
  facilitator 換 `https://facilitator.payai.network`(實測 /supported 同時支援
  v2 exact@8453 與 @84532;x402.org facilitator 只有測試網,且 SDK initialize 會逐一驗證
  advertised accepts 對應 facilitator 支援,否則 Worker 直接 500)。【已驗證】
- **2026-11-26 掛牌成功**【已驗證】:`registerFromOrigin` 回
  `success:true, registered:1, warnings:[]`,originId `fcbe0340-51c7-4c32-b46f-7d695e1e0e28`;
  目錄 list.all 可查到 `GET /signal/latest`(x402Version 2);
  `public.origins.get` 標題/描述正確;tryponcho 商店頁
  `https://tryponcho.com/m/https:/vcp-signal-x402.x402-vcp-signal.workers.dev` 回 200(JS 渲染,內容未從 curl 確認)。
  payai facilitator 付款鏈路【已驗證】:paytest 帶隨機私鑰 → 402 `invalid_exact_evm_signature`
  (代表簽名已送達 facilitator 驗證;測試網假錢,非真實成交)。
- mainnet 正式收錢待辦:`PAY_TO` 換主人自己的 Base 錢包(現在是隨機測試地址!);
  `NETWORKS` 可只留 `eip155:8453`;payai facilitator 屬第三方服務,上線前宜評估
  改用 Circle / Coinbase CDP 等(見 docs.x402.org/dev-tools/facilitators)。

## x402scan 掛目錄(2026-11-25 現況)

- Worker 已附 discovery:`/openapi.json`(x-payment-info + 402 response)+ `/.well-known/x402`。
  本地對 @agentcash/discovery 1.7.5(與 x402scan 同版本)實測 `found:true, authMode:"paid"` ✅【已驗證】
- 註冊 API(已從原始碼確認):tRPC `public.resources.register` / REST `POST /api/x402/registry/register`
  (REST 需 SIWX 錢包認證;tRPC 公開)。流程:先抓 origin 的 openapi.json,再探測 402。
- ~~卡點:x402scan 伺服端抓不到預覽 URL(CF 對未認領帳號的 bot 防護)~~
  **已解除**【已驗證 2026-11-26】:認領後 `checkDiscovery(bustCache)` 回
  `found:true, source:"openapi", authMode:"paid"`。
- 四層卡點全部解除(v1 拒絕 → 缺 input schema → 測試網不被索引 → 掛牌成功),
  詳見上節 2026-11-26 記錄。掛牌 API:`POST /api/trpc/public.resources.registerFromOrigin`
  body `{"json":{"origin":"https://vcp-signal-x402.x402-vcp-signal.workers.dev"}}`。

## 測試

`paytest.mjs`(已遷 v2):讀 402 的 `Payment-Required` header → 選 `eip155:84532` 的
accept → viem 簽 EIP-3009 transferWithAuthorization(chainId 84532)→ payload 帶
`x402Version:2, accepted:<選中 requirements>, payload:{signature, authorization}` →
header `PAYMENT-SIGNATURE` 送出 → facilitator 回 402 `invalid_exact_evm_signature`
(隨機私鑰,代表簽名已送達驗證)。本地:`node_modules/.bin/wrangler dev --port 8899` 後
`BASE=http://localhost:8899 node paytest.mjs`。

## 7/24 監控(2026-11-26 啟用)

- Worker 端:`GET /stats`(免費)回 KV 計數器 — `req:signal`(付費端點被訪問次數)、
  `paid:signal`(付款成功交付次數)、`free:root`(免費端點擊),含 today 分桶。
  KV namespace `VCP_COUNTER`(id `b468e0d1c1754b62bbd01a9682a6b077`)。【已驗證遠端計數生效】
- 鏈上端:`scripts/monitor.mjs` 比對上次狀態(.monitor-state.json):
  1) /stats 計數增量 → `NEW_ACCESS`;2) Base mainnet + Base Sepolia 的
  USDC `Transfer → PAY_TO` eth_getLogs(分塊掃描,Sepolia RPC 上限 200 塊)→ `NEW_PAYMENT`。
- 排程:Claude 工作階段的 cron 每 15 分鐘跑一次 monitor,有 NEW_* 即推播通知。
  ⚠ 此排程為 session-only(Claude 結束即失效),且 30 天自動到期。
- 注意:付費端點的 `req:signal` 含未付款的探測(如 x402scan 健康檢查);
  只有 `paid:signal` 增量 + 鏈上 `NEW_PAYMENT` 才代表真收入。

## 誠實聲明

訊號屬研究/教育用途,非投資建議;回測數字是「篩選母體上的回測,非實際成交」。
測試網付款是假錢;目錄掛牌 ≠ 有收入。
