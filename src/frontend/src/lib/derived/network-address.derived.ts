import type { BtcAddress } from '$btc/types/address';
import type { OptionEthAddress } from '$eth/types/address';
import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
import { ethAddress } from '$lib/derived/address.derived';
import { networkICP, networkId } from '$lib/derived/network.derived';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore,
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore,
	type AddressStoreData
} from '$lib/stores/address.store';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet,
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLMainnet
} from '$lib/utils/network.utils';
import type { SolAddress } from '$sol/types/address';
import { derived, type Readable } from 'svelte/store';

export const networkAddressStore: Readable<AddressStoreData<BtcAddress | SolAddress>> = derived(
	[
		networkId,
		btcAddressMainnetStore,
		btcAddressTestnetStore,
		btcAddressRegtestStore,
		solAddressMainnetStore,
		solAddressDevnetStore,
		solAddressLocalnetStore
	],
	([
		$networkId,
		$btcAddressMainnetStore,
		$btcAddressTestnetStore,
		$btcAddressRegtestStore,
		$solAddressMainnetStore,
		$solAddressDevnetStore,
		$solAddressLocalnetStore
	]) =>
		isNetworkIdBTCMainnet($networkId)
			? $btcAddressMainnetStore
			: isNetworkIdBTCTestnet($networkId)
				? $btcAddressTestnetStore
				: isNetworkIdBTCRegtest($networkId)
					? $btcAddressRegtestStore
					: isNetworkIdSOLMainnet($networkId)
						? $solAddressMainnetStore
						: isNetworkIdSOLDevnet($networkId)
							? $solAddressDevnetStore
							: isNetworkIdSOLLocal($networkId)
								? $solAddressLocalnetStore
								: undefined
);

export const networkAddress: Readable<OptionEthAddress | string> = derived(
	[ethAddress, icrcAccountIdentifierText, networkICP],
	([$address, $icrcAccountIdentifierStore, $networkICP]) =>
		$networkICP ? $icrcAccountIdentifierStore : $address
);
