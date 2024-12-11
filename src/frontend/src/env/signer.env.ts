import type { SchnorrKeyId } from '$declarations/signer/signer.did';
import { BETA, PROD, STAGING } from '$lib/constants/app.constants';

// According to:
// https://internetcomputer.org/docs/current/references/samples/rust/threshold-ecdsa/#deploying-the-canister-on-the-mainnet
// https://internetcomputer.org/docs/current/developer-docs/smart-contracts/signatures/signing-messages-t-schnorr#signing-messages
const SIGNER_ROOT_KEY_NAME = PROD || BETA ? 'key_1' : STAGING ? 'test_key_1' : 'dfx_test_key';

export const SCHNORR_KEY_ID: SchnorrKeyId = {
	algorithm: { ed25519: null },
	name: SIGNER_ROOT_KEY_NAME
};
