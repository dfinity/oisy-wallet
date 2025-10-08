import { SIGNER_ROOT_KEY_NAME } from '$env/signer.env';
import type { SignerMasterPubKeys } from '$lib/types/signer';

/**
 * Signer master public keys for different environments.
 *
 * Refer to:
 * - https://github.com/dfinity/portal/blob/master/docs/building-apps/network-features/signatures/t-ecdsa.mdx
 * - https://github.com/dfinity/portal/blob/master/docs/building-apps/network-features/signatures/t-schnorr.mdx
 *
 */
const SIGNER_MASTER_PUB_KEYS: SignerMasterPubKeys = {
	key_1: {
		ecdsa: {
			secp256k1: {
				pubkey: '0259761672ec7ee3bdc5eca95ba5f6a493d1133b86a76163b68af30c06fe3b75c0'
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

console.log('Using SIGNER_MASTER_PUB_KEY:', SIGNER_MASTER_PUB_KEY);
