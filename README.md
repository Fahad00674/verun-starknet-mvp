# Verun Protocol — Starknet MVP

> Agent Trust Score Layer anchored on Starknet Sepolia.

An HTTP-accessible trust evaluation service for autonomous agents. Every approved
score is anchored on-chain via a Cairo `TrustScore` contract, producing a
tamper-evident audit trail of agent behaviour across platforms.

## Status

Live on Starknet Sepolia. Every `POST /api/evaluate` request that clears both
the score threshold and validator consensus submits a real `record_score`
transaction to the `TrustScore` contract.

## Live deployment

- **API**: https://verun-starknet-mvp.vercel.app
- **Network**: Starknet Sepolia testnet
- **TrustScore contract**: [`0x4d1f47e42dab62a3afde081aa544b9223f5017652db449dbf7c82728bed555c`](https://sepolia.voyager.online/contract/0x4d1f47e42dab62a3afde081aa544b9223f5017652db449dbf7c82728bed555c)
- **ValidatorRegistry contract**: [`0x7e1a6bd567f3e18f62ff36c88eea40f2c6fedf406b8cf999f2bdf01220ea7ac`](https://sepolia.voyager.online/contract/0x7e1a6bd567f3e18f62ff36c88eea40f2c6fedf406b8cf999f2bdf01220ea7ac)

## Try it

```bash
curl -s -X POST https://verun-starknet-mvp.vercel.app/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent-001","score":650,"operation":"transfer"}' | jq
```

A successful response includes a `starknet.transactionHash` — click the
`explorer` URL to watch the transaction mine on Voyager within ~30 seconds.

## Architecture

```
┌──────────┐  POST /api/evaluate   ┌──────────────────────┐
│  Client  │ ────────────────────▶ │  Vercel Serverless   │
└──────────┘                       │   evaluate.js         │
                                   │                       │
                                   │  1. Score vs gate     │
                                   │  2. Validator vote    │
                                   │  3. If approved →     │
                                   │     signed tx to      │
                                   │     TrustScore        │
                                   └──────────┬────────────┘
                                              │ starknet.js v8
                                              ▼
                                   ┌──────────────────────┐
                                   │   Starknet Sepolia    │
                                   │                       │
                                   │   TrustScore.cairo    │
                                   │   └ record_score()    │
                                   │                       │
                                   │   ValidatorRegistry   │
                                   │   └ add/remove/get    │
                                   └──────────────────────┘
```

## Trust gates

Operation → minimum score threshold:

| Operation | Required score |
|-----------|---------------:|
| `read`    | 300            |
| `transfer`| 500            |
| `mint`    | 500            |
| `order`   | 600            |

Default gate is 300 for any unrecognised operation.

## Validator consensus

Three validators per request: `tokenforge` (founding), `validator_2`, `validator_3`
(community). A request is approved only when at least 2 of 3 validators vote
approve **and** the score meets the operation's gate. Current implementation
seeds validators in the `ValidatorRegistry` contract on deployment.

## API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Service status, network info |
| `/api/score` | POST | Score evaluation only — no chain write |
| `/api/evaluate` | POST | Full evaluation + on-chain anchor when approved |

Request body for `/api/evaluate` and `/api/score`:

```json
{
  "agentId": "string (≤31 chars for felt252 encoding)",
  "score": 0,
  "operation": "read | transfer | mint | order"
}
```

## Smart contracts

Source: [`src_cairo/src/`](./src_cairo/src/).

- **`trust_score.cairo`** — owner-only `record_score(agent_id, score, timestamp)`
  entrypoint, emits `ScoreRecorded` event. Reader view: `get_score(agent_id) → (score, timestamp)`.
- **`validator_registry.cairo`** — owner-managed registry of named validators
  with weights and active flags. Seeds `tokenforge` (weight 2, founding) in the
  constructor.

## Local setup

```bash
git clone https://github.com/Fahad00674/verun-starknet-mvp.git
cd verun-starknet-mvp
npm install
cp .env.example .env
# Fill in STARKNET_PRIVATE_KEY, STARKNET_ACCOUNT_ADDRESS, STARKNET_RPC_URL
```

### Compile and deploy contracts

Requires [Scarb](https://docs.swmansion.com/scarb/) ≥ 2.8:

```bash
cd src_cairo && scarb build && cd ..
node scripts/deploy.js
```

The deploy script declares + deploys both contracts and writes the resulting
addresses back into `.env`.

### Run the API locally

```bash
npm run dev
```

Listens on the `PORT` in `.env` (default 3010).

## Operational notes

- **Fire-and-forget chain writes.** The API submits the `record_score` tx and
  returns the hash immediately — it does not wait for confirmation. Clients
  poll the returned `explorer` URL to see when the tx lands.
- **Graceful fallback.** If Starknet env vars are missing or the chain call
  fails, the endpoint returns a response with `starknet.mode = "mock"` instead
  of 5xx-ing. This keeps the API demo-able during infrastructure incidents.
- **felt252 agent IDs.** The Cairo contract stores `agent_id` as a `felt252`,
  which caps ASCII IDs at 31 characters. Longer IDs should be Poseidon-hashed
  off-chain before submission.

## Repository layout

```
verun-starknet-mvp/
├── api/                  Vercel serverless functions
│   ├── evaluate.js       Full evaluation + on-chain anchor
│   ├── score.js          Score evaluation only (no chain write)
│   └── health.js         Service status
├── contracts/            Cairo source (mirror of src_cairo/src/)
├── scripts/
│   └── deploy.js         Declare + deploy both contracts
├── src_cairo/            Scarb project
│   ├── Scarb.toml
│   └── src/
│       ├── lib.cairo
│       ├── trust_score.cairo
│       └── validator_registry.cairo
├── index.html            Landing page / demo animation
├── package.json
└── vercel.json
```

## License

MIT. Built by Fahad — BCP Partners GmbH.
