import { SIGNER_ROOT_KEY_NAME } from '$env/signer.env';
import type { SignerMasterPubKeys } from '$lib/types/signer';

/**
 * Signer master public keys for different root keys and algorithm.
 *
 * These keys are used for the frontend derivation of the network addresses.
 *
 * {@link https://github.com/dfinity/portal/blob/master/docs/building-apps/network-features/signatures/t-ecdsa.mdx}
 * {@link https://github.com/dfinity/portal/blob/master/docs/building-apps/network-features/signatures/t-schnorr.mdx}
 *
 */
const SIGNER_MASTER_PUB_KEYS: SignerMasterPubKeys = {
	key_1: {
		ecdsa: {
			secp256k1: {
				pubkey: '02121bc3a5c38f38ca76487c72007ebbfd34bc6c4cb80a671655aa94585bbd0a02'
			}
		},
		schnorr: {
			ed25519: {
				pubkey: '476374d9df3a8af28d3164dc2422cff894482eadd1295290b6d9ad92b2eeaa5c'
			}
		}
	}
};

export const SIGNER_MASTER_PUB_KEY = SIGNER_MASTER_PUB_KEYS[SIGNER_ROOT_KEY_NAME];
