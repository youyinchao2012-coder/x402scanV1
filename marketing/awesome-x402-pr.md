# awesome-x402 提交條目(HM 草擬,待 YL 建立 GitHub repo 後由 YL 或授權 HM 提 PR)

目標檔案:https://github.com/xpaysh/awesome-x402 —「💡 Example Applications / Ecosystem Projects」區,單一 bullet。

建議條目(英文,與現有條目風格一致;全部事實可驗證):

```markdown
- [VCP Signal API](https://vcp-signal-x402.x402-vcp-signal.workers.dev) - Taiwan common-stock VCP (Minervini volume-contraction) daily screening for research agents: tiers A/B/C with pivot/trigger/stop levels + volume dryup, shipped with its own honest backtest inside every payload (197 scored signals 2018–2026, mean +4.52%, median −2.88%, win rate 27.9% — trend asymmetry, not an oracle; research data, not investment advice). $0.01 USDC per call on Base & Base Sepolia via x402 v2, no account, no API key. Free teaser `GET /preview` (1 sample/tier + backtest) before paying; `llms.txt`, OpenAPI 3.1, Bazaar-discovery extension in every 402; listed on x402scan (originId fcbe0340-51c7-4c32-b46f-7d695e1e0e28). MCP: `npx vcp-signal-mcp` (stdio; auto-settles via x402-fetch). ([OpenAPI](https://vcp-signal-x402.x402-vcp-signal.workers.dev/openapi.json) | [Discovery](https://vcp-signal-x402.x402-vcp-signal.workers.dev/.well-known/x402) | [llms.txt](https://vcp-signal-x402.x402-vcp-signal.workers.dev/llms.txt) | [Preview](https://vcp-signal-x402.x402-vcp-signal.workers.dev/preview))
```

PR 注意事項(學習自現有條目):
1. 他們接受 Cloudflare Workers 端點(Kaisha、GigSoul 都是 workers.dev)——不需要自訂網域。
2. 條目自證:每個連結都要 200。本端點 /、/preview、/openapi.json、/.well-known/x402、/llms.txt 全部免費 200。
3. `MCP: npx vcp-signal-mcp` 這句要等 npm 發佈後才可寫;未發佈前先拿掉該子句(誠實紅線)。
4. GitHub repo 缺失:多數被收錄條目附 GitHub 連結。建議 YL 建 public repo(`x402scan-v1` 或 `vcp-signal-api`),放 src/、mcp/、README;x402scanV1 名稱对外仍慎用(撞 x402scan)。
