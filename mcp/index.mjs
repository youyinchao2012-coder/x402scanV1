#!/usr/bin/env node
// vcp-signal-mcp — MCP connector for the VCP Signal x402 API.
// Lets any MCP agent (Claude, etc.) call the pay-per-call endpoint without
// handling the 402 flow itself: x402-fetch signs and settles USDC on Base.
//
// Tools:
//   vcp_preview         free: tier counts + 1 sample/tier + honest backtest
//   vcp_signal_latest   paid: full daily screening, $0.01 USDC via x402 v2
//   vcp_signal_history  paid: rolling daily screening history, $0.01 via x402 v2
//
// Config (env):
//   VCP_MCP_BASE_URL      default https://vcp-signal-x402.x402-vcp-signal.workers.dev
//   VCP_MCP_PRIVATE_KEY   0x-prefixed EVM key funded with USDC on Base. Required
//                         only for the paid tool; without it the paid tool
//                         returns a clear "set VCP_MCP_PRIVATE_KEY" hint.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { x402Client } from "@x402/core/client";
import { HTTPFacilitatorClient } from "@x402/core/http";
import { toClientEvmSigner } from "@x402/evm";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";

const BASE_URL = (process.env.VCP_MCP_BASE_URL || "https://vcp-signal-x402.x402-vcp-signal.workers.dev").replace(/\/+$/, "");
const FACILITATOR = process.env.VCP_MCP_FACILITATOR || "https://facilitator.payai.network";
const PK = process.env.VCP_MCP_PRIVATE_KEY || "";

function paidFetch() {
  if (!PK) return null;
  const account = privateKeyToAccount(PK);
  const publicClient = createPublicClient({ chain: base, transport: http() });
  const client = registerExactEvmScheme(
    new x402Client(new HTTPFacilitatorClient({ url: FACILITATOR })),
    { signer: toClientEvmSigner(account, publicClient) },
  );
  return wrapFetchWithPayment(globalThis.fetch, client);
}

async function getJson(url, fetchImpl) {
  const res = await (fetchImpl || globalThis.fetch)(url);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

const server = new McpServer({ name: "vcp-signal", version: "0.1.0" });

server.registerTool(
  "vcp_preview",
  {
    title: "VCP preview (free)",
    description:
      "Free teaser of the Taiwan-stock VCP screening: tier counts, one sample per tier, and the honest backtest (mean +4.52%, median -2.88%, win rate 27.9% — trend asymmetry, not a high-win-rate oracle). Research data, not investment advice.",
    inputSchema: {},
  },
  async () => {
    const r = await getJson(`${BASE_URL}/preview`);
    return {
      content: [{ type: "text", text: JSON.stringify(r.body, null, 2) }],
      isError: r.status !== 200,
    };
  },
);

async function paidTool(path) {
  const f = paidFetch();
  if (!f) {
    return {
      content: [
        {
          type: "text",
          text:
            "Not called: this tool pays $0.01 USDC on Base. Set VCP_MCP_PRIVATE_KEY (0x-prefixed key of a USDC-funded Base wallet) to enable automatic x402 settlement. Free alternative: vcp_preview.",
        },
      ],
      isError: true,
    };
  }
  const r = await getJson(`${BASE_URL}${path}`, f);
  if (r.status === 402) {
    return {
      content: [{ type: "text", text: "Payment failed or wallet lacks USDC on Base: " + JSON.stringify(r.body).slice(0, 500) }],
      isError: true,
    };
  }
  return { content: [{ type: "text", text: JSON.stringify(r.body, null, 2) }], isError: r.status !== 200 };
}

server.registerTool(
  "vcp_signal_latest",
  {
    title: "VCP full signal ($0.01 USDC via x402)",
    description:
      "Full daily VCP screening JSON (tiers A/B/C with code, name, close, trigger, pivot, stop, dryup, depth + backtest metadata). Costs $0.01 USDC on Base per call, settled over x402 v2 — no account, no API key. Requires VCP_MCP_PRIVATE_KEY env with a USDC-funded Base wallet. Research data, not investment advice.",
    inputSchema: {},
  },
  async () => paidTool("/signal/latest"),
);

server.registerTool(
  "vcp_signal_history",
  {
    title: "VCP daily screening history ($0.01 USDC via x402)",
    description:
      "Rolling history of the daily VCP screenings (last 30 recorded days, ascending; days before the service launched are honestly absent). Costs $0.01 USDC on Base per call via x402 v2 — no account, no API key. Requires VCP_MCP_PRIVATE_KEY env with a USDC-funded Base wallet. Research data, not investment advice.",
    inputSchema: {},
  },
  async () => paidTool("/signal/history"),
);

const transport = new StdioServerTransport();
await server.connect(transport);
