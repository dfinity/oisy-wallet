import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import type { Token } from '$lib/types/token';

export const $tokens: Token[] = [ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];
