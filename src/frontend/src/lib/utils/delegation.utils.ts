import type { IIDelegationChain } from '$declarations/backend/backend.did';
import { type Nullable, toNullable } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { DelegationIdentity } from '@icp-sdk/core/identity';

/**
 * Extracts the original public II proof from a DelegationIdentity.
 *
 * The backend verifies exactly the first, II-signed link against the caller principal.
 * Child links (native → web → worker) stay in the identity for request authentication;
 * they are not part of this separate II proof. The backend still verifies the II signature.
 * Only the public data is extracted (public keys, expiration, targets, signatures).
 * The private session key is never included.
 *
 * @returns The delegation chain in Candid-compatible optional format (`[] | [IIDelegationChain]`).
 *          Returns `[]` when the identity is not a DelegationIdentity (i.e., not delegated).
 */
export const extractIIDelegationChain = (identity: Identity): Nullable<IIDelegationChain> => {
	if (!(identity instanceof DelegationIdentity)) {
		return [];
	}

	const chain = identity.getDelegation();

	return toNullable({
		public_key: new Uint8Array(chain.publicKey),
		delegations: chain.delegations.slice(0, 1).map(({ delegation, signature }) => ({
			delegation: {
				pubkey: new Uint8Array(delegation.pubkey),
				expiration: delegation.expiration,
				targets: toNullable(delegation.targets ?? undefined)
			},
			signature: new Uint8Array(signature)
		}))
	});
};

/** Refresh rotating mobile app credentials before copying the separate backend proof. */
export const freshIIDelegationChain = async ({
	identity
}: {
	identity: Identity;
}): Promise<Nullable<IIDelegationChain>> => {
	if (!(identity instanceof DelegationIdentity)) {
		return [];
	}
	if (hasCredentialRefresh(identity)) {
		await identity.refresh();
		// The SDK keeps the old credential when a transient mint fails. Never
		// embed that expired proof in a request that may independently refresh.
		const deadline = BigInt(Date.now() + 10_000) * BigInt(1_000_000);
		const chain = identity.getDelegation();
		if (
			chain.delegations.length === 0 ||
			chain.delegations.some(({ delegation }) => delegation.expiration <= deadline)
		) {
			throw new Error('A fresh Internet Identity proof is unavailable');
		}
	}
	return extractIIDelegationChain(identity);
};

const hasCredentialRefresh = (
	identity: DelegationIdentity
): identity is DelegationIdentity & { refresh: () => Promise<void> } =>
	'refresh' in identity && typeof identity.refresh === 'function';
