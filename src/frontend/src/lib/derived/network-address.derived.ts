import type { OptionEthAddress } from '$eth/types/address';
import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
import { ethAddress } from '$lib/derived/address.derived';
import { networkICP } from '$lib/derived/network.derived';
import { derived, type Readable } from 'svelte/store';

export const networkAddress: Readable<OptionEthAddress | string> = derived(
	[ethAddress, icrcAccountIdentifierText, networkICP],
	([$address, $icrcAccountIdentifierStore, $networkICP]) =>
		$networkICP ? $icrcAccountIdentifierStore : $address
);
