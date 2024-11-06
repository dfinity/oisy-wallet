import { TokenIdSchema, TokenSchema, type Token, type TokenId } from '$lib/types/token';
import type { Token, TokenId } from '$lib/types/token';
import { z, type SafeParseReturnType } from 'zod';
import { TokenIdSchema, TokenSchema } from '$lib/schema/token.schema';

const TokenIdStringSchema = z.string();

export const parseTokenId = (tokenIdString: z.infer<typeof TokenIdStringSchema>): TokenId => {
	const validString = TokenIdStringSchema.parse(tokenIdString);
	return TokenIdSchema.parse(Symbol(validString));
};

export const isToken = (token: unknown): token is Token => {
	const { success } = TokenSchema.safeParse(token);
	return success;
};

export const parseTokenId = (tokenIdString: string): TokenId =>
	TokenIdSchema.parse(Symbol(tokenIdString));

export const safeParseToken = (token: object): SafeParseReturnType<object, Token> =>
	TokenSchema.safeParse(token);

