import { icpAccountIdentifierText, icrcAccountIdentifierText } from '$icp/derived/ic.derived';
import { btcAddressStore } from '$icp/stores/btc.store';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore,
	ethAddressStore,
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore,
	xrpAddressMainnetStore
} from '$lib/stores/address.store';
import type { ReceiveAddressSources } from '$lib/types/receive';
import { derived, type Readable } from 'svelte/store';

export const receiveAddressSources: Readable<ReceiveAddressSources> = derived(
	[
		icrcAccountIdentifierText,
		icpAccountIdentifierText,
		ethAddressStore,
		btcAddressMainnetStore,
		btcAddressTestnetStore,
		btcAddressRegtestStore,
		solAddressMainnetStore,
		solAddressDevnetStore,
		solAddressLocalnetStore,
		xrpAddressMainnetStore,
		btcAddressStore
	],
	([
		icrcAddress,
		icpAccountId,
		evm,
		btcMainnet,
		btcTestnet,
		btcRegtest,
		solMainnet,
		solDevnet,
		solLocal,
		xrpMainnet,
		ckBtcDeposit
	]) => ({
		icrcAddress,
		icpAccountId,
		evm,
		btcMainnet,
		btcTestnet,
		btcRegtest,
		solMainnet,
		solDevnet,
		solLocal,
		xrpMainnet,
		ckBtcDeposit
	})
);
