import { getDepositAddress } from '$icp/api/cksol-minter.api';
import type { CanisterIdText } from '$lib/types/canister';
import type { SolAddress } from '$sol/types/address';
import { nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

// The minter derives one address per account and never changes it, while `get_deposit_address` is
// an update call and the SOL → ckSOL quote needs the address on every tick. So it is asked once per
// account and session.
const depositAddresses = new Map<string, Promise<SolAddress>>();

// Test seam: module-level state would otherwise leak between cases.
export const resetCkSolDepositAddresses = (): void => {
	depositAddresses.clear();
};

/**
 * The Solana address the ckSOL minter derives for the default account of `identity`.
 */
export const loadCkSolDepositAddress = ({
	identity,
	minterCanisterId
}: {
	identity: Identity;
	minterCanisterId: CanisterIdText;
}): Promise<SolAddress> => {
	const key = `${identity.getPrincipal().toText()}:${minterCanisterId}`;

	const cached = depositAddresses.get(key);

	if (nonNullish(cached)) {
		return cached;
	}

	const address = getDepositAddress({ identity, minterCanisterId });

	depositAddresses.set(key, address);

	// A failed call is asked again by the next quote, rather than failing every later one.
	address.catch(() => depositAddresses.delete(key));

	return address;
};
