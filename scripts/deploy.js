// NOTE: starknet.js captures global.fetch at import time. Because of this,
// any fetch wrapper we want it to use MUST be installed BEFORE the starknet
// import runs. We therefore import starknet via dynamic import (await import)
// after wiring the wrapper.

import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ARTIFACTS = path.join(ROOT, 'src_cairo/target/dev');

// Load .env from project root explicitly — don't rely on cwd.
dotenv.config({ path: path.join(ROOT, '.env') });

// Fail loudly if required env vars are missing.
const REQUIRED = ['STARKNET_PRIVATE_KEY', 'STARKNET_ACCOUNT_ADDRESS', 'STARKNET_RPC_URL'];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
    console.error('❌ Missing required env vars in .env:', missing.join(', '));
    console.error('   Check', path.join(ROOT, '.env'));
    process.exit(1);
}

// RPC compatibility shim:
//  1. Rewrite "block_id":"pending" → "latest". Some providers (Cartridge)
//     only accept "latest" or numeric block IDs on read calls, but
//     starknet.js v8 defaults to "pending" for getNonce.
//  2. Retry on -32601 (method not found) for load-balanced RPCs that
//     occasionally route to a backend missing a method.
const origFetch = globalThis.fetch;
const wrappedFetch = async (url, opts) => {
    if (opts && typeof opts.body === 'string') {
        opts = { ...opts, body: opts.body.replace(/"block_id"\s*:\s*"pending"/g, '"block_id":"latest"') };
    }
    for (let i = 0; i < 40; i++) {
        const resp = await origFetch(url, opts);
        const text = await resp.clone().text();
        let data;
        try { data = JSON.parse(text); } catch { return new Response(text, { status: resp.status, headers: resp.headers }); }
        if (data?.error?.code === -32601) {
            await new Promise(r => setTimeout(r, 500));
            continue;
        }
        return new Response(text, { status: resp.status, headers: resp.headers });
    }
    return origFetch(url, opts);
};
globalThis.fetch = wrappedFetch;
// starknet.js uses `typeof global !== "undefined" && global.fetch` in its
// fetchPonyfill, so set both refs.
global.fetch = wrappedFetch;

// NOW import starknet — it'll capture the wrapped fetch.
const { Account, RpcProvider, json } = await import('starknet');

async function deploy() {
    console.log('🚀 Verun Starknet Deployment — Sepolia Testnet\n');

    console.log('[DEBUG] env at deploy():', {
        RPC: process.env.STARKNET_RPC_URL,
        ADDR_prefix: process.env.STARKNET_ACCOUNT_ADDRESS?.slice(0, 10),
        KEY_prefix: process.env.STARKNET_PRIVATE_KEY?.slice(0, 6),
    });

    const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL });
    // starknet.js v8.9.x Account takes an options object: {provider, address, signer}.
    const account = new Account({
        provider,
        address: process.env.STARKNET_ACCOUNT_ADDRESS,
        signer: process.env.STARKNET_PRIVATE_KEY,
    });

    console.log('📍 Account:', process.env.STARKNET_ACCOUNT_ADDRESS);

    const trustSierra = json.parse(fs.readFileSync(path.join(ARTIFACTS, 'verun_contracts_TrustScore.contract_class.json'), 'utf8'));
    const trustCasm   = json.parse(fs.readFileSync(path.join(ARTIFACTS, 'verun_contracts_TrustScore.compiled_contract_class.json'), 'utf8'));
    const valSierra   = json.parse(fs.readFileSync(path.join(ARTIFACTS, 'verun_contracts_ValidatorRegistry.contract_class.json'), 'utf8'));
    const valCasm     = json.parse(fs.readFileSync(path.join(ARTIFACTS, 'verun_contracts_ValidatorRegistry.compiled_contract_class.json'), 'utf8'));

    console.log('\n📋 Declaring & deploying TrustScore...');
    const trustResult = await account.declareAndDeploy({
        contract: trustSierra,
        casm: trustCasm,
        constructorCalldata: [process.env.STARKNET_ACCOUNT_ADDRESS],
    });
    await provider.waitForTransaction(trustResult.deploy.transaction_hash);
    const trustAddress = trustResult.deploy.contract_address;
    console.log('✅ TrustScore:', trustAddress);
    console.log('   https://sepolia.starkscan.co/contract/' + trustAddress);

    console.log('\n📋 Declaring & deploying ValidatorRegistry...');
    const valResult = await account.declareAndDeploy({
        contract: valSierra,
        casm: valCasm,
        constructorCalldata: [process.env.STARKNET_ACCOUNT_ADDRESS],
    });
    await provider.waitForTransaction(valResult.deploy.transaction_hash);
    const valAddress = valResult.deploy.contract_address;
    console.log('✅ ValidatorRegistry:', valAddress);
    console.log('   https://sepolia.starkscan.co/contract/' + valAddress);

    // Update .env
    let env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    env = env
        .replace(/TRUST_SCORE_ADDRESS=.*/, `TRUST_SCORE_ADDRESS=${trustAddress}`)
        .replace(/VALIDATOR_REGISTRY_ADDRESS=.*/, `VALIDATOR_REGISTRY_ADDRESS=${valAddress}`)
        .replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${trustAddress}`);
    fs.writeFileSync(path.join(ROOT, '.env'), env);

    console.log('\n✅ .env updated');
    console.log('\n🎉 Done!\n');
    console.log('   TrustScore:        ', trustAddress);
    console.log('   ValidatorRegistry: ', valAddress);
    console.log('\n   Run: npm run dev');
}

deploy().catch(err => {
    console.error('\n❌ Failed:', err.message || err);
    process.exit(1);
});
