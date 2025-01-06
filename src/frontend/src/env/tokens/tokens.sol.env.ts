import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_LOCAL_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK
} from '$env/networks/networks.sol.env';
import sol from '$lib/assets/networks/sol.svg';
import type { RequiredToken, TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const SOLANA_DEFAULT_DECIMALS = 9;

const SOLANA_SYMBOL = 'SOL';

export const SOLANA_TOKEN_ID: TokenId = parseTokenId(SOLANA_SYMBOL);

export const SOLANA_TOKEN: RequiredToken = {
	id: SOLANA_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'solana',
	category: 'default',
	name: 'Solana',
	symbol: SOLANA_SYMBOL,
	decimals: SOLANA_DEFAULT_DECIMALS,
	icon: sol,
	buy: {
		onramperId: 'sol'
	}
};

const SOLANA_TESTNET_SYMBOL = 'SOL (Testnet)';

export const SOLANA_TESTNET_TOKEN_ID: TokenId = parseTokenId(SOLANA_TESTNET_SYMBOL);

export const SOLANA_TESTNET_TOKEN: RequiredToken = {
	id: SOLANA_TESTNET_TOKEN_ID,
	network: SOLANA_TESTNET_NETWORK,
	standard: 'solana',
	category: 'default',
	name: 'Solana (Testnet)',
	symbol: SOLANA_TESTNET_SYMBOL,
	decimals: SOLANA_DEFAULT_DECIMALS,
	icon: sol
};

const SOLANA_DEVNET_SYMBOL = 'SOL (Devnet)';

export const SOLANA_DEVNET_TOKEN_ID: TokenId = parseTokenId(SOLANA_DEVNET_SYMBOL);

export const SOLANA_DEVNET_TOKEN: RequiredToken = {
	id: SOLANA_DEVNET_TOKEN_ID,
	network: SOLANA_DEVNET_NETWORK,
	standard: 'solana',
	category: 'default',
	name: 'Solana (Devnet)',
	symbol: SOLANA_DEVNET_SYMBOL,
	decimals: SOLANA_DEFAULT_DECIMALS,
	icon: sol
};

const SOLANA_LOCAL_SYMBOL = 'SOL (Local)';

export const SOLANA_LOCAL_TOKEN_ID: TokenId = parseTokenId(SOLANA_LOCAL_SYMBOL);

export const SOLANA_LOCAL_TOKEN: RequiredToken = {
	id: SOLANA_LOCAL_TOKEN_ID,
	network: SOLANA_LOCAL_NETWORK,
	standard: 'solana',
	category: 'default',
	name: 'Solana (Local)',
	symbol: SOLANA_LOCAL_SYMBOL,
	decimals: SOLANA_DEFAULT_DECIMALS,
	icon: sol
};
