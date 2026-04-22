# Verun Protocol — Starknet Foundation Seed Grant Application

**Agent Trust Score Layer for Autonomous Agentic Finance**

---

## 1. Executive summary

Verun is an **Agent Trust Score Layer** anchored on Starknet. It addresses a gap that will only widen as AI agents begin to transact autonomously with real money: there is no shared, verifiable trust infrastructure for agent behaviour across platforms.

We have built a working MVP on Starknet Sepolia — two Cairo contracts deployed, a live HTTP API that signs real on-chain attestations for every approved evaluation, a 2-of-3 validator consensus model, and an open-source reference integration targeting tokenforge's regulated Chain API for EU security-token issuance.

This Seed Grant application requests **up to $25,000 in STRK** to harden the MVP into an auditable, partner-ready foundation — not a full production rollout. The deliverables are concrete, measurable, and leave Starknet with a reusable trust primitive for the agentic-finance wave.

- **Live demo:** https://verun-starknet-mvp.vercel.app
- **Docs:** https://verun-starknet-mvp.vercel.app/docs
- **Source:** https://github.com/Fahad00674/verun-starknet-mvp (MIT)
- **Network:** Starknet Sepolia
- **Status:** Early-stage MVP · proof of concept ✓

---

## 2. Problem

AI agents are moving from chat to action. Claude-family models, custom agents, and multi-agent frameworks are increasingly initiating real transactions — investing, transferring, minting, placing orders — on behalf of humans and institutions.

The existing infrastructure was not designed for this. Three gaps:

1. **No shared trust layer.** Every platform evaluates agents from scratch. An agent that proved itself on Platform A re-starts from zero on Platform B.
2. **No verifiable audit trail.** Autonomous decisions happen in logs that can be edited, rotated, or lost. Regulators, counterparties, and post-incident investigators have no tamper-evident record.
3. **No standard human-gate.** Moving from supervised to autonomous mode today is bespoke per platform. There is no shared primitive for "this agent has been approved by a human for this class of action, within these bounds."

These gaps compound as agent activity scales. Without trust infrastructure, either platforms reject agent traffic (slowing adoption) or they accept it blindly (creating systemic risk).

---

## 3. Solution

Verun provides three primitives:

1. **A trust score** — bidirectional reputation for agents and platforms, updated via validator consensus.
2. **2-of-3 validator consensus** — material actions require approval from at least two of three independent validators.
3. **On-chain anchoring** — every approved evaluation is written to a Cairo contract on Starknet, producing a tamper-evident audit trail.

Operations are gated by score threshold: `read` (300+), `mint`/`transfer` (500+), `order` (600+). Agents accumulate trust through successful, validator-approved interactions over time.

---

## 4. Why Starknet

Verun is an agent-scale trust-anchoring layer. Three requirements drive the chain choice:

| Requirement | Why Starknet fits |
|---|---|
| **Low per-tx cost** | Agent evaluations may run thousands of times per day per integration. Mainnet Ethereum gas makes that unworkable; Starknet makes it practical. |
| **Provable computation** | Cairo's STARK-based execution aligns with the use case: verifiable trust mechanics, not just verifiable state. |
| **Maturing ecosystem** | Voyager, Starknet.js v8, ArgentX, institutional partners like Argent, Nethermind — a credible set of production-grade tooling. |

Verun positions Starknet as **the chain for verifiable agent transactions**. As agentic finance grows, the ecosystem benefits from hosting the trust layer natively: more validators, more integrations, more sustained on-chain activity tied to real-world agent use cases.

---

## 5. What is live today

Every item below is verifiable on-chain or on GitHub — no aspirational claims.

**Deployed on Starknet Sepolia:**
- `TrustScore` contract — [`0x4d1f…555c`](https://sepolia.voyager.online/contract/0x4d1f47e42dab62a3afde081aa544b9223f5017652db449dbf7c82728bed555c)
- `ValidatorRegistry` contract — [`0x7e1a…a7ac`](https://sepolia.voyager.online/contract/0x7e1a6bd567f3e18f62ff36c88eea40f2c6fedf406b8cf999f2bdf01220ea7ac)

**Live API:**
- `POST /api/evaluate` signs a real `record_score` transaction on approval — returns the actual Starknet tx hash, viewable on Voyager
- Nonce-retry logic handles parallel requests under load
- Graceful mock-fallback if chain env is unavailable

**Open source:**
- MIT-licensed repo
- Full docs site at `/docs` — contracts, API reference, integration pattern for tokenforge

**Validator network (design + seed):**
- Three-slot model: tokenforge (founding) + BCP Partners (genesis) + open institutional slot
- `tokenforge` hard-coded in the `ValidatorRegistry` constructor

---

## 6. Team

A six-person team combining institutional finance, regulated tokenisation, and applied-AI engineering.

| Name | Role | Background |
|---|---|---|
| **Rafael Schultz** | Managing Partner | DASH Dao · Elavon (US Bank) · EVO Payments (Deutsche Bank) · venture building, tokenisation |
| **Jan Hodok** | Partner | British American Tobacco · Belendorf AG · public relations, strategy |
| **Robert Pietzka** | Partner | CACEIS · JP Morgan Bank · regulation, ETF structuring |
| **Carina Couillard** | Marketing | UNICX Network · HANDL Pay · marketing, DeFi |
| **Christoph Iwaniez** | Advisor | Forge Europe · Nuri · Bitvala · GIZS · startup & VC fund advisor |
| **Fahad Farooq** | Project Assistant Manager | BCP Labs · tech analysis, web development |

**Parent entity:** BCP Partners GmbH, Berlin, Germany. Registered — HRB 987654 · VAT DE400357691.

The team has shipped regulated products across payments, banking integrations, and tokenised securities. We bring institutional discipline to a category (agent trust) that is otherwise dominated by ad-hoc solutions.

---

## 7. Grant scope

This grant funds four focused workstreams. The explicit goal is **a solid, auditable foundation** — not a full production launch. We scale after the foundation is verified.

### 7.1 Core engineering hardening
- Deterministic error handling across all API paths
- Full input validation (agent IDs, score bounds, operation enum)
- CI pipeline with unit + integration tests
- Load-tested nonce management for parallel requests

### 7.2 On-chain reliability
- Stable `score → anchor → readback` end-to-end pipeline with replayable tests
- Transaction-proof logging (tx hash → block confirmation → event emission, end-to-end verified)
- Benchmarks against controlled-run workloads on Sepolia

### 7.3 Integration readiness
- Integration documentation (beyond current `/docs`) with concrete code snippets
- Quickstart kit for partners and prospective validators
- Reference JavaScript/TypeScript helper for the `/api/evaluate` → Starknet flow

### 7.4 Security & ops baseline
- Environment & secret hygiene (key rotation workflow, scoped deploy keys)
- Request-level rate limiting and authentication boundary
- Basic monitoring: uptime, tx-success rate, error classification

---

## 8. Milestones & deliverables

Four milestones, each with concrete verifiable outputs.

| # | Milestone | Deliverable | Proof |
|---|---|---|---|
| **M1** | Engineering foundation | Test suite + CI; hardened evaluate endpoint | Green CI badge on GitHub; coverage report |
| **M2** | On-chain reliability | Replayable E2E benchmark; tx-proof logger | Benchmark report with Voyager tx links |
| **M3** | Integration kit | Partner quickstart + reference helper lib | Public npm package + live demo repo |
| **M4** | Ops baseline + report | Monitoring dashboard + final milestone report | Dashboard URL + report PDF |

Target delivery: **three months** from grant disbursement. Each milestone produces an artefact the Starknet Foundation (or any reviewer) can independently verify.

---

## 9. Budget — $25,000 (in STRK)

Milestone-linked disbursement ensures accountability at every step.

| Workstream | Allocation | Notes |
|---|---|---|
| Core engineering hardening | $8,000 | Testing, CI, API robustness |
| On-chain reliability | $6,000 | Replayable scripts, benchmarks, logging |
| Integration readiness | $5,000 | Docs, quickstart, helper lib |
| Security & ops baseline | $4,000 | Secret management, monitoring, rate limiting |
| Buffer / audit prep | $2,000 | External code review, misc tooling |
| **Total** | **$25,000** | |

All amounts paid in STRK, disbursed across milestone completions (M1: 30%, M2: 25%, M3: 25%, M4: 20%).

---

## 10. KPIs

Measurable, bounded, non-vanity:

- **Reliability**: ≥ 99% success rate on 1,000 controlled `/api/evaluate` → anchor runs
- **Latency**: p95 response ≤ 3 seconds for approved evaluations (tx-hash-returned, not confirmation-waited)
- **Coverage**: ≥ 80% test coverage on `/api/evaluate.js` + contract logic
- **Partner readiness**: At least one external developer completes the quickstart end-to-end during the grant period (documented)
- **Audit trail**: 100% of approved evaluations have a Voyager-verifiable tx hash in the API response

---

## 11. Ecosystem impact for Starknet

Verun brings three categories of benefit to the Starknet ecosystem:

1. **Sustained on-chain activity.** Every approved agent evaluation is a real Starknet transaction. Even modest agent traffic at scale generates meaningful block activity on a recurring basis.
2. **A reusable trust primitive.** Any Starknet-native agent or dApp builder can call Verun to gate actions, without rolling their own scoring. This lowers the bar for agent-integrated products on Starknet.
3. **Institutional on-ramp.** The team brings regulated-finance partners (tokenforge for STO issuance, BCP Partners for advisory) that are specifically attracted to Starknet's provable compute and compliance-friendly properties. The grant accelerates bringing these institutional use cases on-chain.

---

## 12. After the grant

This $25K Seed Grant is a foundation, not a finish line. After verified delivery of the four milestones, the natural next phase — for which we would pursue a follow-on Growth Grant or institutional funding — includes:

- Independent security audit of Cairo contracts
- Institutional validator onboarding (European banks, custodians, compliance partners)
- KYC/AML signal integration (Chainalysis / Elliptic / TRM)
- Production operations and SLAs
- Mainnet beta

**Principle:** start small, prove quickly, then scale responsibly.

---

## 13. Contact

- **Website:** https://verun-starknet-mvp.vercel.app
- **Docs:** https://verun-starknet-mvp.vercel.app/docs
- **Impressum:** https://verun-starknet-mvp.vercel.app/impressum
- **GitHub:** https://github.com/Fahad00674/verun-starknet-mvp
- **Primary contact:** Rafael Schultz, Managing Partner, BCP Partners GmbH — via [bcpp.io/contact-us](https://www.bcpp.io/contact-us)
- **Project lead:** Fahad Farooq — `fahad@bcpp.io`

---

*Verun Protocol · Built by BCP Partners GmbH · © 2026 · MIT Licensed · Starknet Sepolia Testnet*
