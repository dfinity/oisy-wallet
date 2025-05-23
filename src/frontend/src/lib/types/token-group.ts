import type {
	TokenGroupIdSchema,
	TokenGroupPropSchema,
	TokenGroupSchema
} from '$lib/schema/token-group.schema';
import type { TokenFinancialData, TokenUi } from '$lib/types/token';
import type { NonEmptyArray } from '$lib/types/utils';
import type * as z from 'zod';

export type TokenGroupId = z.infer<typeof TokenGroupIdSchema>;

export type TokenGroupData = z.infer<typeof TokenGroupSchema>;

export type TokenGroup = z.infer<typeof TokenGroupPropSchema>;

export type TokenUiGroup = {
	id: TokenGroupId;
	decimals: number;
	// TODO: remove deprecated field when groupData is completely integrated
	nativeToken: TokenUi;
	groupData: TokenGroupData;
	tokens: NonEmptyArray<TokenUi>;
} & TokenFinancialData;

export type TokenUiOrGroupUi = { token: TokenUi } | { group: TokenUiGroup };
