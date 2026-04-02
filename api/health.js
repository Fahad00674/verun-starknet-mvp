export default function handler(req, res) {
    res.status(200).json({
        status: 'healthy',
        service: 'Verun Starknet MVP',
        network: 'Sepolia Testnet',
        contract: process.env.CONTRACT_ADDRESS || 'Not deployed',
        timestamp: new Date().toISOString()
    });
}
