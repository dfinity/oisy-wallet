import { ckSolDepositAddressesStore, ckSolMinterAddressStore } from '$icp/stores/cksol.store';
import { authIdentity } from '$lib/derived/auth.derived';
import type { SolAddress } from '$sol/types/address';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The Solana addresses the signed-in user's ckSOL conversions pass through, once loaded: the
 * minter's main address and the user's own deposit address.
 */
export const ckSolConversionAddresses: Readable<{
	minterAddress?: SolAddress;
	depositAddress?: SolAddress;
}> = derived(
	[ckSolMinterAddressStore, ckSolDepositAddressesStore, authIdentity],
	([$ckSolMinterAddressStore, $ckSolDepositAddressesStore, $authIdentity]) => ({
		minterAddress: $ckSolMinterAddressStore,
		depositAddress: isNullish($authIdentity)
			? undefined
			: $ckSolDepositAddressesStore[$authIdentity.getPrincipal().toText()]
	})
);
