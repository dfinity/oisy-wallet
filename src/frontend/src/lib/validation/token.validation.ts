import { TokenIdSchema, type TokenId } from '$lib/types/token';

export const parseTokenId = (tokenIdString: string): TokenId =>
	TokenIdSchema.parse(Symbol(tokenIdString));
