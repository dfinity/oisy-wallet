import { SOLANA_NETWORK_ENABLED } from '$env/networks/networks.sol.env';
import { DEVNET_EURC_TOKEN } from '$env/tokens/tokens-spl/tokens.eurc.env';
import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { ORCA_TOKEN } from '$env/tokens/tokens-spl/tokens.orca.env';
import { POPCAT_TOKEN } from '$env/tokens/tokens-spl/tokens.popcat.env';
import { DEVNET_USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import type { RequiredSplToken } from '$sol/types/spl';

const SPL_TOKENS_MAINNET: RequiredSplToken[] = [JUP_TOKEN, ORCA_TOKEN, POPCAT_TOKEN];

const SPL_TOKENS_DEVNET: RequiredSplToken[] = [DEVNET_USDC_TOKEN, DEVNET_EURC_TOKEN];

export const SPL_TOKENS: RequiredSplToken[] = SOLANA_NETWORK_ENABLED
	? [...SPL_TOKENS_MAINNET, ...SPL_TOKENS_DEVNET]
	: [];
