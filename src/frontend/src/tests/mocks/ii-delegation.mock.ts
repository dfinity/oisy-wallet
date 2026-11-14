import { mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import type { DerEncodedPublicKey, Signature } from '@icp-sdk/core/agent';
import { Delegation, DelegationChain, DelegationIdentity } from '@icp-sdk/core/identity';

export const mockIIDelegationChain = toNullable({
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
});

// The identity `mockIIDelegationChain` is extracted from, for code that reads the chain itself.
export const mockIIDelegationIdentity = DelegationIdentity.fromDelegation(
	{ sign: vi.fn() },
	DelegationChain.fromDelegations(
		[
			{
				delegation: new Delegation(Uint8Array.from([10, 11, 12]), 1000n, [mockPrincipal]),
				signature: Uint8Array.from([7, 8, 9]) as Signature
			}
		],
		Uint8Array.from([4, 5, 6]) as DerEncodedPublicKey
	)
);
