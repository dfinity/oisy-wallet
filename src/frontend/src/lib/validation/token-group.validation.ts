import { TokenGroupIdSchema } from '$lib/schema/token-group.schema';
import type { TokenGroupId } from '$lib/types/token-group';
import * as z from 'zod';

const TokenGroupIdStringSchema = z.string();

export const parseTokenGroupId = (
	tokenIdString: z.infer<typeof TokenGroupIdStringSchema>
): TokenGroupId => {
	const validString = TokenGroupIdStringSchema.parse(tokenIdString);
	return TokenGroupIdSchema.parse(Symbol(validString));
};
