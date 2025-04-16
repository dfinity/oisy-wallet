import {
	SOLANA_DEVNET_SYMBOL,
	SOLANA_LOCAL_SYMBOL,
	SOLANA_SYMBOL,
	SOLANA_TESTNET_SYMBOL
} from '$env/tokens/tokens.sol.env';
import sol from '$sol/assets/sol.svg';

export const SOLANA_TOKEN_GROUP = {
	icon: sol,
	name: 'Solana',
	symbol: SOLANA_SYMBOL
};

export const SOLANA_TESTNET_TOKEN_GROUP = {
	icon: sol,
	name: 'Solana (Testnet)',
	symbol: SOLANA_TESTNET_SYMBOL
};

export const SOLANA_DEVNET_TOKEN_GROUP = {
	icon: sol,
	name: 'Solana (Devnet)',
	symbol: SOLANA_DEVNET_SYMBOL
};

export const SOLANA_LOCAL_TOKEN_GROUP = {
	icon: sol,
	name: 'Solana (Local)',
	symbol: SOLANA_LOCAL_SYMBOL
};
