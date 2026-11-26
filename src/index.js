// x402 pay-per-call API: VCP (Volume Consolidation Pattern) stock signals for AI agents.
// $0.01 per lookup, paid in USDC via x402. No account, no API key.
// x402 v2 transport (Payment-Required header, CAIP-2 networks) — x402scan now rejects v1-only servers.
import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";

// The product: latest screening result embedded as a module
// (rebuilt daily: node scripts/build-signal.mjs reads ../vcp2 screen JSONs).
import signal from "./signal.json";
// Rolling daily-screening history (paid product #2; rebuilt by the same daily chain).
import history from "./history.json";

function makeApp(env) {
  const app = new Hono();
  const PAY_TO = env.PAY_TO;
  const NETWORK = env.NETWORK || "base-sepolia";
  const FACILITATOR = env.FACILITATOR || "https://x402.org/facilitator";
  // x402scan indexes only mainnet chains ("Testnets are not indexed"), so we
  // advertise mainnet Base + Base Sepolia together: Sepolia stays testable
  // via the x402.org facilitator; mainnet completes real settlement only after
  // PAY_TO + a mainnet facilitator are switched in.
  const NETWORKS = (env.NETWORKS || NETWORK).split(",").map((s) => s.trim()).filter(Boolean);

  // x402scan discovery: OpenAPI-first + /.well-known/x402 compatibility.
  // origin is derived from the live request URL so temporary/production deploys self-describe.
  app.get("/.well-known/x402", (c) =>
    c.json({
      version: 1,
      resources: [
        new URL(c.req.url).origin + "/signal/latest",
        new URL(c.req.url).origin + "/signal/history",
      ],
      ownershipProofs: [PAY_TO],
      instructions:
        "GET /signal/latest and GET /signal/history require x402 payment in USDC ($0.01 each). GET / is free capability discovery.",
    }),
  );
  app.get("/openapi.json", (c) =>
    c.json({
      openapi: "3.1.0",
      info: {
        title: "VCP Signal API",
        version: "1.0.0",
        description:
          "Taiwan common-stock VCP (volume-contraction) daily screening signals, sold per-call via x402. Research/education only, not investment advice.",
        contact: { email: env.CONTACT_EMAIL || "vcp-signal-api@proton.me" },
      },
      servers: [{ url: new URL(c.req.url).origin }],
      paths: {
        "/": {
          get: {
            summary: "Free capability discovery",
            responses: { 200: { description: "Product metadata JSON" } },
          },
        },
        "/preview": {
          get: {
            summary: "Free teaser: tier counts + 1 sample per tier + backtest metadata",
            responses: { 200: { description: "Partial screening JSON" } },
          },
        },
        "/llms.txt": {
          get: {
            summary: "Agent discovery doc (llms.txt convention)",
            responses: { 200: { description: "Plain text" } },
          },
        },
        "/signal/latest": {
          get: {
            summary: "Latest daily VCP screening (tiers A/B/C with levels + backtest metadata)",
            "x-payment-info": {
              protocols: ["x402"],
              price: { mode: "fixed", currency: "USD", amount: "0.01" },
            },
            responses: {
              200: { description: "Screening JSON" },
              402: { description: "x402 payment challenge" },
            },
          },
        },
        "/signal/history": {
          get: {
            summary: "Rolling daily VCP screening history (last 30 recorded days)",
            "x-payment-info": {
              protocols: ["x402"],
              price: { mode: "fixed", currency: "USD", amount: "0.01" },
            },
            responses: {
              200: { description: "History JSON" },
              402: { description: "x402 payment challenge" },
            },
          },
        },
      },
    }),
  );

  // Free endpoint: capability discovery so agents can price-compare before paying.
  app.get("/", (c) => {
    c.executionCtx?.waitUntil(bumpKV("free:root"));
    return c.json({
      name: "VCP Signal API",
      description:
        "Taiwan common-stock VCP (Mark Minervini volume-contraction) screening signals: box breakout candidates, pre-breakout tightening, pivot/trigger/stop levels, volume dryup. Updated daily.",
      price_usdc: 0.01,
      payment: "x402 (HTTP 402 Payment Required) — pay in USDC, no account, no API key",
      endpoints: {
        "GET /signal/latest":
          "full latest screening: tiers A/B/C with code, name, close, trigger, pivot, stop, dryup, tight, depth ($0.01 via x402)",
        "GET /signal/history":
          "rolling daily screening history, last 30 recorded days, ascending ($0.01 via x402)",
        "GET /preview": "free teaser: tier counts + 1 sample per tier + backtest",
        "GET /llms.txt": "agent discovery doc",
        "GET /stats": "live usage counters",
      },
      bench_rule: signal.bench,
      asof: signal.asof,
      disclaimer:
        "Signals for research/education. Not investment advice. Seller provides data, not trading recommendations.",
    });
  });

  // Usage counters (7/24 monitoring). Best-effort eventual-consistency KV:
  // request attempts on the paid route, successful paid deliveries, free hits.
  async function bumpKV(key) {
    if (!env.VCP_COUNTER) return;
    const day = new Date().toISOString().slice(0, 10);
    try {
      const cur = parseInt((await env.VCP_COUNTER.get(key)) || "0", 10);
      await env.VCP_COUNTER.put(key, String(cur + 1));
      const dcur = parseInt((await env.VCP_COUNTER.get(key + ":" + day)) || "0", 10);
      await env.VCP_COUNTER.put(key + ":" + day, String(dcur + 1), {
        expirationTtl: 60 * 60 * 24 * 40,
      });
    } catch {
      /* counters must never break the product */
    }
  }

  // Free teaser: tier counts + up to 1 sample per tier + honest backtest.
  // Lets a buyer agent (or its LLM) evaluate the contract before paying.
  // Deliberately incomplete: full lists require payment.
  app.get("/preview", (c) => {
    c.executionCtx?.waitUntil(bumpKV("free:preview"));
    const sample = (arr) => (arr && arr.length ? [arr[0]] : []);
    return c.json({
      product: "VCP Signal API",
      asof: signal.asof,
      note: "TEASER — 1 sample per tier. Pay $0.01 (GET /signal/latest) for the full screening.",
      counts: signal.counts,
      tiers: { A: sample(signal.tiers.A), B: sample(signal.tiers.B), C: sample(signal.tiers.C) },
      backtest: signal.backtest,
      price_usdc: 0.01,
      how: "x402 v2 — USDC on Base (eip155:8453) or Base Sepolia testnet. No account, no API key.",
      disclaimer:
        "Research/education data. Not investment advice. Backtest on screened universe, not live fills.",
    });
  });

  // Agent discovery: llms.txt convention (used across the x402 ecosystem).
  app.get("/llms.txt", (c) => {
    c.executionCtx?.waitUntil(bumpKV("free:llms"));
    const o = new URL(c.req.url).origin;
    c.header("Content-Type", "text/plain; charset=utf-8");
    return c.body(
      `# VCP Signal API

> Taiwan common-stock VCP (Minervini volume-contraction) daily screening: tiers A/B/C with pivot/trigger/stop levels, volume dryup, and honest backtest metadata (197 scored signals, mean +4.52%, median -2.88%, win rate 27.9% — trend asymmetry, not a high-win-rate oracle). Research data, not investment advice.

## Paid
- GET ${o}/signal/latest: full daily screening JSON. $0.01 USDC via x402 v2 (HTTP 402), no API key.
- GET ${o}/signal/history: rolling daily screening history (last 30 recorded days). $0.01 USDC via x402 v2.

## Free
- GET ${o}/preview: tier counts + 1 sample per tier + backtest.
- GET ${o}/: capability discovery.
- GET ${o}/stats: live usage counters.
- GET ${o}/openapi.json: OpenAPI 3.1 spec.
- GET ${o}/.well-known/x402: x402 discovery.
`,
    );
  });

  // Free stats endpoint for the monitoring script (public; no secrets).
  app.get("/stats", async (c) => {
    if (!env.VCP_COUNTER) return c.json({ error: "kv_not_bound" }, 501);
    const day = new Date().toISOString().slice(0, 10);
    const keys = ["req:signal", "paid:signal", "req:history", "paid:history", "free:root"];
    const out = { asof: new Date().toISOString(), totals: {}, today: {} };
    for (const k of keys) {
      out.totals[k] = parseInt((await env.VCP_COUNTER.get(k)) || "0", 10);
      out.today[k] = parseInt((await env.VCP_COUNTER.get(k + ":" + day)) || "0", 10);
    }
    return c.json(out);
  });

  // Public usage badge (shields.io endpoint format) — radical transparency as marketing.
  app.get("/badge.json", async (c) => {
    const req = env.VCP_COUNTER ? parseInt((await env.VCP_COUNTER.get("req:signal")) || "0", 10) : 0;
    const paid = env.VCP_COUNTER ? parseInt((await env.VCP_COUNTER.get("paid:signal")) || "0", 10) : 0;
    return c.json({ schemaVersion: 1, label: "x402 calls", message: `${req} req · ${paid} paid`, color: "blue" });
  });

  // Paid endpoints: x402 v2 payment middleware gates everything below.
  // NETWORK must be CAIP-2 in v2 (eip155:84532 = Base Sepolia).
  // Count every attempt at the paid route (before the payment gate).
  app.use("/signal/latest", (c, next) => {
    c.executionCtx?.waitUntil(bumpKV("req:signal"));
    return next();
  });
  app.use("/signal/history", (c, next) => {
    c.executionCtx?.waitUntil(bumpKV("req:history"));
    return next();
  });
  const server = registerExactEvmScheme(
    new x402ResourceServer(new HTTPFacilitatorClient({ url: FACILITATOR })),
    {},
  );
  app.use(
    paymentMiddleware(
      {
        "GET /signal/latest": {
          accepts: NETWORKS.map((network) => ({
            scheme: "exact",
            network,
            price: "$0.01",
            payTo: PAY_TO,
            maxTimeoutSeconds: 30,
          })),
          description:
            "Latest daily VCP screening: breakout + pre-breakout candidates with levels (JSON)",
          mimeType: "application/json",
          // bazaar discovery extension: x402scan requires an input schema
          // (GET, no params) + output example so agents know the contract.
          extensions: {
            bazaar: {
              info: {
                input: { type: "http", method: "GET" },
                output: {
                  type: "json",
                  example: {
                    product: "VCP Signal API",
                    asof: signal.asof,
                    tiers: signal.tiers,
                    counts: signal.counts,
                    backtest: signal.backtest,
                  },
                },
              },
              // x402scan's schema extractor reads input from
              // schema.properties.input.properties.{body|queryParams} and
              // output from schema.properties.output.properties.example —
              // a GET with no params still needs an (empty) queryParams key.
              schema: {
                $schema: "https://json-schema.org/draft/2020-12/schema",
                type: "object",
                properties: {
                  input: {
                    type: "object",
                    properties: {
                      type: { type: "string", const: "http" },
                      method: { type: "string", enum: ["GET"] },
                      queryParams: {
                        type: "object",
                        properties: {},
                        additionalProperties: false,
                      },
                    },
                    required: ["type", "method"],
                    additionalProperties: false,
                  },
                  output: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      example: {
                        type: "object",
                        properties: {
                          product: { type: "string" },
                          asof: { type: "string" },
                          tiers: { type: "object" },
                          counts: { type: "object" },
                          backtest: { type: "object" },
                        },
                      },
                    },
                    required: ["type"],
                  },
                },
                required: ["input"],
              },
            },
          },
        },
        "GET /signal/history": {
          accepts: NETWORKS.map((network) => ({
            scheme: "exact",
            network,
            price: "$0.01",
            payTo: PAY_TO,
            maxTimeoutSeconds: 30,
          })),
          description:
            "Rolling daily VCP screening history (last 30 recorded days, ascending)",
          mimeType: "application/json",
          extensions: {
            bazaar: {
              info: {
                input: { type: "http", method: "GET" },
                output: {
                  type: "json",
                  example: {
                    product: history.product,
                    window: history.window,
                    n_days: history.n_days,
                    days: history.days,
                  },
                },
              },
              schema: {
                $schema: "https://json-schema.org/draft/2020-12/schema",
                type: "object",
                properties: {
                  input: {
                    type: "object",
                    properties: {
                      type: { type: "string", const: "http" },
                      method: { type: "string", enum: ["GET"] },
                      queryParams: {
                        type: "object",
                        properties: {},
                        additionalProperties: false,
                      },
                    },
                    required: ["type", "method"],
                    additionalProperties: false,
                  },
                  output: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      example: {
                        type: "object",
                        properties: {
                          product: { type: "string" },
                          window: { type: "string" },
                          n_days: { type: "integer" },
                          days: { type: "array" },
                        },
                      },
                    },
                    required: ["type"],
                  },
                },
                required: ["input"],
              },
            },
          },
        },
      },
      server,
    ),
  );

  // Handler runs only after the payment gate passed → counts successful paid deliveries.
  app.get("/signal/latest", (c) => {
    c.executionCtx?.waitUntil(bumpKV("paid:signal"));
    return c.json(signal);
  });
  app.get("/signal/history", (c) => {
    c.executionCtx?.waitUntil(bumpKV("paid:history"));
    return c.json(history);
  });

  app.all("*", (c) => c.json({ error: "not_found", see: "GET /" }, 404));

  return app;
}

export default {
  fetch(request, env, ctx) {
    return makeApp(env).fetch(request, env, ctx);
  },
};
