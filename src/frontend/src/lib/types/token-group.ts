import { type TokenGroupIdSchema, type TokenGroupPropSchema } from '$lib/schema/token-group.schema';
import type { TokenFinancialData, TokenId, TokenUi } from '$lib/types/token';
import type * as z from 'zod';

export type TokenGroupId = z.infer<typeof TokenGroupIdSchema>;

export type TokenGroup = z.infer<typeof TokenGroupPropSchema>;

//todo: separate typing from token id
type GroupId = TokenId;

export type TokenUiGroup = {
	id: GroupId;
	nativeToken: TokenUi;
	tokens: [TokenUi, ...TokenUi[]];
} & TokenFinancialData;

export type TokenUiOrGroupUi = { token: TokenUi } | { group: TokenUiGroup };
