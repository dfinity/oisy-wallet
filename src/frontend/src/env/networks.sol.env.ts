import solDevnetIconBW from '$lib/assets/networks/sol-devnet-bw.svg';
import solMainnetIconBW from '$lib/assets/networks/sol-mainnet-bw.svg';
import solTestnetIconBW from '$lib/assets/networks/sol-testnet-bw.svg';
import sol from '$lib/assets/networks/sol.svg';
import type { Network, NetworkId } from '$lib/types/network';
import { parseNetworkId } from '$lib/validation/network.validation';

/**
 * SOL
 */

export const SOLANA_NETWORK_SYMBOL = 'SOL';

export const SOLANA_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_NETWORK_SYMBOL);

export const SOLANA_MAINNET_NETWORK: Network = {
	id: SOLANA_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Solana Mainnet Beta',
	// TODO: Add the correct icon
	icon: sol,
	iconBW: solMainnetIconBW
};

export const SOLANA_TESTNET_NETWORK_SYMBOL = 'SOL (Testnet)';

export const SOLANA_TESTNET_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_TESTNET_NETWORK_SYMBOL);

export const SOLANA_TESTNET_NETWORK: Network = {
	id: SOLANA_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'Solana Testnet',
	// TODO: Add the correct icon
	icon: sol,
	iconBW: solTestnetIconBW
};

export const SOLANA_DEVNET_NETWORK_SYMBOL = 'SOL (Devnet)';

export const SOLANA_DEVNET_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_DEVNET_NETWORK_SYMBOL);

export const SOLANA_DEVNET_NETWORK: Network = {
	id: SOLANA_DEVNET_NETWORK_ID,
	env: 'testnet',
	name: 'Solana Devnet',
	// TODO: Add the correct icon
	icon: sol,
	iconBW: solDevnetIconBW
};

export const SOLANA_LOCAL_NETWORK_SYMBOL = 'SOL (Local)';

export const SOLANA_LOCAL_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_LOCAL_NETWORK_SYMBOL);

export const SOLANA_LOCAL_NETWORK: Network = {
	id: SOLANA_LOCAL_NETWORK_ID,
	env: 'testnet',
	name: 'Solana Local',
	// TODO: Add the correct icon
	icon: sol,
	// TODO: Add the correct icon
	iconBW: solTestnetIconBW
};
