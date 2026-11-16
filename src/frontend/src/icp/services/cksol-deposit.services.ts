import { getDepositAddress, minterInfo } from '$icp/api/cksol-minter.api';
import { ckSolDepositAddressesStore, ckSolMinterAddressStore } from '$icp/stores/cksol.store';
import type { CanisterIdText } from '$lib/types/canister';
import { consoleError } from '$lib/utils/console.utils';
import type { SolAddress } from '$sol/types/address';
import { fromNullable, nonNullish } from '@dfinity/utils';
import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';

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

/**
 * Loads the two Solana addresses the ckSOL conversions of `identity` pass through, so Activity can
 * name their Solana legs: the minter's main address, which pays out every conversion to SOL, and
 * the deposit address of `identity`, which takes in every conversion from SOL.
 *
 * They only label rows, so the minter's info is read without certification, and an address that
 * fails to load leaves its rows plain sends and receives.
 */
export const loadCkSolConversionAddresses = async ({
	identity,
	minterCanisterId
}: {
	identity: Identity;
	minterCanisterId: CanisterIdText;
}): Promise<void> => {
	const principal = identity.getPrincipal().toText();

	const [info, depositAddress] = await Promise.allSettled([
		minterInfo({ identity: new AnonymousIdentity(), minterCanisterId, certified: false }),
		loadCkSolDepositAddress({ identity, minterCanisterId })
	]);

	if (info.status === 'fulfilled') {
		ckSolMinterAddressStore.set(fromNullable(info.value.minter_address));
	} else {
		consoleError('Failed to load the ckSOL minter address', info.reason);
	}

	if (depositAddress.status === 'fulfilled') {
		ckSolDepositAddressesStore.update((addresses) => ({
			...addresses,
			[principal]: depositAddress.value
		}));
	} else {
		consoleError('Failed to load the ckSOL deposit address', depositAddress.reason);
	}
};
