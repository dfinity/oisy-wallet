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
	},
	test_key_1: {
		ecdsa: {
			secp256k1: {
				pubkey: '02f9ac345f6be6db51e1c5612cddb59e72c3d0d493c994d12035cf13257e3b1fa7'
			}
		},
		schnorr: {
			ed25519: {
				pubkey: '6c0824beb37621bcca6eecc237ed1bc4e64c9c59dcb85344aa7f9cc8278ee31f'
			}
		}
	}
};

export const SIGNER_MASTER_PUB_KEY = SIGNER_MASTER_PUB_KEYS[SIGNER_ROOT_KEY_NAME];
