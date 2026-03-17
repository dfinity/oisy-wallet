import type { IIDelegationChain } from '$declarations/backend/backend.did';
import { toNullable } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { DelegationIdentity } from '@icp-sdk/core/identity';

/**
 * Extracts the public II delegation chain from an Identity, if it is a DelegationIdentity.
 *
 * Only the public data is extracted (public keys, expiration, targets, signatures).
 * The private session key is never included.
 *
 * @returns The delegation chain in Candid-compatible format, or undefined if the identity
 *          is not a DelegationIdentity.
 */
export const extractIIDelegationChain = (identity: Identity): [] | [IIDelegationChain] => {
	if (!(identity instanceof DelegationIdentity)) {
		return [];
	}

	const chain = identity.getDelegation();

	return toNullable({
		public_key: new Uint8Array(chain.publicKey),
		delegations: chain.delegations.map(({ delegation, signature }) => ({
			delegation: {
				pubkey: new Uint8Array(delegation.pubkey),
				expiration: delegation.expiration,
				targets: toNullable(delegation.targets ?? undefined)
			},
			signature: new Uint8Array(signature)
		}))
	});
};
