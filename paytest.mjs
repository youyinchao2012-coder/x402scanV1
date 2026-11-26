// x402 v2 payment-link smoke test against a running worker.
// Signs an EIP-3009 transferWithAuthorization with a random key that holds no
// USDC, so the facilitator must answer 402 (invalid signature / insufficient
// funds) — proving the quote -> sign -> PAYMENT-SIGNATURE -> facilitator
// verify chain works end to end. Testnet only; no real money moves.
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const acct = privateKeyToAccount("0x" + "11".repeat(32)); // random funded-less key

// get 402 quote (v2: Payment-Required header, base64 JSON)
const BASE = process.env.BASE || "http://localhost:8787";
const r0 = await fetch(BASE + "/signal/latest");
const prHeader =
  r0.headers.get("payment-required") || r0.headers.get("Payment-Required");
if (!prHeader) {
  console.error("no payment-required header; status:", r0.status);
  console.error(await r0.text());
  process.exit(1);
}
const q = JSON.parse(Buffer.from(prHeader, "base64").toString("utf8"));
const acc = q.accepts.find((a) => a.network === "eip155:84532") ?? q.accepts[0];
const usdc = acc.asset;
const payTo = acc.payTo;

const now = Math.floor(Date.now() / 1000);
const authorization = {
  from: acct.address,
  to: payTo,
  value: acc.amount, // atomic units; e.g. "10000" = 0.01 USDC
  validAfter: String(now - 60),
  validBefore: String(now + 3600),
  nonce: "0x" + "22".repeat(32),
};
const sig = await acct.signTypedData({
  domain: { name: "USD Coin", version: "2", chainId: 84532, verifyingContract: usdc },
  types: {
    TransferWithAuthorization: [
      { name: "from", type: "address" }, { name: "to", type: "address" },
      { name: "value", type: "uint256" }, { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" },
    ],
  },
  primaryType: "TransferWithAuthorization",
  message: {
    ...authorization,
    value: BigInt(authorization.value),
    validAfter: BigInt(authorization.validAfter),
    validBefore: BigInt(authorization.validBefore),
  },
});
// v2 payload: the buyer echoes the chosen requirement as `accepted`.
const payment = {
  x402Version: 2,
  accepted: acc,
  payload: { signature: sig, authorization },
};
const r1 = await fetch(BASE + "/signal/latest", {
  headers: { "PAYMENT-SIGNATURE": Buffer.from(JSON.stringify(payment)).toString("base64") },
});
console.log("status:", r1.status);
console.log((await r1.text()).slice(0, 500));
