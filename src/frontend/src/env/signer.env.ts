import { BETA, PROD, STAGING } from '$lib/constants/app.constants';

// According to:
// https://internetcomputer.org/docs/current/references/samples/rust/threshold-ecdsa/#deploying-the-canister-on-the-mainnet
// https://internetcomputer.org/docs/current/developer-docs/smart-contracts/signatures/signing-messages-t-schnorr#signing-messages
export const SIGNER_ROOT_KEY_NAME =
	PROD || BETA ? 'key_1' : STAGING ? 'test_key_1' : 'dfx_test_key';
