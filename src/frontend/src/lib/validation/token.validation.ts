import { TokenIdSchema, type Token, type TokenId } from '$lib/types/token';

export const parseTokenId = (tokenIdString: string): TokenId =>
	TokenIdSchema.parse(Symbol(tokenIdString));

export const safeParseToken = (token: object): Token => TokenSchema.safeParse(token);
