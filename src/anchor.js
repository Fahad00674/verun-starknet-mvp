import { Account, RpcProvider, shortString, CallData } from 'starknet';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DRPC load-balances across backends — some lack certain methods.
// Mock block queries (used for tip calculation) and retry on -32601.
const MOCK_BLOCK = {
    block_hash: '0x1', block_number: 1, new_root: '0x0', parent_hash: '0x0',
    sequencer_address: '0x1', starknet_version: '0.14.0', status: 'ACCEPTED_ON_L2',
    timestamp: 1700000000, transactions: [],
    l1_gas_price:      { price_in_fri: '0x3c50e02a5b27', price_in_wei: '0x3c8d25d0' },
    l1_data_gas_price: { price_in_fri: '0x1e5481245',    price_in_wei: '0x1e72d'    },
    l2_gas_price:      { price_in_fri: '0x1dcd65000',    price_in_wei: '0x1deb2'    },
    l1_da_mode: 'BLOB',
};

async function reliableFetch(url, opts) {
    try {
        const body = JSON.parse(opts?.body || '{}');
        const m = body.method || '';
        if (m.includes('BlockWith') || m === 'starknet_getBlockWithTxs' || m === 'starknet_getBlockWithTxHashes') {
            return new Response(
                JSON.stringify({ jsonrpc: '2.0', id: body.id, result: MOCK_BLOCK }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }
    } catch {}
    // Retry on -32601 (bad DRPC backend route)
    for (let i = 0; i < 40; i++) {
        const r = await fetch(url, opts);
        const t = await r.clone().text();
        if (JSON.parse(t)?.error?.code === -32601) {
            await new Promise(res => setTimeout(res, 400));
            continue;
        }
        return new Response(t, { status: r.status, headers: r.headers });
    }
    return fetch(url, opts);
}

function makeProvider() {
    return new RpcProvider({
        nodeUrl: process.env.STARKNET_RPC_URL,
        fetch: reliableFetch,
    });
}

function makeAccount(provider) {
    return new Account({
        provider,
        address: process.env.STARKNET_ACCOUNT_ADDRESS,
        signer:  process.env.STARKNET_PRIVATE_KEY,
    });
}

export async function anchorToStarknet(agentId, score) {
    const contractAddress = process.env.TRUST_SCORE_ADDRESS || process.env.CONTRACT_ADDRESS;
    if (!contractAddress || contractAddress.length < 10) {
        throw new Error('TRUST_SCORE_ADDRESS not set — run npm run deploy first');
    }

    const provider = makeProvider();
    const account  = makeAccount(provider);

    const agentFelt = shortString.encodeShortString(agentId.slice(0, 31));
    const scoreHex  = '0x' + Math.round(score).toString(16);
    const timestamp = '0x' + Math.floor(Date.now() / 1000).toString(16);

    console.log('⛓️  Anchoring to Starknet Sepolia:', { agentId, score, contractAddress });

    const { transaction_hash } = await account.execute({
        contractAddress,
        entrypoint: 'record_score',
        calldata: CallData.compile([agentFelt, scoreHex, '0x0', timestamp]),
    });

    await provider.waitForTransaction(transaction_hash);
    console.log('✅ Anchored:', transaction_hash);

    return {
        network:          'Starknet Sepolia',
        contractAddress,
        transactionHash:  transaction_hash,
        explorer:         `https://sepolia.starkscan.co/tx/${transaction_hash}`,
        timestamp:        new Date().toISOString(),
    };
}

export async function readScore(agentId) {
    const contractAddress = process.env.TRUST_SCORE_ADDRESS || process.env.CONTRACT_ADDRESS;
    if (!contractAddress || contractAddress.length < 10) return null;

    const provider = makeProvider();
    const agentFelt = shortString.encodeShortString(agentId.slice(0, 31));

    const result = await provider.callContract({
        contractAddress,
        entrypoint: 'get_score',
        calldata: [agentFelt],
    });

    return {
        agentId,
        score:      parseInt(result[0], 16),
        timestamp:  parseInt(result[2] ?? result[1], 16),
        recordedAt: new Date(parseInt(result[2] ?? result[1], 16) * 1000).toISOString(),
    };
}
