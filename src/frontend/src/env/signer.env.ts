import { BETA, PROD, STAGING } from '$lib/constants/app.constants';

// According to:
// https://internetcomputer.org/docs/current/references/samples/rust/threshold-ecdsa/#deploying-the-canister-on-the-mainnet
// https://internetcomputer.org/docs/current/developer-docs/smart-contracts/signatures/signing-messages-t-schnorr#signing-messages
export const SIGNER_ROOT_KEY_NAME =
	PROD || BETA ? 'key_1' : STAGING ? 'test_key_1' : 'dfx_test_key';

export const SIGNER_CANISTER_DERIVATION_PATH: Iterable<number> | undefined =
	PROD || BETA
		? // As bytes '\00\00\00\00\02\30\00\71\01\01'
			[0, 0, 0, 0, 2, 48, 0, 113, 1, 1]
		: STAGING
			? // As bytes '\00\00\00\00\00\60\00\d1\01\01'
				[0, 0, 0, 0, 0, 96, 0, 209, 1, 1]
			: undefined;
