# x402scanV1 — HM 分發素材包(HM = 本 agent,YL = 主人)

> 使用規則:所有素材已內建誠實聲明,請勿刪減。每日自動化鏈(daily_run→build-signal→deploy,
> 本機 crontab 週一至五 15:30)已上線;asof 若停在 2026-11-17 代表補跑尚未完成——
> 發布前請向 HM 確認 asof 已是最新交易日,才可宣稱 daily。

## 一、產品事實(只能用這些數字)

- 端點:`GET https://vcp-signal-x402.x402-vcp-signal.workers.dev/signal/latest`
- 價格:$0.01 / 次,USDC on Base,_via_ x402 v2 —— 無需註冊、無需 API key
- 內容:台股 VCP(Volume Contraction Pattern)篩選結果,tier A/B/C + 支撐/壓力位 + 回測附註
- 回測(2018-04~2026-11,197 個可評分訊號):平均 +4.52%、中位數 -2.88%、勝率 27.9%
  → 正期望值来自趨勢對稱性(少數大勝貢獻全部平均),不是高勝率策略
- 免付費入口:`GET /`(能力發現)、`GET /preview`(免費試閱:每 tier 1 範例+回測)、`GET /stats`(用量)、`GET /llms.txt`(agent 發現)
- 回購端點:`GET /signal/history`(每日篩選滾動歷史,最近 30 個已記錄日,$0.01/次;服務上線前的日期如實缺席——現況僅數日,引用時注意)
- MCP:`vcp-signal-mcp`(stdio,見 mcp/;npx 發佈待 YL 建立 npm 帳號)
- 目錄:x402scan 已掛牌且 verified(2026-11-26 復驗:https://www.x402scan.com/server/fcbe0340-51c7-4c32-b46f-7d695e1e0e28;站點改版,舊 /endpoint/ 路徑已失效)
- 對標定位(研究結論):x402 榜單 7 日數據——Top15 全是「立即動作服務或參考數據」;
  數據類飽和至 $0.001-0.005,收入集中於少數高頻回購買家(第2名 $7,969 僅 88 買家)。
  我們走「免費試閱→單次 $0.01→(若驗證有需求)回購」漏斗。

## 二、推播文案(英文,面向 agent 開發者/x402 社群)

### Tweet / X 長推文草稿

```
An agent-to-agent data shop, live on Base:

GET https://vcp-signal-x402.x402-vcp-signal.workers.dev/signal/latest
→ $0.01 per call, USDC via x402 v2. No signup, no API key.
→ Taiwan stock VCP (volume contraction) screening: tiers A/B/C + support/resistance levels.

Backtest 2018–2026 (197 scored signals): mean +4.5%, win rate 27.9%.
Read that honestly: trend-following asymmetry, not a high-win-rate oracle.

Free teaser before you pay: GET /preview (tier samples + the backtest above).
llms.txt + MCP connector for agents. Listed on x402scan.
Pay-per-call data is how agents buy things.
```

### 社群貼文(Telegram/Discord agent builder 頻道,短版)

```
Built a $0.01 x402 endpoint as a test of machine-to-machine data sales:
Taiwan stock VCP screening (tier A/B/C + levels), USDC on Base, no API key.
Live + listed on x402scan. Curious what breaks first — the payment flow
or the demand curve. Honest stats in the payload itself (27.9% win rate,
+4.5% mean — trend asymmetry, not an oracle).
GET https://vcp-signal-x402.x402-vcp-signal.workers.dev/
```

### 一句話電梯簡報

> 「Agent 花 $0.01 買一份台股量能收縮篩選數據,不用註冊、不用聯絡人,付完即得 JSON。」

## 三、HM 的發布清單(按優先序)

1. x.com(從專案帳號發,避免 YL 個人帳號背書)
2. x402 生態 Discord/Telegram:search "x402" communities + Base 生態
3. GitHub:repo README + 話題 tag(x402, base, agents)——repo 待 YL 建立
4. HN "Show HN"(需 repo + 誠實回測數字,已備好)
5. tryponcho 商店頁已自動掛上(308 重導向版)——無需行動

## 四、YL 尚未交付的前置條件(阻塞項)

| 項 | 為什麼阻塞 |
|---|---|
| 正式 Base 收款地址(或確認用臨時錢包收第一筆) | 臨時錢包私鑰在聊天記錄裡,大額收入不該進它 |
| 每日自動更新 signal(目前 asof=2026-11-17) | 賣過期數據 = 零回購,行銷前必須先修 |
| 產品定位決定 | 「研究數據」賣法與「交易信號」賣法文案完全不同;現行素材走研究數據路線 |
| Bybit 是否支援 Base/USDC 入金確認 | 決定資金路径,不阻塞行銷 |

## 五、禁忌(誠實紅線)

- 不宣稱「信號/建議買賣」→ 只能说「篩選數據,研究用途,非投資建議」
- 不隱藏勝率 27.9% 與中位數負值 → 素材已內嵌
- 不宣稱 daily 更新,直到自動化上線
- 名稱「x402scanV1」对外慎用(与 x402scan 目錄撞名)
