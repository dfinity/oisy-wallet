import {
	type TokenGroupIdSchema,
	type TokenGroupPropSchema,
	type TokenGroupSchema
} from '$lib/schema/token-group.schema';
import type { TokenFinancialData, TokenUi } from '$lib/types/token';
import type * as z from 'zod';

export type TokenGroupId = z.infer<typeof TokenGroupIdSchema>;

export type TokenGroupData = z.infer<typeof TokenGroupSchema>;

export type TokenGroup = z.infer<typeof TokenGroupPropSchema>;

export type TokenUiGroup = {
	id: TokenGroupId;
	// TODO: remove deprecated field when groupData is completely integrated
	nativeToken: TokenUi;
	groupData: TokenGroupData;
	tokens: [TokenUi, ...TokenUi[]];
} & TokenFinancialData;

export type TokenUiOrGroupUi = { token: TokenUi } | { group: TokenUiGroup };
