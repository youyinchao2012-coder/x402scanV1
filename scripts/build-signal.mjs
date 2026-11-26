// Rebuilds src/signal.json from the newest vcp2 screen_YYYYMMDD.json.
// Run daily right after vcp2/daily_run.py produces a new screen file.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const vcp2 = join(here, "..", "..", "vcp2");
const out = join(here, "..", "src", "signal.json");

const files = readdirSync(vcp2).filter((f) => /^screen_\d{8}\.json$/.test(f)).sort();
if (!files.length) { console.error("no screen_*.json found in vcp2"); process.exit(1); }
const latest = files[files.length - 1];
const d = JSON.parse(readFileSync(join(vcp2, latest), "utf8"));

const round = (x, n = 4) => (x == null ? null : Math.round(x * 10 ** n) / 10 ** n);
const slim = (s) => ({
  code: s.code, name: s.name, tier: s.tier, profile: s.profile,
  close: round(s.close, 2), trigger: round(s.trigger, 2), pivot: round(s.pivot, 2),
  dist: round(s.dist, 3), tight: round(s.tight, 3), dryup: round(s.dryup, 3),
  depth: round(s.depth, 3), stop_note: s.stop_note,
});

const signal = {
  product: "VCP Signal API",
  asof: d.asof,
  source_file: latest,
  bench_rule: d.bench,
  tiers: Object.fromEntries(Object.entries(d.tiers).map(([k, v]) => [k, v.map(slim)])),
  counts: Object.fromEntries(Object.entries(d.tiers).map(([k, v]) => [k, v.length])),
  methodology: "VCP screening (Minervini-style box + volume contraction) on TWSE/TWSE common stocks; tier A = box breakout, B = pre-breakout tightening (tight<15%, dryup), C = watch.",
};
// Honest backtest metadata from vcp/sig_q.json (historical screened-signal outcomes).
try {
  const hist = JSON.parse(readFileSync(join(here, "..", "..", "vcp", "sig_q.json"), "utf8"));
  const rets = hist.map((s) => s.ret).filter((r) => typeof r === "number");
  const mix = {};
  for (const s of hist) mix[s.reason ?? "open"] = (mix[s.reason ?? "open"] || 0) + 1;
  signal.backtest = {
    window: `${hist.reduce((a, s) => (s.date < a ? s.date : a), "9999")}..${hist.reduce((a, s) => (s.date > a ? s.date : a), "0000")}`,
    n_signals: hist.length,
    n_scored: rets.length,
    mean_ret: +(rets.reduce((a, b) => a + b, 0) / rets.length).toFixed(4),
    median_ret: +rets.slice().sort((a, b) => a - b)[Math.floor(rets.length / 2)].toFixed(4),
    win_rate: +(rets.filter((r) => r > 0).length / rets.length).toFixed(3),
    outcome_mix: mix,
    note: "Backtest on screened universe, not live fills.",
  };
} catch {}

writeFileSync(out, JSON.stringify(signal, null, 1));

// Rolling paid history product: last 30 daily screenings, ascending by date.
// Grows automatically with the daily chain; days before the service existed
// are honestly absent (the payload says so).
const HISTORY_OUT = join(here, "..", "src", "history.json");
const daily = [];
for (const f of files.slice(-30)) {
  const dd = JSON.parse(readFileSync(join(vcp2, f), "utf8"));
  daily.push({
    asof: dd.asof,
    counts: Object.fromEntries(Object.entries(dd.tiers).map(([k, v]) => [k, v.length])),
    tiers: Object.fromEntries(Object.entries(dd.tiers).map(([k, v]) => [k, v.map(slim)])),
  });
}
const history = {
  product: "VCP Signal API — daily screening history",
  window: daily.length ? `${daily[0].asof}..${daily[daily.length - 1].asof}` : "",
  n_days: daily.length,
  note: "Every day this service ran its screening is recorded here; days before the service launched are absent. Research data, not investment advice.",
  days: daily,
};
writeFileSync(HISTORY_OUT, JSON.stringify(history, null, 1));
console.log("wrote", out, "asof", signal.asof, "counts", JSON.stringify(signal.counts), "| history n_days", history.n_days);
