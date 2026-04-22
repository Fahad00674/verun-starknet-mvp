// GET /api/score/:agentId
// Reads the stored score for a given agent directly from the TrustScore
// Cairo contract on Starknet Sepolia.
//
// Returns 0 and timestamp 0 when no score has been recorded yet for that
// agent (the contract's default storage state).

import { RpcProvider, shortString } from 'starknet';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { agentId } = req.query;

    if (!agentId || typeof agentId !== 'string') {
        return res.status(400).json({ error: 'agentId is required in the path' });
    }
    if (agentId.length === 0 || agentId.length > 31) {
        return res.status(400).json({
            error: 'agentId must be 1–31 characters (felt252 limit)',
        });
    }

    const contractAddress = process.env.CONTRACT_ADDRESS;
    const rpcUrl = process.env.STARKNET_RPC_URL;
    if (!contractAddress || !rpcUrl) {
        return res.status(503).json({ error: 'Chain env not configured' });
    }

    try {
        const provider = new RpcProvider({ nodeUrl: rpcUrl });
        const agentIdFelt = shortString.encodeShortString(agentId);

        // Call TrustScore.get_score(agent_id) -> (u256, u64)
        // Result is [score_low, score_high, timestamp] as felt strings.
        // Pass blockIdentifier 'latest' explicitly — some RPCs reject 'pending'.
        const result = await provider.callContract(
            {
                contractAddress,
                entrypoint: 'get_score',
                calldata: [agentIdFelt],
            },
            'latest'
        );

        const scoreLow = BigInt(result[0] || 0);
        const scoreHigh = BigInt(result[1] || 0);
        const score = scoreLow + (scoreHigh << 128n);
        const timestamp = Number(BigInt(result[2] || 0));

        res.status(200).json({
            agentId,
            score: Number(score),
            timestamp,
            timestampISO:
                timestamp > 0 ? new Date(timestamp * 1000).toISOString() : null,
            recorded: timestamp > 0,
            contractAddress,
            network: 'Starknet Sepolia',
            explorer: `https://sepolia.voyager.online/contract/${contractAddress}`,
            readAt: new Date().toISOString(),
        });
    } catch (err) {
        console.error('get_score error:', err);
        res.status(500).json({
            error: err && err.message ? err.message : 'Chain read failed',
            agentId,
        });
    }
}
