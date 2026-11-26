// 7/24 monitor for the VCP Signal x402 endpoint.
// Checks two signals against the previous state in .monitor-state.json:
//  1. worker usage counters at GET /stats (route attempts, paid deliveries, free hits)
//  2. on-chain USDC transfers to PAY_TO on Base mainnet + Base Sepolia (eth_getLogs)
// Prints lines prefixed NEW_ACCESS / NEW_PAYMENT when something changed, so the
// scheduler can decide to notify. Read-only otherwise; never mutates state unless
// checks succeed.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ORIGIN = "https://vcp-signal-x402.x402-vcp-signal.workers.dev";
const PAY_TO = "0x8C6CD433C9Ac161a1ce56899028568f0b40b042D"; // checksummed below via lowercase compare
const CHAINS = [
  {
    name: "Base (mainnet)",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    rpcs: ["https://base-rpc.publicnode.com", "https://mainnet.base.org"],
    maxRange: 1500,
  },
  {
    name: "Base Sepolia",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    rpcs: ["https://sepolia.base.org"],
    maxRange: 200, // public RPC hard cap (error -32614)
  },
];
const TOPIC0_TRANSFER =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const STATE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".monitor-state.json");

async function rpc(chain, body) {
  let lastErr;
  for (const url of chain.rpcs) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error.message || "rpc error");
      return j.result;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function pad32(addr) {
  return "0x" + addr.replace(/^0x/, "").toLowerCase().padStart(64, "0");
}

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : null;
const lines = [];
let changed = false;
const nextState = state ?? { statsTotals: null, seenTx: [], blocks: {}, startedAt: new Date().toISOString() };

// 1) worker usage counters
try {
  const r = await fetch(ORIGIN + "/stats", { signal: AbortSignal.timeout(15000) });
  const s = await r.json();
  if (s.totals) {
    if (state?.statsTotals) {
      for (const k of Object.keys(s.totals)) {
        const delta = s.totals[k] - (state.statsTotals[k] ?? 0);
        if (delta > 0) {
          changed = true;
          lines.push(`NEW_ACCESS ${k} +${delta} (total ${s.totals[k]}; today ${s.today?.[k]})`);
        }
      }
    }
    nextState.statsTotals = s.totals;
  } else {
    lines.push(`STATS_UNEXPECTED ${JSON.stringify(s).slice(0, 120)}`);
  }
} catch (e) {
  lines.push(`STATS_ERROR ${e.message}`);
}

// 2) on-chain USDC transfers to PAY_TO
const seen = new Set(state?.seenTx ?? []);
for (const chain of CHAINS) {
  try {
    const latestHex = await rpc(chain, { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] });
    const latest = parseInt(latestHex, 16);
    // Windowed scan: public RPCs cap eth_getLogs range (Sepolia: 200 blocks).
    // Walk from the last checked block to head in <= maxRange chunks so nothing
    // is missed between checks.
    let from = state?.blocks?.[chain.name] != null ? state.blocks[chain.name] + 1 : Math.max(0, latest - chain.maxRange);
    const to = latest - 2;
    if (to - from > chain.maxRange * 50) {
      from = to - chain.maxRange * 50; // bounded catch-up; older history skipped
      lines.push(`CHAIN_GAP ${chain.name} scan capped to ${chain.maxRange * 50} blocks`);
    }
    const logs = [];
    for (let w = from; w <= to; w += chain.maxRange) {
      const wEnd = Math.min(w + chain.maxRange - 1, to);
      const part = await rpc(chain, {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getLogs",
        params: [
          { address: chain.usdc, topics: [TOPIC0_TRANSFER, null, pad32(PAY_TO)], fromBlock: "0x" + w.toString(16), toBlock: "0x" + wEnd.toString(16) },
        ],
      });
      logs.push(...part);
    }
    for (const lg of logs) {
      const key = chain.name + ":" + lg.transactionHash + ":" + lg.logIndex;
      if (seen.has(key)) continue;
      seen.add(key);
      changed = true;
      const usdc = Number(BigInt(lg.data)) / 1e6;
      const fromAddr = "0x" + (lg.topics[1] || "").slice(-40);
      lines.push(`NEW_PAYMENT ${chain.name} ${lg.transactionHash} ${usdc} USDC from ${fromAddr}`);
    }
    nextState.blocks[chain.name] = latest;
  } catch (e) {
    lines.push(`CHAIN_ERROR ${chain.name} ${e.message}`);
  }
}
nextState.seenTx = Array.from(seen).slice(-500);
nextState.lastCheck = new Date().toISOString();

console.log(`check ${nextState.lastCheck}`);
for (const l of lines) console.log(l);
if (!changed && state) console.log("OK no change");
writeFileSync(STATE, JSON.stringify(nextState, null, 1));
