# vcp-signal-mcp

MCP connector for the **VCP Signal API** — Taiwan common-stock VCP (Minervini volume-contraction) daily screening, sold per-call over x402 ($0.01 USDC on Base, no account, no API key).

Point any MCP agent (Claude, etc.) at it and the agent can browse the free teaser and buy the paid screening without handling the HTTP 402 flow itself — `x402-fetch` signs and settles USDC automatically.

## Tools

| Tool | Price | What you get |
|---|---|---|
| `vcp_preview` | free | tier counts, 1 sample per tier, honest backtest |
| `vcp_signal_latest` | $0.01 USDC | full daily screening: tiers A/B/C with code, name, close, trigger, pivot, stop, dryup, depth + backtest metadata |
| `vcp_signal_history` | $0.01 USDC | rolling daily screening history (last 30 recorded days, ascending) |

## Install & run

```bash
npx vcp-signal-mcp
```

Stdio MCP server config example (Claude / any MCP client):

```json
{
  "mcpServers": {
    "vcp-signal": {
      "command": "npx",
      "args": ["-y", "vcp-signal-mcp"]
    }
  }
}
```

## Configuration (environment)

| Var | Default | Notes |
|---|---|---|
| `VCP_MCP_BASE_URL` | `https://vcp-signal-x402.x402-vcp-signal.workers.dev` | the API origin |
| `VCP_MCP_PRIVATE_KEY` | — | `0x`-prefixed EVM key of a wallet funded with **USDC on Base**. Only needed for the paid tools; without it they return a clear hint instead of paying. |
| `VCP_MCP_FACILITATOR` | `https://facilitator.payai.network` | x402 facilitator |

## Honest numbers

Backtest 2018–2026 on the screened universe (not live fills): **197 scored signals, mean +4.52%, median −2.88%, win rate 27.9%** — trend-following asymmetry, not an oracle. Research data, **not investment advice**.

## API & source

- Endpoint docs: `GET /`, `GET /openapi.json`, `GET /llms.txt` from the base URL
- Listed on x402scan (verified): https://www.x402scan.com/server/fcbe0340-51c7-4c32-b46f-7d695e1e0e28
- Source: https://github.com/youyinchao2012-coder/x402scanV1 (folder `mcp/`)

License: MIT
