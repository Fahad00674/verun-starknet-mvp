import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { evaluateScore } from './evaluate.js';
import { anchorToStarknet } from './anchor.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Verun Starknet MVP',
        network: 'Sepolia Testnet',
        contract: process.env.CONTRACT_ADDRESS || 'Not deployed',
        timestamp: new Date().toISOString()
    });
});

// Score evaluation endpoint (no blockchain anchor)
app.post('/api/score', async (req, res) => {
    try {
        const { agentId, score, operation } = req.body;
        
        if (!agentId || score === undefined || !operation) {
            return res.status(400).json({ 
                error: 'Missing required fields: agentId, score, operation' 
            });
        }

        const evaluation = await evaluateScore(agentId, score, operation);
        
        res.json(evaluation);
    } catch (error) {
cat > src/evaluate.js << 'EOF'
import validators from './validators.json' assert { type: 'json' };

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
