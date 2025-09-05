import { TokenIdSchema } from '$lib/schema/token.schema';
import type { TokenId } from '$lib/types/token';
import * as z from 'zod/v4';

const TokenIdStringSchema = z.string();

export const parseTokenId = (tokenIdString: z.infer<typeof TokenIdStringSchema>): TokenId => {
	const validString = TokenIdStringSchema.parse(tokenIdString);
	return TokenIdSchema.parse(Symbol(validString));
};
