import { mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';

export const mockIIDelegationChain=toNullable({
			public_key: Uint8Array.from([4, 5, 6]),
			delegations: [
				{
					signature: Uint8Array.from([7, 8, 9]),
					delegation: {
						pubkey: Uint8Array.from([10, 11, 12]),
						targets: toNullable([mockPrincipal]),
						expiration: 1000n
					}
				}
			]
		})
