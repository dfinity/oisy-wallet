import { TokenIdSchema, TokenSchema, type Token, type TokenId } from '$lib/types/token';
import { type SafeParseReturnType } from 'zod';

export const parseTokenId = (tokenIdString: string): TokenId =>
	TokenIdSchema.parse(Symbol(tokenIdString));

export const safeParseToken = (token: object): SafeParseReturnType<object, Token> =>
	TokenSchema.safeParse(token);
