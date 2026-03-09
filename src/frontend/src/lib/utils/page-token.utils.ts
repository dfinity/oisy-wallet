import type { Token } from '$lib/types/token';
import { getTokenIdentifier } from '$lib/utils/tokens.utils';

export const getPageTokenIdentifier = (token: Token): string =>
	getTokenIdentifier(token) ?? token.symbol;
