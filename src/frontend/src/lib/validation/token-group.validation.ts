import { TokenGroupIdSchema } from '$lib/schema/token-group.schema';
import type { TokenGroupId } from '$lib/types/token-group';
import * as z from 'zod/v4';

const TokenGroupIdStringSchema = z.string();

export const parseTokenGroupId = (
	tokenGroupIdString: z.infer<typeof TokenGroupIdStringSchema>
): TokenGroupId => {
	const validString = TokenGroupIdStringSchema.parse(tokenGroupIdString);
	return TokenGroupIdSchema.parse(Symbol(validString));
};
