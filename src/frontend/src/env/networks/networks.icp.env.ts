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

/**
 * ICP Pseudo Testnet Network
 *
 * This is a pseudo testnet network for ICP, used for testing/developing purposes.
 * It will be associated with what we call "testnet" tokens.
 * This allows us to simplify the filters of the token list and avoid polluting "real" ICP balance with the balances of the testnet tokens.
 */
const ICP_PSEUDO_TESTNET_NETWORK_SYMBOL = 'ICP-PSEUDO-TESTNET';

export const ICP_PSEUDO_TESTNET_NETWORK_ID: NetworkId = parseNetworkId(
	ICP_PSEUDO_TESTNET_NETWORK_SYMBOL
);

export const ICP_PSEUDO_TESTNET_NETWORK: Network = {
	id: ICP_PSEUDO_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'IC (testnet tokens)',
	iconLight: icpIconLight,
	iconDark: icpIconDark
};
