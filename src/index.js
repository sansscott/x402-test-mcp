#!/usr/bin/env node
// x402-test-mcp — MCP server exposing one tool: test_agent_payment.
// Pays $1 (USDC via the x402 protocol) to the Sycamore Agent Payment Test
// endpoint and returns the signed diagnostic report card, so you can verify
// your agent's payment stack works end to end.
//
// Config (env):
//   X402_PRIVATE_KEY  — hex private key of the paying EVM wallet (required to pay)
//   X402_TEST_URL     — endpoint override (default https://test.sycamore-api.com/api/verify)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const ENDPOINT = process.env.X402_TEST_URL || "https://test.sycamore-api.com/api/verify";

const server = new McpServer({ name: "x402-test", version: "1.0.0" });

server.registerTool(
  "test_agent_payment",
  {
    title: "Test agent payment (x402, $1)",
    description:
      "Verify this agent can make real x402 payments. Makes a paid request ($1 USDC) to the " +
      "Sycamore Agent Payment Test endpoint and returns a signed diagnostic report card: " +
      "402 handling, payment authorization, facilitator verification, on-chain settlement " +
      "proof, latency, and origin. Requires X402_PRIVATE_KEY (funded wallet). " +
      "Set dry_run=true to only fetch the 402 payment requirements without paying.",
    inputSchema: {
      dry_run: z
        .boolean()
        .optional()
        .describe("If true, only fetch the 402 challenge (free) — do not pay."),
      receipt_email: z
        .string()
        .optional()
        .describe("Optional email address to receive the signed receipt."),
    },
  },
  async ({ dry_run, receipt_email }) => {
    const url = receipt_email
      ? `${ENDPOINT}?receipt_email=${encodeURIComponent(receipt_email)}`
      : ENDPOINT;

    if (dry_run || !process.env.X402_PRIVATE_KEY) {
      const res = await fetch(ENDPOINT);
      const body = await res.json().catch(() => ({}));
      const note = process.env.X402_PRIVATE_KEY
        ? "Dry run: 402 challenge fetched, no payment made."
        : "X402_PRIVATE_KEY not set — returning the free 402 challenge only. Set it to a funded wallet to run the paid test.";
      return {
        content: [
          { type: "text", text: `${note}\nHTTP ${res.status}\n${JSON.stringify(body, null, 2)}` },
        ],
      };
    }

    const [{ wrapFetchWithPayment }, { x402Client }, { registerExactEvmScheme }, { privateKeyToAccount }] =
      await Promise.all([
        import("@x402/fetch"),
        import("@x402/core/client"),
        import("@x402/evm/exact/client"),
        import("viem/accounts"),
      ]);

    const account = privateKeyToAccount(process.env.X402_PRIVATE_KEY);
    const client = new x402Client();
    registerExactEvmScheme(client, { signer: account });
    const paidFetch = wrapFetchWithPayment(fetch, client);

    const res = await paidFetch(url);
    const report = await res.json().catch(() => ({}));
    const settlementHeader =
      res.headers.get("x-payment-response") || res.headers.get("payment-response");
    const settlement = settlementHeader
      ? JSON.parse(Buffer.from(settlementHeader, "base64").toString("utf8"))
      : null;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { http_status: res.status, payer: account.address, settlement, report },
            null,
            2,
          ),
        },
      ],
      isError: res.status !== 200,
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
