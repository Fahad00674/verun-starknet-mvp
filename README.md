# Verun Protocol - Starknet MVP

> Agent Trust Score Layer on Starknet Sepolia Testnet

## Architecture

- **Starknet**: Trust score anchoring layer (Cairo smart contracts)
- **API**: Node.js + Express evaluation engine
- **Validators**: 2-of-3 consensus mechanism

## Setup

1. Clone and install:
```bash
git clone https://github.com/Fahad00674/verun-starknet-mvp.git
cd verun-starknet-mvp
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Add your Starknet wallet details
```

3. Deploy contract (optional):
```bash
npm run deploy
```

4. Run locally:
```bash
npm run dev
```

## API Endpoints

- `GET /api/health` - Service status
- `POST /api/score` - Score evaluation only
- `POST /api/evaluate` - Full evaluation + Starknet anchor

## Live Demo

🚀 https://verun-starknet-mvp.vercel.app

---

Built by Fahad · BCP Partners GmbH
