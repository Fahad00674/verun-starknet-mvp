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
        
        res.status(200).json(evaluation);
    } catch (error) {
        console.error('Score evaluation error:', error);
        res.status(500).json({ error: error.message });
    }
}
