// GET /api/validators
// Returns the current Verun validator set + on-chain registry reference.
//
// Note: the names/weights below mirror what the ValidatorRegistry contract
// is seeded with (tokenforge, weight 2) plus the two community slots used
// by the MVP consensus logic in /api/evaluate and /api/anchor.

const VALIDATOR_REGISTRY_ADDRESS =
  '0x7e1a6bd567f3e18f62ff36c88eea40f2c6fedf406b8cf999f2bdf01220ea7ac';

export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const validators = [
        {
            name: 'tokenforge',
            weight: 2,
            type: 'founding',
            active: true,
            description:
                'White-label Security Token platform; regulated EU institutions. ' +
                'Seeded in the ValidatorRegistry constructor at contract deploy time.',
        },
        {
            name: 'validator_2',
            weight: 1,
            type: 'community',
            active: true,
            description: 'Community validator slot.',
        },
        {
            name: 'validator_3',
            weight: 1,
            type: 'community',
            active: true,
            description: 'Community validator slot.',
        },
    ];

    const totalWeight = validators
        .filter(v => v.active)
        .reduce((sum, v) => sum + v.weight, 0);

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    res.status(200).json({
        network: 'Starknet Sepolia',
        contractAddress: VALIDATOR_REGISTRY_ADDRESS,
        explorer: `https://sepolia.voyager.online/contract/${VALIDATOR_REGISTRY_ADDRESS}`,
        consensusThreshold: '2 of 3',
        totalWeight,
        count: validators.length,
        validators,
        timestamp: new Date().toISOString(),
    });
}
