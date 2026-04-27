import type { CanisterIdText } from '$lib/types/canister';
import { nonNullish, type Canister } from '@dfinity/utils';
import type { PrincipalText } from '@dfinity/zod-schemas';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

/**
 * Generic cache for canister instances keyed by the caller's principal.
 *
 * Each identity gets its own canister instance, so switching identity
 * automatically uses a fresh canister without any explicit reset.
 */
export class CanisterApi<T extends Canister<S>, S extends object = {}> {
	readonly #instances = new Map<PrincipalText, Promise<T>>();

	getCanister = ({
		identity,
		canisterId,
		create
	}: {
		identity: Identity;
		canisterId: CanisterIdText;
		create: (options: { identity: Identity; canisterId: Principal }) => Promise<T>;
	}): Promise<T> => {
		const principal: PrincipalText = identity.getPrincipal().toText();

		const existing = this.#instances.get(principal);

		if (nonNullish(existing)) {
			return existing;
		}

		const promise = create({ identity, canisterId: Principal.fromText(canisterId) });

		this.#instances.set(principal, promise);

		return promise;
	};
}
