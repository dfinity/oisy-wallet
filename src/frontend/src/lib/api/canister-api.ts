import { nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

/**
 * Generic cache for canister instances keyed by the caller's principal.
 *
 * Each identity gets its own canister instance, so switching identity
 * automatically uses a fresh canister without any explicit reset.
 */
export class CanisterApi<T> {
	readonly #instances = new Map<string, T>();

	async getCanister({
		identity,
		create
	}: {
		identity: Identity;
		create: () => Promise<T>;
	}): Promise<T> {
		const principal = identity.getPrincipal().toText();

		const existing = this.#instances.get(principal);

		if (nonNullish(existing)) {
			return existing;
		}

		const instance = await create();

		this.#instances.set(principal, instance);

		return instance;
	}
}
