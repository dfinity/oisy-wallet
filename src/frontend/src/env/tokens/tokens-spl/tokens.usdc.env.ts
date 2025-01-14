import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import usdc from '$eth/assets/usdc.svg';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import type { RequiredSplToken } from '$sol/types/spl';

export const USDC_DECIMALS = 6;

export const USDC_SYMBOL = 'USDC';

export const USDC_TOKEN_ID: TokenId = parseTokenId(USDC_SYMBOL);

export const USDC_TOKEN: RequiredSplToken = {
	id: USDC_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'USD Coin',
	symbol: USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
};

export const DEVNET_USDC_SYMBOL = 'DevnetUSDC';

export const DEVNET_USDC_TOKEN_ID: TokenId = parseTokenId(DEVNET_USDC_SYMBOL);

export const DEVNET_USDC_TOKEN: RequiredSplToken = {
	id: DEVNET_USDC_TOKEN_ID,
	network: SOLANA_DEVNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'USDC (Devnet)',
	symbol: DEVNET_USDC_SYMBOL,
	decimals: USDC_DECIMALS,
	icon: usdc,
	address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
};
