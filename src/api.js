import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { evaluateScore } from './evaluate.js';
import { anchorToStarknet, readScore } from './anchor.js';

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
        console.error('Score error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Anchor endpoint (score + Starknet anchor)
app.post('/api/anchor', async (req, res) => {
    try {
        const { agentId, score, operation } = req.body;

        if (!agentId || score === undefined || !operation) {
            return res.status(400).json({
                error: 'Missing required fields: agentId, score, operation'
            });
        }

        const evaluation = await evaluateScore(agentId, score, operation);

        if (evaluation.approved) {
            const anchor = await anchorToStarknet(agentId, score, evaluation);
            evaluation.starknet = anchor;
        }

        res.json(evaluation);
    } catch (error) {
        console.error('Anchor error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Read on-chain score for an agent
app.get('/api/score/:agentId', async (req, res) => {
    try {
        const result = await readScore(req.params.agentId);
        if (!result) return res.status(503).json({ error: 'Contract not deployed yet' });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Verun API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Network: Starknet Sepolia Testnet`);
    console.log(`   Contract: ${process.env.CONTRACT_ADDRESS || 'Not deployed'}`);
});
