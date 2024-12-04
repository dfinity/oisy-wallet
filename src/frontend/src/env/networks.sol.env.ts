import solDevnetIconBW from '$lib/assets/networks/sol-devnet-bw.svg';
import solMainnetIconBW from '$lib/assets/networks/sol-mainnet-bw.svg';
import solTestnetIconBW from '$lib/assets/networks/sol-testnet-bw.svg';
import sol from '$lib/assets/networks/sol.svg';
import type { NetworkId } from '$lib/types/network';
import { parseNetworkId } from '$lib/validation/network.validation';
import type { SolNetwork } from '$sol/types/network';

/**
 * SOL
 */

export const SOLANA_NETWORK_SYMBOL = 'SOL';

export const SOLANA_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_NETWORK_SYMBOL);

export const SOLANA_MAINNET_NETWORK: SolNetwork = {
	id: SOLANA_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Solana Mainnet Beta',
	// TODO: Add the correct icons
	icon: sol,
	iconBW: solMainnetIconBW,
	rpcUrl: 'https://api.mainnet-beta.solana.com'
};

export const SOLANA_TESTNET_NETWORK_SYMBOL = 'SOL (Testnet)';

export const SOLANA_TESTNET_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_TESTNET_NETWORK_SYMBOL);

export const SOLANA_TESTNET_NETWORK: SolNetwork = {
	id: SOLANA_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'Solana Testnet',
	// TODO: Add the correct icons
	icon: sol,
	iconBW: solTestnetIconBW,
	rpcUrl: 'https://api.testnet.solana.com'
};

export const SOLANA_DEVNET_NETWORK_SYMBOL = 'SOL (Devnet)';

export const SOLANA_DEVNET_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_DEVNET_NETWORK_SYMBOL);

export const SOLANA_DEVNET_NETWORK: SolNetwork = {
	id: SOLANA_DEVNET_NETWORK_ID,
	env: 'testnet',
	name: 'Solana Devnet',
	// TODO: Add the correct icons
	icon: sol,
	iconBW: solDevnetIconBW,
	rpcUrl: 'https://api.devnet.solana.com'
};

export const SOLANA_LOCAL_NETWORK_SYMBOL = 'SOL (Local)';

export const SOLANA_LOCAL_NETWORK_ID: NetworkId = parseNetworkId(SOLANA_LOCAL_NETWORK_SYMBOL);

export const SOLANA_LOCAL_NETWORK: SolNetwork = {
	id: SOLANA_LOCAL_NETWORK_ID,
	env: 'testnet',
	name: 'Solana Local',
	// TODO: Add the correct icons
	icon: sol,
	iconBW: solDevnetIconBW,
	rpcUrl: 'http://localhost:8899'
};
