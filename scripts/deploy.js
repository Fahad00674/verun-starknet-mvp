import { Account, RpcProvider, json } from 'starknet';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ARTIFACTS = path.join(ROOT, 'src_cairo/target/dev');

// DRPC load-balances across backends — some lack certain methods.
// Retry on -32601 (method not found) which indicates a bad backend route.
const origFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
    for (let i = 0; i < 40; i++) {
        const resp = await origFetch(url, opts);
        const text = await resp.clone().text();
        const data = JSON.parse(text);
        if (data?.error?.code === -32601) {
            await new Promise(r => setTimeout(r, 500));
            continue;
        }
        return new Response(text, { status: resp.status, headers: resp.headers });
    }
    return origFetch(url, opts);
};

async function deploy() {
    console.log('🚀 Verun Starknet Deployment — Sepolia Testnet\n');

    const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL });
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
