# X402blockchains/x402-registry 提案(整份複製即用)

提交方式(2 分鐘,無需本機操作):
1. 開 https://github.com/X402blockchains/x402-registry/new/main?filename=proposals/vcp-signal-api.md
   (GitHub 會提示 fork → 選 "Continue in this page in your fork")
2. 把下面 ---BEGIN--- 與 ---END--- 之間的内容整份貼進去
3. Commit → Create pull request,標題:`List VCP Signal API`

---BEGIN---
# Project name

VCP Signal API

## Basic details
- Project name: VCP Signal API
- What does it do? (2–3 sentences): Sells Taiwan common-stock VCP (Minervini volume-contraction) daily screening data to AI agents over x402. Two paid endpoints ($0.01 USDC each): latest screening (tiers A/B/C with pivot/trigger/stop levels + volume dryup) and rolling daily history. Every payload ships with its own honest backtest (197 scored signals 2018–2026, mean +4.52%, median −2.88%, win rate 27.9% — trend asymmetry, not an oracle; research data, not investment advice).
- Type: API
- Official website: https://vcp-signal-x402.x402-vcp-signal.workers.dev
- Logo URL: (none — text-based service)
- Documentation or getting-started link: https://vcp-signal-x402.x402-vcp-signal.workers.dev/llms.txt (also GET / and /openapi.json)
- Public support channel: https://github.com/youyinchao2012-coder/x402scanV1/issues

## Networks and activity
- Networks: Base / Base Sepolia
- Public explorer or analytics link, if available: live usage counter https://vcp-signal-x402.x402-vcp-signal.workers.dev/stats
- App contract/program or receiving addresses, with their networks, if available: receiving address 0x8C6CD433C9Ac161a1ce56899028568f0b40b042D (Base)
- Proof that you represent the project (official website, repository or public announcement): repository https://github.com/youyinchao2012-coder/x402scanV1 ; npm package https://www.npmjs.com/package/vcp-signal-mcp ; listed (verified) on x402scan https://www.x402scan.com/server/fcbe0340-51c7-4c32-b46f-7d695e1e0e28

## Payments — only if your product accepts payments
- Paid endpoint and HTTP method: GET /signal/latest and GET /signal/history
- Facilitator used: https://facilitator.payai.network
- Payment scheme/version: x402 v2, exact scheme, EVM
- Token contract/mint and decimals: USDC 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (Base, 6 decimals); testnet USDC 0x036CbD53842c5426634e7929541eC2318f3dCF7e (Base Sepolia, 6 decimals)
- Successful payment transaction link for each supported network: not yet — the service is live and payment-ready (full x402 challenge/sign/settle path verified end-to-end; facilitator rejects only unfunded test keys as expected); first real settlement will be added here when it occurs.
- Facilitator applicants: Not applicable

## Website application
- Website application reference, if you have one: (none yet)
- Related issue or previous pull request, if any: https://github.com/xpaysh/awesome-x402/pull/2369
---END---

備註(不貼進 proposal):誠實紅線已内建——「成功付款交易連結」一格如實寫 not yet,没有编造 settled tx。
