import { SOLANA_NETWORK_ENABLED } from '$env/networks/networks.sol.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { DEVNET_EURC_TOKEN, EURC_TOKEN } from '$env/tokens/tokens-spl/tokens.eurc.env';
import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { ORCA_TOKEN } from '$env/tokens/tokens-spl/tokens.orca.env';
import { POPCAT_TOKEN } from '$env/tokens/tokens-spl/tokens.popcat.env';
import { RAY_TOKEN } from '$env/tokens/tokens-spl/tokens.ray.env';
import { DEVNET_USDC_TOKEN, USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { USDT_TOKEN } from '$env/tokens/tokens-spl/tokens.usdt.env';
import type { RequiredSplToken } from '$sol/types/spl';

const SPL_TOKENS_MAINNET: RequiredSplToken[] = [
	BONK_TOKEN,
	EURC_TOKEN,
	JUP_TOKEN,
	ORCA_TOKEN,
	POPCAT_TOKEN,
	RAY_TOKEN,
	USDC_TOKEN,
	USDT_TOKEN
];

const SPL_TOKENS_DEVNET: RequiredSplToken[] = [DEVNET_USDC_TOKEN, DEVNET_EURC_TOKEN];

export const SPL_TOKENS: RequiredSplToken[] = SOLANA_NETWORK_ENABLED
	? [...SPL_TOKENS_MAINNET, ...SPL_TOKENS_DEVNET]
	: [];
