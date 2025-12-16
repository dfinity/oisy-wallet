import { TRUMP_SYMBOL } from '$env/tokens/tokens-spl/tokens.trump.env';
import type { Token } from '$lib/types/token';
import { isTokenSpl } from '$sol/utils/spl.utils';

export const isTokenSolanaNative = (token: Token): boolean => token.standard === 'solana';

export const isSolanaToken = (token: Token): boolean =>
	isTokenSolanaNative(token) || isTokenSpl(token);

export const isTrumpToken = (token: Token): boolean =>
	isSolanaToken(token) && token.symbol === TRUMP_SYMBOL;
