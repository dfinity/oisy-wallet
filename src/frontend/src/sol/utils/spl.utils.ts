import type { Token } from '$lib/types/token';
import type { SolanaUserToken } from '$sol/types/spl-user-token';

export const isSplUserToken = (token: Token): token is SolanaUserToken =>
	token.standard === 'solana' && 'enabled' in token;
