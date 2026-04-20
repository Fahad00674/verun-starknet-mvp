import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const validators = require('./validators.json');

export async function evaluateScore(agentId, score, operation) {
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
