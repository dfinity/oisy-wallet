import icpIconDark from '$lib/assets/networks/dark/icp.svg';
import icpIconLight from '$lib/assets/networks/light/icp.svg';
import { LOCAL } from '$lib/constants/app.constants';
import type { OptionCanisterIdText } from '$lib/types/canister';
import type { Network, NetworkId } from '$lib/types/network';
import { parseNetworkId } from '$lib/validation/network.validation';

export const ICP_LEDGER_CANISTER_ID =
	(LOCAL
		? (import.meta.env.VITE_LOCAL_ICP_LEDGER_CANISTER_ID as OptionCanisterIdText)
		: (import.meta.env.VITE_IC_ICP_LEDGER_CANISTER_ID as OptionCanisterIdText)) ??
	'ryjl3-tyaaa-aaaaa-aaaba-cai';

export const ICP_INDEX_CANISTER_ID =
	(LOCAL
		? (import.meta.env.VITE_LOCAL_ICP_INDEX_CANISTER_ID as OptionCanisterIdText)
		: (import.meta.env.VITE_IC_ICP_INDEX_CANISTER_ID as OptionCanisterIdText)) ??
	'qhbym-qaaaa-aaaaa-aaafq-cai';

/**
 * ICP
 */
export const ICP_NETWORK_SYMBOL = 'ICP';

export const ICP_NETWORK_ID: NetworkId = parseNetworkId(ICP_NETWORK_SYMBOL);

export const ICP_NETWORK: Network = {
	id: ICP_NETWORK_ID,
	env: 'mainnet',
	name: 'Internet Computer',
	iconLight: icpIconLight,
	iconDark: icpIconDark,
	buy: { onramperId: 'icp' }
};
