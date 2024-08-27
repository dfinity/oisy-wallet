import type { Token } from '$lib/types/token';

export const parseTokenKey = (token: Token): string =>
	`${token.id.description}-${token.network.id.description}`;
