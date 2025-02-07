import { TRUMP_SYMBOL } from '$env/tokens/tokens-spl/tokens.trump.env';
import type { Token } from '$lib/types/token';

export const isSolanaToken = (token: Token): boolean =>
	token.standard === 'solana' || token.standard === 'spl';

export const isTrumpToken = (token: Token): boolean =>
	isSolanaToken(token) && token.symbol === TRUMP_SYMBOL;
