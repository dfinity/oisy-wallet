import { DEVNET_EURC_TOKEN } from '$env/tokens/tokens-spl/tokens.eurc.env';
import { JUPITER_TOKEN } from '$env/tokens/tokens-spl/tokens.jupiter.env';
import { POPCAT_TOKEN } from '$env/tokens/tokens-spl/tokens.popcat.env';
import { DEVNET_USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import type { RequiredSplToken } from '$sol/types/spl';

export const SPL_TOKEN_MAINNET: RequiredSplToken[] = [JUPITER_TOKEN, POPCAT_TOKEN];

export const SPL_TOKENS_DEVNET: RequiredSplToken[] = [DEVNET_USDC_TOKEN, DEVNET_EURC_TOKEN];

export const SPL_TOKENS: RequiredSplToken[] = [...SPL_TOKEN_MAINNET, ...SPL_TOKENS_DEVNET];
