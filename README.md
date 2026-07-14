# x402-test-mcp

**Can your AI agent actually pay for things? Prove it in one tool call.**

An MCP server with a single tool, `test_agent_payment`, that makes a real
[x402](https://docs.x402.org) payment ($10 USDC on Base) to the
[Sycamore Agent Payment Test](https://test.sycamore-api.com) endpoint and returns an
Ed25519-signed diagnostic report card covering every step of the flow:

- HTTP 402 challenge handling
- Payment authorization (gasless EIP-3009 signature)
- Facilitator verification
- On-chain settlement proof (transaction hash)
- Latency and request-origin diagnostics

No signup, no API keys — just a funded wallet.

## Install

```jsonc
// Claude Desktop / any MCP client config
{
  "mcpServers": {
    "x402-test": {
      "command": "npx",
      "args": ["-y", "github:sansscott/x402-test-mcp"],
      "env": {
        "X402_PRIVATE_KEY": "0x..." // funded wallet (USDC on Base)
      }
    }
  }
}
```

Without `X402_PRIVATE_KEY` (or with `dry_run: true`) the tool fetches the free 402
challenge only — useful for checking that your client parses x402 payment requirements.

## Tool

### `test_agent_payment`

| Input | Type | Description |
|---|---|---|
| `dry_run` | boolean? | Fetch the 402 challenge without paying |
| `receipt_email` | string? | Email a signed receipt with the tx hash |

Returns the HTTP status, settlement object (tx hash, network, payer), and the full
signed report card. Verify the signature against
[`/pubkey`](https://test.sycamore-api.com/pubkey).

## Cost

$10.00 per paid call, settled in USDC on Base. The endpoint's 402 response
(`accepts[]`) is the source of truth for current price and network.

## Links

- Endpoint + docs: https://test.sycamore-api.com
- OpenAPI: https://test.sycamore-api.com/openapi.json
- Privacy / data retention: https://test.sycamore-api.com/privacy
