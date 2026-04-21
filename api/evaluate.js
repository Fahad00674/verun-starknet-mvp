import { Account, RpcProvider, CallData, cairo, shortString } from 'starknet';

const validators = [
  { name: "tokenforge", weight: 1, type: "founding" },
  { name: "validator_2", weight: 1, type: "community" },
  { name: "validator_3", weight: 1, type: "community" }
];

async function evaluateScore(agentId, score, operation) {
    const gates = {
        read: 300,
        transfer: 500,
        mint: 500,
        order: 600
    };

    const requiredScore = gates[operation] || 300;
    const meetsThreshold = score >= requiredScore;

    const validatorVotes = validators.map(v => ({
        validator: v.name,
        weight: v.weight,
        approved: Math.random() > 0.3
    }));

    const totalWeight = validatorVotes
        .filter(v => v.approved)
        .reduce((sum, v) => sum + v.weight, 0);

    const consensusReached = totalWeight >= 2;

    return {
        agentId,
        score,
        operation,
        requiredScore,
        meetsThreshold,
        validators: validatorVotes,
        consensusReached,
        approved: meetsThreshold && consensusReached,
        timestamp: new Date().toISOString()
    };
}

function isChainConfigured() {
    return !!(
        process.env.CONTRACT_ADDRESS &&
        process.env.STARKNET_PRIVATE_KEY &&
        process.env.STARKNET_ACCOUNT_ADDRESS &&
        process.env.STARKNET_RPC_URL
    );
}

// Reuse across warm invocations to avoid per-request RPC handshake.
let _account = null;
function getAccount() {
    if (_account) return _account;
    const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL });
    _account = new Account(
        provider,
        process.env.STARKNET_ACCOUNT_ADDRESS,
        process.env.STARKNET_PRIVATE_KEY
    );
    return _account;
}

async function anchorReal(agentId, score) {
    // felt252 holds at most 31 ASCII chars. If you need longer agent IDs,
    // switch to a Poseidon hash of the ID and store the full ID off-chain.
    if (typeof agentId !== 'string' || agentId.length === 0 || agentId.length > 31) {
        throw new Error('agentId must be a non-empty string ≤31 chars for felt252 encoding');
    }

    const account = getAccount();
    const timestamp = BigInt(Math.floor(Date.now() / 1000));

    // Submit tx but do NOT waitForTransaction — Vercel serverless has tight
    // timeouts and Starknet confirmations take 10-30s. Return the submitted
    // hash immediately; caller can poll Starkscan.
    const { transaction_hash } = await account.execute({
        contractAddress: process.env.CONTRACT_ADDRESS,
        entrypoint: 'record_score',
        calldata: CallData.compile({
            agent_id: shortString.encodeShortString(agentId),
            score: cairo.uint256(score),
            timestamp,
        }),
    });

    return {
        network: 'Starknet Sepolia',
        mode: 'live',
        contractAddress: process.env.CONTRACT_ADDRESS,
        transactionHash: transaction_hash,
        explorer: `https://sepolia.starkscan.co/tx/${transaction_hash}`,
        timestamp: new Date().toISOString()
    };
}

function anchorMock(agentId, score) {
    const mockTxHash = '0x' + Math.random().toString(16).substring(2, 66);
    return {
        network: 'Starknet Sepolia',
        mode: 'mock',
        contractAddress: process.env.CONTRACT_ADDRESS || 'Not deployed',
        transactionHash: mockTxHash,
        explorer: `https://sepolia.starkscan.co/tx/${mockTxHash}`,
        timestamp: new Date().toISOString()
    };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { agentId, score, operation } = req.body;

        if (!agentId || score === undefined || !operation) {
            return res.status(400).json({
                error: 'Missing required fields: agentId, score, operation'
            });
        }

        const evaluation = await evaluateScore(agentId, score, operation);

        if (evaluation.approved) {
            if (isChainConfigured()) {
                try {
                    evaluation.starknet = await anchorReal(agentId, score);
                } catch (err) {
                    console.error('Chain anchor failed, falling back to mock:', err);
                    evaluation.starknet = {
                        ...anchorMock(agentId, score),
                        anchorError: err.message
                    };
                }
            } else {
                evaluation.starknet = anchorMock(agentId, score);
            }
        }

        res.status(200).json(evaluation);
    } catch (error) {
        console.error('Evaluation error:', error);
        res.status(500).json({ error: error.message });
    }
}
