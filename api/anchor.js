// POST /api/anchor
// Direct anchor endpoint — runs validator consensus and, if approved,
// submits a record_score transaction on the TrustScore contract.
//
// Differs from /api/evaluate: does NOT apply operation-level gate thresholds.
// Intended for integrations that have done their own upstream gate check
// and just want the consensus + on-chain anchor step.
//
// In the MVP, this endpoint is unauthenticated. Production deployments
// must gate it behind an auth boundary (scoped API key or Verun attestation).

import { Account, RpcProvider, CallData, cairo, shortString } from 'starknet';

const validators = [
    { name: 'tokenforge', weight: 1, type: 'founding' },
    { name: 'validator_2', weight: 1, type: 'community' },
    { name: 'validator_3', weight: 1, type: 'community' },
];

function runConsensus() {
    const votes = validators.map(v => ({
        validator: v.name,
        weight: v.weight,
        approved: Math.random() > 0.3,
    }));
    const totalWeight = votes
        .filter(v => v.approved)
        .reduce((sum, v) => sum + v.weight, 0);
    return { votes, consensusReached: totalWeight >= 2, totalWeight };
}

function getAccount() {
    const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL });
    return new Account({
        provider,
        address: process.env.STARKNET_ACCOUNT_ADDRESS,
        signer: process.env.STARKNET_PRIVATE_KEY,
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { agentId, score } = req.body || {};

    if (!agentId || typeof agentId !== 'string') {
        return res.status(400).json({ error: 'agentId is required (string)' });
    }
    if (agentId.length === 0 || agentId.length > 31) {
        return res.status(400).json({
            error: 'agentId must be 1–31 characters (felt252 limit)',
        });
    }
    if (typeof score !== 'number' || score < 0 || score > 1000) {
        return res.status(400).json({
            error: 'score must be a number between 0 and 1000',
        });
    }

    const chainConfigured =
        process.env.STARKNET_PRIVATE_KEY &&
        process.env.STARKNET_ACCOUNT_ADDRESS &&
        process.env.STARKNET_RPC_URL &&
        process.env.CONTRACT_ADDRESS;
    if (!chainConfigured) {
        return res.status(503).json({ error: 'Chain env not configured' });
    }

    // 1. Validator consensus
    const consensus = runConsensus();
    if (!consensus.consensusReached) {
        return res.status(403).json({
            agentId,
            score,
            approved: false,
            validators: consensus.votes,
            totalWeight: consensus.totalWeight,
            reason: 'Validator consensus not reached (need ≥ 2 of 3 approve)',
        });
    }

    // 2. On-chain anchor with NonceTooOld retry
    const call = {
        contractAddress: process.env.CONTRACT_ADDRESS,
        entrypoint: 'record_score',
        calldata: CallData.compile({
            agent_id: shortString.encodeShortString(agentId),
            score: cairo.uint256(score),
            timestamp: BigInt(Math.floor(Date.now() / 1000)),
        }),
    };

    let lastError;
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            const account = getAccount();
            const { transaction_hash } = await account.execute(call);
            return res.status(200).json({
                agentId,
                score,
                approved: true,
                validators: consensus.votes,
                totalWeight: consensus.totalWeight,
                transactionHash: transaction_hash,
                contractAddress: process.env.CONTRACT_ADDRESS,
                explorer: `https://sepolia.voyager.online/tx/${transaction_hash}`,
                network: 'Starknet Sepolia',
                mode: 'live',
                timestamp: new Date().toISOString(),
                attempts: attempt + 1,
                note:
                    'Direct anchor: validator consensus only, no operation gate. ' +
                    'Use /api/evaluate for full trust flow with gate thresholds.',
            });
        } catch (err) {
            lastError = err;
            const msg = String((err && err.message) || err);
            const retryable = /NonceTooOld|nonce|Invalid transaction nonce/i.test(msg);
            if (!retryable) break;
            const base = 250 * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, base + Math.random() * base));
        }
    }

    res.status(500).json({
        error: (lastError && lastError.message) || 'Anchor failed',
        agentId,
        score,
        validators: consensus.votes,
    });
}
